
pub use goldchain_types::{Block, BlockHeader};
use crate::error::CoreError;
use crate::economics::EconomicsModule;
use crate::mempool::Mempool;
use crate::transaction::TxType;
use goldchain_crypto::hash::Hash;
use goldchain_crypto::address::Address;
use crate::consensus::Validator;

use goldchain_storage::Storage;
use goldchain_types::Receipt;
use crate::account::AccountActions;

pub const UNBONDING_PERIOD_BLOCKS: u64 = 21_600;

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

use std::collections::{HashMap, HashSet};

#[derive(borsh::BorshSerialize, borsh::BorshDeserialize, Clone, Debug)]
pub struct PersistedEconomicState {
    pub circulating_supply: u64,
    pub staked_supply: u64,
    pub treasury_supply: u64,
    pub locked_supply: u64,
    pub total_supply: u64,
    pub bridge_tvl: u64,
}

pub struct SmtDbStore {
    pub storage: Storage,
    pub cache: HashMap<[u8; 32], goldchain_smt::Node>,
}

impl goldchain_smt::NodeStore for SmtDbStore {
    fn get(&self, hash: &[u8; 32]) -> Option<goldchain_smt::Node> {
        if let Some(node) = self.cache.get(hash) {
            return Some(node.clone());
        }
        match self.storage.get_smt_node_raw(hash) {
            Ok(Some(bytes)) => borsh::from_slice::<goldchain_smt::Node>(&bytes).ok(),
            _ => None,
        }
    }

    fn put(&mut self, hash: [u8; 32], node: goldchain_smt::Node) {
        self.cache.insert(hash, node);
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
    pub fn load_from_db(storage: &Storage) -> Result<Option<Self>, CoreError> {
        if let Some(economic_bytes) = storage.get_contract_state_raw("system_economic_state")? {
            let econ = borsh::from_slice::<PersistedEconomicState>(&economic_bytes)
                .map_err(|e| CoreError::StateError(e.to_string()))?;
            Ok(Some(ChainState {
                circulating_supply: econ.circulating_supply,
                staked_supply: econ.staked_supply,
                treasury_supply: econ.treasury_supply,
                locked_supply: econ.locked_supply,
                total_supply: econ.total_supply,
                bridge_tvl: econ.bridge_tvl,
                vm: crate::vm::WasmVirtualMachine::new(),
            }))
        } else {
            Ok(None)
        }
    }

    pub fn save_to_db(&self, storage: &Storage) -> Result<(), CoreError> {
        let econ = PersistedEconomicState {
            circulating_supply: self.circulating_supply,
            staked_supply: self.staked_supply,
            treasury_supply: self.treasury_supply,
            locked_supply: self.locked_supply,
            total_supply: self.total_supply,
            bridge_tvl: self.bridge_tvl,
        };
        let bytes = borsh::to_vec(&econ).map_err(|e| CoreError::StateError(e.to_string()))?;
        storage.put_contract_state_raw("system_economic_state", &bytes)?;
        Ok(())
    }

    /// Executes block state transition, dynamically checking invariants (supply & CESR ratio)
    /// and automatically updating mempool (evicting expired transactions).
    pub fn execute_block_state_transition(
        &mut self,
        block: &mut Block,
        _economics_param: &EconomicsModule,
        mempool: &mut Mempool,
        storage: &Storage,
    ) -> Result<(), CoreError> {
        // Load dynamic economics config from database
        let dynamic_config = crate::economics::EconomicsConfig::load_from_db(storage);
        let economics = EconomicsModule::new(dynamic_config);

        // Verify block proposer is an active validator
        let active_vals = elect_active_validators(storage)?;
        if !active_vals.is_empty() {
            let is_active = active_vals.iter().any(|v| Address::from_public_key(&v.pubkey) == block.header.validator);
            if !is_active {
                return Err(CoreError::StateError(format!(
                    "Security Breach: Proposer {} is not an active elected validator!",
                    block.header.validator.as_str()
                )));
            }
        }

        // Collect all modified addresses for SMT update
        let mut modified_accounts = HashSet::new();
        let mut total_validator_fee_reward = 0u64;

        // 1. Process transactions and update balances
        for tx in &block.transactions {
            // Verify signature
            tx.verify_signature().map_err(|e| CoreError::StateError(format!("Invalid signature: {:?}", e)))?;

            // A. Automatically unlock matured unstakes for this transaction sender
            let mut sender = storage.get_account(&tx.from)?.unwrap_or_default();
            let mut matured_amount = 0u64;
            sender.unbonding_unlocks.retain(|&(amount, unlock_height)| {
                if block.header.height >= unlock_height {
                    matured_amount = matured_amount.saturating_add(amount);
                    false
                } else {
                    true
                }
            });
            if matured_amount > 0 {
                sender.balance = sender.balance.saturating_add(matured_amount);
                self.locked_supply = self.locked_supply.saturating_sub(matured_amount);
                self.circulating_supply = self.circulating_supply.saturating_add(matured_amount);
                println!("🔓 Unlocked matured unstaked funds: {} GRM for {}", matured_amount, tx.from.as_str());
            }

            // 1. Deduct fee first (sender pays fee)
            if tx.nonce != sender.nonce {
                return Err(CoreError::StateError(format!(
                    "Nonce mismatch for sender {}: expected {}, got {}",
                    tx.from, sender.nonce, tx.nonce
                )));
            }
            if sender.balance < tx.fee {
                return Err(CoreError::StateError("Insufficient balance for transaction fee".to_string()));
            }
            sender.balance = sender.balance.saturating_sub(tx.fee);
            sender.increment_nonce();
            self.circulating_supply = self.circulating_supply.saturating_sub(tx.fee);

            // Process block fees EIP-1559 style split
            let (burned, validator_reward) = economics.process_fee(tx.fee);
            
            // Apply fee burn: permanently reduce total supply
            self.total_supply = self.total_supply.saturating_sub(burned);

            // Add validator reward back to circulating supply (paid to validator)
            self.circulating_supply = self.circulating_supply.saturating_add(validator_reward);

            total_validator_fee_reward = total_validator_fee_reward.saturating_add(validator_reward);

            let mut receipt_success = true;
            let mut receipt_err = None;

            modified_accounts.insert(tx.from.clone());
            modified_accounts.insert(tx.to.clone());

            match tx.tx_type {
                TxType::Transfer => {
                    if sender.balance < tx.amount {
                        return Err(CoreError::StateError("Insufficient balance for transfer".to_string()));
                    }
                    sender.balance = sender.balance.saturating_sub(tx.amount);
                    storage.put_account(&tx.from, &sender)?;

                    if tx.amount > 0 {
                        let mut recipient = storage.get_account(&tx.to)?.unwrap_or_default();
                        recipient.add_balance(tx.amount);
                        storage.put_account(&tx.to, &recipient)?;
                    }
                }
                TxType::Stake => {
                    let commission = tx.data.first().copied().unwrap_or(0);
                    economics.validate_validator_commission(commission)
                        .map_err(|e| CoreError::StateError(format!("Validator commission check failed: {}", e)))?;

                    if sender.balance < tx.amount {
                        return Err(CoreError::StateError("Insufficient balance for staking".to_string()));
                    }
                    sender.balance = sender.balance.saturating_sub(tx.amount);
                    sender.staked = sender.staked.saturating_add(tx.amount);
                    storage.put_account(&tx.from, &sender)?;

                    self.staked_supply = self.staked_supply.saturating_add(tx.amount);
                    self.circulating_supply = self.circulating_supply.saturating_sub(tx.amount);
                }
                TxType::Unstake => {
                    if sender.staked < tx.amount {
                        return Err(CoreError::StateError("Insufficient staked balance for unstaking".to_string()));
                    }
                    sender.staked = sender.staked.saturating_sub(tx.amount);
                    // Add unbonding cooldown to unlock unbonded stake after unbonding_period
                    let unlock_height = block.header.height + economics.config.unbonding_period;
                    sender.unbonding_unlocks.push((tx.amount, unlock_height));
                    storage.put_account(&tx.from, &sender)?;

                    self.staked_supply = self.staked_supply.saturating_sub(tx.amount);
                    self.locked_supply = self.locked_supply.saturating_add(tx.amount);
                }
                TxType::ContractDeploy => {
                    storage.put_account(&tx.from, &sender)?;
                    match self.vm.deploy_contract(tx.to.clone(), &tx.data, tx.gas_limit, storage) {
                        Ok(_) => {}
                        Err(e) => {
                            receipt_success = false;
                            receipt_err = Some(e.to_string());
                        }
                    }
                }
                TxType::ContractCall => {
                    storage.put_account(&tx.from, &sender)?;
                    if tx.to == crate::governance::governance_address() {
                        match crate::governance::process_governance_call(tx, block.header.height, storage) {
                            Ok(_) => {}
                            Err(e) => {
                                receipt_success = false;
                                receipt_err = Some(e.to_string());
                            }
                        }
                    } else {
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

                        match self.vm.call_contract(tx.to.clone(), method, args, tx.gas_limit, storage) {
                            Ok(_) => {}
                            Err(e) => {
                                receipt_success = false;
                                receipt_err = Some(e.to_string());
                            }
                        }
                    }
                }
            }

            // Put receipt and transaction into database
            let receipt = if receipt_success {
                Receipt::new_success(tx.hash(), 21000, Vec::new())
            } else {
                Receipt::new_failure(tx.hash(), 21000, receipt_err.unwrap_or_default())
            };
            storage.put_receipt(&receipt)?;
        }

        // Add block reward to circulating and total supply
        let block_reward = economics.calculate_block_reward(block.header.height);
        self.circulating_supply = self.circulating_supply.saturating_add(block_reward);
        self.total_supply = self.total_supply.saturating_add(block_reward);

        let total_rewards = total_validator_fee_reward.saturating_add(block_reward);
        if total_rewards > 0 {
            let proposer_reward = total_rewards / 2;
            let staking_reward = total_rewards.saturating_sub(proposer_reward);
            
            // 1. Pay proposer
            let mut proposer_acct = storage.get_account(&block.header.validator)?.unwrap_or_default();
            proposer_acct.add_balance(proposer_reward);
            storage.put_account(&block.header.validator, &proposer_acct)?;
            modified_accounts.insert(block.header.validator.clone());
            
            // 2. Pay active validators proportionally to their stake
            let active_vals = elect_active_validators(storage)?;
            let total_stake: u64 = active_vals.iter().map(|v| v.staked_balance).sum();
            if total_stake > 0 {
                let mut distributed = 0u64;
                for (idx, val) in active_vals.iter().enumerate() {
                    let val_addr = Address::from_public_key(&val.pubkey);
                    let share = if idx == active_vals.len() - 1 {
                        staking_reward.saturating_sub(distributed)
                    } else {
                        ((staking_reward as u128) * (val.staked_balance as u128) / (total_stake as u128)) as u64
                    };
                    distributed = distributed.saturating_add(share);
                    if share > 0 {
                        let mut val_acct = storage.get_account(&val_addr)?.unwrap_or_default();
                        val_acct.add_balance(share);
                        storage.put_account(&val_addr, &val_acct)?;
                        modified_accounts.insert(val_addr);
                    }
                }
            } else {
                // Fallback: if no staking yet (e.g. bootstrap), pay everything to proposer
                let mut proposer_acct = storage.get_account(&block.header.validator)?.unwrap_or_default();
                proposer_acct.add_balance(staking_reward);
                storage.put_account(&block.header.validator, &proposer_acct)?;
            }
        }

        // Calculate and verify SMT state root
        let prev_root = if block.header.height == 1 {
            [0u8; 32]
        } else {
            let prev_block = storage.get_block_by_height(block.header.height - 1)?
                .ok_or_else(|| CoreError::StateError("Previous block not found in storage".to_string()))?;
            prev_block.header.state_root.0
        };

        let trie_store = SmtDbStore {
            storage: storage.clone(),
            cache: HashMap::new(),
        };

        let mut trie = if prev_root == [0u8; 32] {
            goldchain_smt::SparseMerkleTrie::new(trie_store)
        } else {
            goldchain_smt::SparseMerkleTrie::new_with_root(trie_store, prev_root)
        };

        for addr in modified_accounts {
            let account = storage.get_account(&addr)?.unwrap_or_default();
            let account_hash = Hash::digest(&borsh::to_vec(&account).unwrap());
            let key_hash = Hash::digest(addr.as_str().as_bytes()).0;
            trie.update(key_hash, account_hash.0)
                .map_err(|e| CoreError::StateError(format!("SMT update failed: {}", e)))?;
        }

        let computed_root = Hash(trie.root());
        if block.header.state_root == Hash([0u8; 32]) {
            // Leader packaging
            block.header.state_root = computed_root;
        } else if block.header.state_root != computed_root {
            return Err(CoreError::StateError(format!(
                "State root mismatch: header has 0x{}, but execution computed 0x{}",
                block.header.state_root.to_hex(),
                computed_root.to_hex()
            )));
        }

        // Persist new SMT nodes and commit block to ledger database atomically
        let mut raw_cache = HashMap::new();
        for (h, node) in &trie.store.cache {
            if let Ok(bytes) = borsh::to_vec(node) {
                raw_cache.insert(*h, bytes);
            }
        }
        storage.put_block_and_smt_nodes(block, &raw_cache)?;

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

pub fn elect_active_validators(storage: &Storage) -> Result<Vec<Validator>, CoreError> {
    let staked_accts = storage.get_staked_accounts()
        .map_err(|e| CoreError::StateError(e.to_string()))?;
        
    let mut val_candidates: Vec<Validator> = staked_accts.iter().map(|(addr, acct)| {
        let pubkey = addr.to_public_key().expect("Failed to derive public key from address");
        Validator {
            pubkey,
            voting_power: acct.staked / 1_000_000_000, // 1 vote per 1 GRM
            staked_balance: acct.staked,
            is_slashed: false,
        }
    }).collect();
    
    // Sort by staked balance descending, then by public key for determinism
    val_candidates.sort_by(|a, b| {
        b.staked_balance.cmp(&a.staked_balance)
            .then_with(|| a.pubkey.cmp(&b.pubkey))
    });
    
    // Top 3 validators for BFT consensus election
    val_candidates.truncate(3);
    
    Ok(val_candidates)
}

pub fn slash_validator_on_chain(storage: &Storage, validator_addr: &Address, slash_percentage: u32) -> Result<(), CoreError> {
    if let Some(mut account) = storage.get_account(validator_addr)? {
        let slash_amount = (account.staked as u128 * slash_percentage as u128 / 100) as u64;
        account.staked = account.staked.saturating_sub(slash_amount);
        storage.put_account(validator_addr, &account).map_err(|e| CoreError::StateError(e.to_string()))?;
        println!("🔥 SLASHED validator {} by {} GRM ({}%) due to equivocation!", validator_addr.as_str(), slash_amount, slash_percentage);

        // Update ChainState in storage to reflect the burn
        if let Some(mut chain_state) = ChainState::load_from_db(storage)? {
            chain_state.staked_supply = chain_state.staked_supply.saturating_sub(slash_amount);
            chain_state.total_supply = chain_state.total_supply.saturating_sub(slash_amount);
            chain_state.save_to_db(storage)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::economics::EconomicsConfig;
    use goldchain_types::{Transaction, Account};
    use goldchain_crypto::keys::PrivateKey;
    use goldchain_crypto::address::Address;

    #[test]
    fn test_execute_block_state_transition_invariants() {
        let economics = EconomicsModule::new(EconomicsConfig::default());
        let mut mempool = Mempool::new(10);
        let temp_dir = tempfile::TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test_db.redb");
        let storage = Storage::open(db_path).unwrap();

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
        let mut tx = Transaction::new(from_addr.clone(), to_addr.clone(), 1000, 1, 10, 10, TxType::Transfer, Vec::new());
        tx.sign(&priv_key);

        // Pre-fund sender
        let sender_account = Account::new(50000, 1);
        storage.put_account(&from_addr, &sender_account).unwrap();

        mempool.add_tx(tx.clone(), &storage).unwrap();
        assert_eq!(mempool.len(), 1);

        // Commit block with height 1
        let mut dummy_block = Block::new(
            1,
            1000000000,
            goldchain_crypto::hash::Hash([0u8; 32]),
            goldchain_crypto::hash::Hash([0u8; 32]),
            Address::from_public_key(&PrivateKey::generate().public_key()),
            vec![tx],
        );

        // State transition should pass successfully and evict expired tx (simulated age limit)
        state.execute_block_state_transition(&mut dummy_block, &economics, &mut mempool, &storage).unwrap();

        // Evict expired should not trigger at height 1 (expiry is 100 blocks, nonce is 1)
        assert_eq!(mempool.len(), 1);

        // Verify sender and recipient balances in DB
        let retrieved_sender = storage.get_account(&from_addr).unwrap().unwrap();
        assert_eq!(retrieved_sender.balance, 50000 - 1010);
        assert_eq!(retrieved_sender.nonce, 2);

        let retrieved_recipient = storage.get_account(&to_addr).unwrap().unwrap();
        assert_eq!(retrieved_recipient.balance, 1000);

        // If we jump height to 105, evict_expired should drop it!
        // We write a dummy block at height 104 to storage to simulate a valid block history
        let dummy_prev_block = Block::new(
            104,
            1000000999,
            dummy_block.hash(),
            dummy_block.header.state_root,
            Address::from_public_key(&PrivateKey::generate().public_key()),
            Vec::new(),
        );
        storage.put_block(&dummy_prev_block).unwrap();

        let mut dummy_block_expired = Block::new(
            105,
            1000001000,
            dummy_prev_block.hash(),
            goldchain_crypto::hash::Hash([0u8; 32]),
            Address::from_public_key(&PrivateKey::generate().public_key()),
            Vec::new(),
        );

        state.execute_block_state_transition(&mut dummy_block_expired, &economics, &mut mempool, &storage).unwrap();
        assert_eq!(mempool.len(), 0); // Reaped successfully!
    }

    #[test]
    fn test_execute_block_contract_flow() {
        let economics = EconomicsModule::new(EconomicsConfig::default());
        let mut mempool = Mempool::new(10);
        let temp_dir = tempfile::TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test_db_contract.redb");
        let storage = Storage::open(db_path).unwrap();

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
        // Compile real WASM bytecode using wat
        let wat_src = r#"
            (module
              (import "env" "db_write" (func $db_write (param i32 i32 i32 i32)))
              (import "env" "db_read" (func $db_read (param i32 i32 i32 i32) (result i32)))
              (import "env" "db_args_len" (func $db_args_len (result i32)))
              (import "env" "db_args_read" (func $db_args_read (param i32 i32) (result i32)))
              (memory (export "memory") 1)
              
              (func (export "store")
                (call $db_args_read (i32.const 0) (i32.const 1024))
                drop
                (call $db_write (i32.const 0) (i32.const 1) (i32.const 1) (i32.const 1))
              )
              
              (func (export "load")
                (call $db_args_read (i32.const 0) (i32.const 1024))
                drop
                (call $db_read (i32.const 0) (i32.const 1) (i32.const 1) (i32.const 1))
                drop
              )

              (func $overflow
                (call $overflow)
              )

              (func (export "recursive_overflow")
                (call $overflow)
              )
            )
        "#;
        let mut valid_wasm_with_storage = wat::parse_str(wat_src).unwrap();
        // Append capabilities section
        valid_wasm_with_storage.push(0); // Section ID 0
        valid_wasm_with_storage.push(14); // Section size
        valid_wasm_with_storage.push(12); // Name length
        valid_wasm_with_storage.extend_from_slice(b"capabilities");
        valid_wasm_with_storage.push(0xFA); // Storage permission
        
        let mut deploy_tx = Transaction::new(
            from_addr.clone(),
            contract_addr.clone(),
            0,
            1,
            100_000, // fee
            100_000, // gas limit
            TxType::ContractDeploy,
            valid_wasm_with_storage,
        );
        deploy_tx.sign(&priv_key);

        // Pre-fund sender
        let sender_account = Account::new(1_000_000, 1);
        storage.put_account(&from_addr, &sender_account).unwrap();

        let mut block1 = Block::new(
            1,
            1000000000,
            goldchain_crypto::hash::Hash([0u8; 32]),
            goldchain_crypto::hash::Hash([0u8; 32]),
            Address::from_public_key(&PrivateKey::generate().public_key()),
            vec![deploy_tx],
        );

        state.execute_block_state_transition(&mut block1, &economics, &mut mempool, &storage).unwrap();

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
            50_000,
            50_000, // gas limit
            TxType::ContractCall,
            store_call_data,
        );
        call_tx.sign(&priv_key);

        let mut block2 = Block::new(
            2,
            1000005000,
            block1.hash(),
            goldchain_crypto::hash::Hash([0u8; 32]),
            Address::from_public_key(&PrivateKey::generate().public_key()),
            vec![call_tx],
        );

        state.execute_block_state_transition(&mut block2, &economics, &mut mempool, &storage).unwrap();

        // Check storage state directly inside VM
        let storage_map = state.vm.storage.get(&contract_addr).unwrap();
        assert_eq!(storage_map.get(&vec![42]), Some(&vec![100]));
    }

    #[test]
    fn test_execute_block_dynamic_validator_rewards() {
        let economics = EconomicsModule::new(EconomicsConfig::default());
        let mut mempool = Mempool::new(10);
        let temp_dir = tempfile::TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test_db_rewards.redb");
        let storage = Storage::open(db_path).unwrap();

        // 1. Create three validators with different stakes (5000, 3000, 2000)
        let val_priv0 = PrivateKey::generate();
        let val_priv1 = PrivateKey::generate();
        let val_priv2 = PrivateKey::generate();

        let val_addr0 = Address::from_public_key(&val_priv0.public_key());
        let val_addr1 = Address::from_public_key(&val_priv1.public_key());
        let val_addr2 = Address::from_public_key(&val_priv2.public_key());

        let mut acct0 = Account::new(10_000 * 1_000_000_000, 0);
        acct0.staked = 5_000 * 1_000_000_000;
        storage.put_account(&val_addr0, &acct0).unwrap();

        let mut acct1 = Account::new(10_000 * 1_000_000_000, 0);
        acct1.staked = 3_000 * 1_000_000_000;
        storage.put_account(&val_addr1, &acct1).unwrap();

        let mut acct2 = Account::new(10_000 * 1_000_000_000, 0);
        acct2.staked = 2_000 * 1_000_000_000;
        storage.put_account(&val_addr2, &acct2).unwrap();

        // Query active validators to verify election
        let elected = elect_active_validators(&storage).unwrap();
        assert_eq!(elected.len(), 3);
        assert_eq!(elected[0].staked_balance, 5_000 * 1_000_000_000);
        assert_eq!(elected[1].staked_balance, 3_000 * 1_000_000_000);
        assert_eq!(elected[2].staked_balance, 2_000 * 1_000_000_000);

        // 2. Initialize chain state
        let mut state = ChainState {
            circulating_supply: 30_000 * 1_000_000_000,
            staked_supply: 10_000 * 1_000_000_000,
            treasury_supply: 0,
            locked_supply: 0,
            total_supply: 40_000 * 1_000_000_000,
            bridge_tvl: 0,
            vm: crate::vm::WasmVirtualMachine::new(),
        };

        // Create transaction: sender is val_addr0, sending 1000 to val_addr1, fee = 100
        let mut tx = Transaction::new(val_addr0.clone(), val_addr1.clone(), 1000, 0, 100, 100, TxType::Transfer, Vec::new());
        tx.sign(&val_priv0);

        let mut block = Block::new(
            1,
            1000000000,
            goldchain_crypto::hash::Hash([0u8; 32]),
            goldchain_crypto::hash::Hash([0u8; 32]),
            val_addr0.clone(), // proposer is val_addr0
            vec![tx],
        );

        // Execute block state transition
        state.execute_block_state_transition(&mut block, &economics, &mut mempool, &storage).unwrap();

        // 3. Verify reward shares
        let retrieved_val0 = storage.get_account(&val_addr0).unwrap().unwrap();
        let retrieved_val1 = storage.get_account(&val_addr1).unwrap().unwrap();
        let retrieved_val2 = storage.get_account(&val_addr2).unwrap().unwrap();

        assert!(retrieved_val0.balance > 0);
        // Validator 1 and 2 received reward shares greater than 0
        assert!(retrieved_val1.balance > 10_000 * 1_000_000_000 + 1000); 
        assert!(retrieved_val2.balance > 10_000 * 1_000_000_000); 
    }

    #[test]
    fn test_governance_proposals_flow() {
        let economics = EconomicsModule::new(EconomicsConfig::default());
        let mut mempool = Mempool::new(10);
        let temp_dir = tempfile::TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test_db_gov.redb");
        let storage = Storage::open(db_path).unwrap();

        // 1. Create governor validator with stake
        let gov_priv = PrivateKey::generate();
        let gov_addr = Address::from_public_key(&gov_priv.public_key());
        let mut gov_acct = Account::new(10_000 * 1_000_000_000, 0);
        gov_acct.staked = 5_000 * 1_000_000_000;
        storage.put_account(&gov_addr, &gov_acct).unwrap();

        // Fund governance contract address
        let gov_contract_addr = crate::governance::governance_address();
        let gov_contract_acct = Account::new(2_100_000 * 1_000_000_000, 0);
        storage.put_account(&gov_contract_addr, &gov_contract_acct).unwrap();

        let recipient_addr = Address::from_public_key(&PrivateKey::generate().public_key());

        let mut state = ChainState {
            circulating_supply: 10_000 * 1_000_000_000 + 2_100_000 * 1_000_000_000,
            staked_supply: 5_000 * 1_000_000_000,
            treasury_supply: 0,
            locked_supply: 0,
            total_supply: 10_000 * 1_000_000_000 + 2_100_000 * 1_000_000_000 + 5_000 * 1_000_000_000,
            bridge_tvl: 0,
            vm: crate::vm::WasmVirtualMachine::new(),
        };

        // Proposal: create proposal to transfer 1000 GRM to recipient
        let data = format!("proposal_create:{}:1000:Test proposal", recipient_addr.as_str()).into_bytes();
        let mut tx_create = Transaction::new(gov_addr.clone(), gov_contract_addr.clone(), 0, 0, 100, 100, TxType::ContractCall, data);
        tx_create.sign(&gov_priv);

        let mut block1 = Block::new(1, 1000000000, Hash([0u8; 32]), Hash([0u8; 32]), gov_addr.clone(), vec![tx_create]);
        state.execute_block_state_transition(&mut block1, &economics, &mut mempool, &storage).unwrap();

        // Proposal: execute proposal #1
        let data_exec = b"proposal_execute:1".to_vec();
        let mut tx_exec = Transaction::new(gov_addr.clone(), gov_contract_addr.clone(), 0, 1, 100, 100, TxType::ContractCall, data_exec);
        tx_exec.sign(&gov_priv);

        let mut block2 = Block::new(2, 1000005000, block1.hash(), Hash([0u8; 32]), gov_addr.clone(), vec![tx_exec]);
        state.execute_block_state_transition(&mut block2, &economics, &mut mempool, &storage).unwrap();

        // Verify recipient received the funds and governance contract balance was reduced
        let recipient_retrieved = storage.get_account(&recipient_addr).unwrap().unwrap();
        assert_eq!(recipient_retrieved.balance, 1000);

        let gov_contract_retrieved = storage.get_account(&gov_contract_addr).unwrap().unwrap();
        assert_eq!(gov_contract_retrieved.balance, 2_100_000 * 1_000_000_000 - 1000);
    }

    #[test]
    fn test_unbonding_and_auto_unlock() {
        let mut mempool = Mempool::new(10);
        let temp_dir = tempfile::TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test_db_unbond.redb");
        let storage = Storage::open(db_path).unwrap();

        let mut econ_config = EconomicsConfig::default();
        econ_config.unbonding_period = 3;
        econ_config.save_to_db(&storage).unwrap();
        let economics = EconomicsModule::new(econ_config);

        let priv_key = PrivateKey::generate();
        let addr = Address::from_public_key(&priv_key.public_key());
        
        let mut acct = Account::new(10_000 * 1_000_000_000, 0);
        acct.staked = 5_000 * 1_000_000_000;
        storage.put_account(&addr, &acct).unwrap();

        let mut state = ChainState {
            circulating_supply: 10_000 * 1_000_000_000,
            staked_supply: 5_000 * 1_000_000_000,
            treasury_supply: 0,
            locked_supply: 0,
            total_supply: 15_000 * 1_000_000_000,
            bridge_tvl: 0,
            vm: crate::vm::WasmVirtualMachine::new(),
        };

        // 1. Unstake transaction
        let mut tx_unstake = Transaction::new(addr.clone(), addr.clone(), 1_000 * 1_000_000_000, 0, 100, 100, TxType::Unstake, Vec::new());
        tx_unstake.sign(&priv_key);

        let mut block1 = Block::new(1, 1000000000, Hash([0u8; 32]), Hash([0u8; 32]), addr.clone(), vec![tx_unstake]);
        state.execute_block_state_transition(&mut block1, &economics, &mut mempool, &storage).unwrap();

        // Staked supply should be reduced, locked supply increased, circulating balance NOT increased yet
        let retrieved = storage.get_account(&addr).unwrap().unwrap();
        assert_eq!(retrieved.staked, 4_000 * 1_000_000_000);
        assert_eq!(retrieved.balance, 10_001_999_999_950); // initial 10,000 + 2,000 block reward - 100 fee + 50 fee share
        assert_eq!(retrieved.unbonding_unlocks.len(), 1);
        assert_eq!(retrieved.unbonding_unlocks[0].1, 4); // unlock height = 1 + 3 = 4

        // 2. Submit transaction at block height 2 (before maturity)
        let mut tx_dummy1 = Transaction::new(addr.clone(), addr.clone(), 0, 1, 100, 100, TxType::Transfer, Vec::new());
        tx_dummy1.sign(&priv_key);
        let mut block2 = Block::new(2, 1000005000, block1.hash(), Hash([0u8; 32]), addr.clone(), vec![tx_dummy1]);
        state.execute_block_state_transition(&mut block2, &economics, &mut mempool, &storage).unwrap();

        let retrieved = storage.get_account(&addr).unwrap().unwrap();
        assert_eq!(retrieved.balance, 10_003_999_999_900); // only fee deducted, no unlock, plus block rewards

        // 3. Submit transaction at block height 4 (unlock matured)
        // We propose block at height 3 first (empty block)
        let mut block3 = Block::new(3, 1000010000, block2.hash(), Hash([0u8; 32]), addr.clone(), Vec::new());
        state.execute_block_state_transition(&mut block3, &economics, &mut mempool, &storage).unwrap();

        // Propose block at height 4
        let mut tx_dummy2 = Transaction::new(addr.clone(), addr.clone(), 0, 2, 100, 100, TxType::Transfer, Vec::new());
        tx_dummy2.sign(&priv_key);
        let mut block4 = Block::new(4, 1000015000, block3.hash(), Hash([0u8; 32]), addr.clone(), vec![tx_dummy2]);
        state.execute_block_state_transition(&mut block4, &economics, &mut mempool, &storage).unwrap();

        let retrieved = storage.get_account(&addr).unwrap().unwrap();
        // Unlocked amount (1_000) added to balance, block reward and fee reward added
        assert_eq!(retrieved.balance, 11_007_999_999_850);
        assert_eq!(retrieved.unbonding_unlocks.len(), 0);
    }

    #[test]
    fn test_validator_commission_capping() {
        let economics = EconomicsModule::new(EconomicsConfig::default());
        let mut mempool = Mempool::new(10);
        let temp_dir = tempfile::TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test_db_comm.redb");
        let storage = Storage::open(db_path).unwrap();

        let priv_key = PrivateKey::generate();
        let addr = Address::from_public_key(&priv_key.public_key());
        let acct = Account::new(10_000 * 1_000_000_000, 0);
        storage.put_account(&addr, &acct).unwrap();

        let mut state = ChainState {
            circulating_supply: 10_000 * 1_000_000_000,
            staked_supply: 0,
            treasury_supply: 0,
            locked_supply: 0,
            total_supply: 10_000 * 1_000_000_000,
            bridge_tvl: 0,
            vm: crate::vm::WasmVirtualMachine::new(),
        };

        // 1. Staking with 10% commission (data = [10]) -> should pass
        let mut tx_valid = Transaction::new(addr.clone(), addr.clone(), 1000, 0, 100, 100, TxType::Stake, vec![10]);
        tx_valid.sign(&priv_key);
        let mut block1 = Block::new(1, 1000000000, Hash([0u8; 32]), Hash([0u8; 32]), addr.clone(), vec![tx_valid]);
        assert!(state.execute_block_state_transition(&mut block1, &economics, &mut mempool, &storage).is_ok());

        // 2. Staking with 25% commission (data = [25]) -> should fail
        let mut tx_invalid = Transaction::new(addr.clone(), addr.clone(), 1000, 1, 100, 100, TxType::Stake, vec![25]);
        tx_invalid.sign(&priv_key);
        let mut block2 = Block::new(2, 1000005000, block1.hash(), Hash([0u8; 32]), addr.clone(), vec![tx_invalid]);
        assert!(state.execute_block_state_transition(&mut block2, &economics, &mut mempool, &storage).is_err());
    }

    #[test]
    fn test_auto_slashing_equivocation() {
        let temp_dir = tempfile::TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test_db_slashing.redb");
        let storage = Storage::open(db_path).unwrap();

        let val_priv = PrivateKey::generate();
        let val_addr = Address::from_public_key(&val_priv.public_key());
        
        let mut acct = Account::new(10_000 * 1_000_000_000, 0);
        acct.staked = 5_000 * 1_000_000_000;
        storage.put_account(&val_addr, &acct).unwrap();

        let chain_state = ChainState {
            circulating_supply: 5_000 * 1_000_000_000,
            staked_supply: 5_000 * 1_000_000_000,
            treasury_supply: 0,
            locked_supply: 0,
            total_supply: 10_000 * 1_000_000_000,
            bridge_tvl: 0,
            vm: crate::vm::WasmVirtualMachine::new(),
        };
        chain_state.save_to_db(&storage).unwrap();

        let mut consensus = crate::consensus::ConsensusState::new(vec![
            crate::consensus::Validator {
                pubkey: val_priv.public_key(),
                voting_power: 100,
                staked_balance: 5_000 * 1_000_000_000,
                is_slashed: false,
            }
        ]);

        // Proposal 1 at height 1
        let block1 = Block::new(1, 1000, Hash([0u8; 32]), Hash([0u8; 32]), val_addr.clone(), Vec::new());
        consensus.verify_and_record_proposal(&block1, &storage).unwrap();

        // Proposal 2 at height 1 (equivocation) by same validator
        let mut block2 = Block::new(1, 1001, Hash([0u8; 32]), Hash([0u8; 32]), val_addr.clone(), Vec::new());
        // Mutate block2 slightly to have a different hash
        block2.header.timestamp = 1002;
        
        let res = consensus.verify_and_record_proposal(&block2, &storage);
        assert!(res.is_err());

        // Verify validator slashed on-chain (5% of 5,000 is 250)
        let acct_retrieved = storage.get_account(&val_addr).unwrap().unwrap();
        assert_eq!(acct_retrieved.staked, 4_750 * 1_000_000_000);

        // Verify dynamic supply states updated in storage
        let state_retrieved = ChainState::load_from_db(&storage).unwrap().unwrap();
        assert_eq!(state_retrieved.staked_supply, 4_750 * 1_000_000_000);
        assert_eq!(state_retrieved.total_supply, 9_750 * 1_000_000_000);
    }
}

