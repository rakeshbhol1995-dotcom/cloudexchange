
pub use goldchain_types::{Block, BlockHeader};
use crate::error::CoreError;
use crate::economics::EconomicsModule;
use crate::mempool::Mempool;
use crate::transaction::TxType;

pub trait BlockValidation {
    fn validate_linkage(&self, prev_block: &Block) -> Result<(), CoreError>;
}

impl BlockValidation for Block {
    /// Validates linkage with the previous block
    fn validate_linkage(&self, prev_block: &Block) -> Result<(), CoreError> {
        if self.header.height != prev_block.header.height + 1 {
            return Err(CoreError::InvalidBlock(format!(
                "Invalid height linkage: expected {}, got {}",
                prev_block.header.height + 1,
                self.header.height
            )));
        }

        if self.header.prev_hash != prev_block.hash() {
            return Err(CoreError::InvalidBlock("Invalid prev_hash field".to_string()));
        }

        if self.header.timestamp < prev_block.header.timestamp {
            return Err(CoreError::InvalidBlock("Block timestamp is in the past".to_string()));
        }

        Ok(())
    }
}

pub struct ChainState {
    pub circulating_supply: u64,
    pub staked_supply: u64,
    pub treasury_supply: u64,
    pub locked_supply: u64,
    pub total_supply: u64,
    pub bridge_tvl: u64,
    pub vm: crate::vm::WasmVirtualMachine,
}

impl ChainState {
    /// Executes block state transition, dynamically checking invariants (supply & CESR ratio)
    /// and automatically updating mempool (evicting expired transactions).
    pub fn execute_block_state_transition(
        &mut self,
        block: &Block,
        economics: &EconomicsModule,
        mempool: &mut Mempool,
    ) -> Result<(), CoreError> {
        // 1. Process transactions and update balances
        for tx in &block.transactions {
            // The sender pays the fee (deducted from circulating supply)
            self.circulating_supply = self.circulating_supply.saturating_sub(tx.fee);

            // Process block fees EIP-1559 style split
            let (burned, validator_reward) = economics.process_fee(tx.fee);
            
            // Apply fee burn: permanently reduce total supply
            self.total_supply = self.total_supply.saturating_sub(burned);

            // Add validator reward back to circulating supply (paid to validator)
            self.circulating_supply = self.circulating_supply.saturating_add(validator_reward);

            // Process contract transactions inside the VM
            match tx.tx_type {
                TxType::ContractDeploy => {
                    // Instantiates the contract inside the WASM Sandbox
                    self.vm.deploy_contract(tx.to.clone(), &tx.data, tx.fee.saturating_mul(1000))?;
                }
                TxType::ContractCall => {
                    // Determines method and arguments
                    let method = if tx.data.starts_with(b"store:") {
                        "store"
                    } else if tx.data.starts_with(b"load:") {
                        "load"
                    } else if tx.data.starts_with(b"recursive_overflow:") {
                        "recursive_overflow"
                    } else {
                        "unknown"
                    };

                    let args = if tx.data.len() > method.len() + 1 {
                        &tx.data[method.len() + 1..]
                    } else {
                        &[]
                    };

                    self.vm.call_contract(tx.to.clone(), method, args, tx.fee.saturating_mul(1000))?;
                }
                _ => {}
            }
        }

        // Add block reward to circulating and total supply
        let block_reward = economics.calculate_block_reward(block.header.height);
        self.circulating_supply = self.circulating_supply.saturating_add(block_reward);
        self.total_supply = self.total_supply.saturating_add(block_reward);

        // 2. Automatically enforce supply invariant (circulating + staked + treasury + locked == total)
        economics.verify_supply_invariant(
            self.circulating_supply,
            self.staked_supply,
            self.treasury_supply,
            self.locked_supply,
            self.total_supply,
        ).map_err(|e| CoreError::StateError(format!("CRITICAL HALT: Supply invariant failed at height {}: {}", block.header.height, e)))?;

        // 3. Automatically enforce CESR ratio check to protect bridge TVL on-chain
        economics.verify_economic_security_ratio(self.staked_supply, self.bridge_tvl)
            .map_err(|e| CoreError::StateError(format!("CRITICAL HALT: CESR check failed: {}", e)))?;

        // 4. Automatically trigger mempool cleanups and transaction evictions for the new block height
        mempool.evict_expired(block.header.height);

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::economics::EconomicsConfig;
    use goldchain_types::Transaction;
    use goldchain_crypto::keys::PrivateKey;
    use goldchain_crypto::address::Address;

    #[test]
    fn test_execute_block_state_transition_invariants() {
        let economics = EconomicsModule::new(EconomicsConfig::default());
        let mut mempool = Mempool::new(10);

        let mut state = ChainState {
            circulating_supply: 5_000_000_000,
            staked_supply: 3_000_000_000,
            treasury_supply: 1_000_000_000,
            locked_supply: 1_000_000_000,
            total_supply: 10_000_000_000,
            bridge_tvl: 500_000_000, // CESR ratio = 3000M / 500M = 6.0 (>= 3.0 OK)
            vm: crate::vm::WasmVirtualMachine::new(),
        };

        // Create standard transfer transaction
        let priv_key = PrivateKey::generate();
        let from_addr = Address::from_public_key(&priv_key.public_key());
        let to_addr = Address::from_public_key(&PrivateKey::generate().public_key());
        let mut tx = Transaction::new(from_addr, to_addr, 1000, 1, 10, TxType::Transfer, Vec::new());
        tx.sign(&priv_key);

        mempool.add_tx(tx.clone()).unwrap();
        assert_eq!(mempool.len(), 1);

        // Commit block with height 1
        let dummy_block = Block::new(
            1,
            1000000000,
            goldchain_crypto::hash::Hash([0u8; 32]),
            goldchain_crypto::hash::Hash::digest(b"initial_state"),
            Address::from_public_key(&PrivateKey::generate().public_key()),
            vec![tx],
        );

        // State transition should pass successfully and evict expired tx (simulated age limit)
        state.execute_block_state_transition(&dummy_block, &economics, &mut mempool).unwrap();

        // Evict expired should not trigger at height 1 (expiry is 100 blocks, nonce is 1)
        assert_eq!(mempool.len(), 1);

        // If we jump height to 105, evict_expired should drop it!
        let dummy_block_expired = Block::new(
            105,
            1000001000,
            dummy_block.hash(),
            goldchain_crypto::hash::Hash::digest(b"next_state"),
            Address::from_public_key(&PrivateKey::generate().public_key()),
            Vec::new(),
        );

        state.execute_block_state_transition(&dummy_block_expired, &economics, &mut mempool).unwrap();
        assert_eq!(mempool.len(), 0); // Reaped successfully!
    }

    #[test]
    fn test_execute_block_contract_flow() {
        let economics = EconomicsModule::new(EconomicsConfig::default());
        let mut mempool = Mempool::new(10);
        let mut state = ChainState {
            circulating_supply: 5_000_000_000,
            staked_supply: 3_000_000_000,
            treasury_supply: 1_000_000_000,
            locked_supply: 1_000_000_000,
            total_supply: 10_000_000_000,
            bridge_tvl: 500_000_000,
            vm: crate::vm::WasmVirtualMachine::new(),
        };

        // 1. Deploy Contract Transaction
        let priv_key = PrivateKey::generate();
        let from_addr = Address::from_public_key(&priv_key.public_key());
        let contract_addr = Address::from_public_key(&PrivateKey::generate().public_key());
        let valid_wasm_with_storage = vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0xFA]; // 0xFA enables storage
        
        let mut deploy_tx = Transaction::new(
            from_addr.clone(),
            contract_addr.clone(),
            0,
            1,
            100, // fee = 100 -> gas limit = 100,000
            TxType::ContractDeploy,
            valid_wasm_with_storage,
        );
        deploy_tx.sign(&priv_key);

        let block1 = Block::new(
            1,
            1000000000,
            goldchain_crypto::hash::Hash([0u8; 32]),
            goldchain_crypto::hash::Hash::digest(b"deploy_state"),
            Address::from_public_key(&PrivateKey::generate().public_key()),
            vec![deploy_tx],
        );

        state.execute_block_state_transition(&block1, &economics, &mut mempool).unwrap();

        // Check contract deployed & permissions initialized
        let perms = state.vm.permissions.get(&contract_addr).unwrap();
        assert!(perms.contains(&"storage".to_string()));

        // 2. Call Contract Transaction
        let store_call_data = b"store:\x2A\x64".to_vec(); // store key 42 (0x2A), value 100 (0x64)
        let mut call_tx = Transaction::new(
            from_addr,
            contract_addr.clone(),
            0,
            2,
            50,
            TxType::ContractCall,
            store_call_data,
        );
        call_tx.sign(&priv_key);

        let block2 = Block::new(
            2,
            1000005000,
            block1.hash(),
            goldchain_crypto::hash::Hash::digest(b"call_state"),
            Address::from_public_key(&PrivateKey::generate().public_key()),
            vec![call_tx],
        );

        state.execute_block_state_transition(&block2, &economics, &mut mempool).unwrap();

        // Check storage state directly inside VM
        let storage = state.vm.storage.get(&contract_addr).unwrap();
        assert_eq!(storage.get(&vec![42]), Some(&vec![100]));
    }
}

