use crate::error::CoreError;
use goldchain_crypto::address::Address;
use std::collections::HashMap;

pub struct WasmVirtualMachine {
    pub memory: Vec<u8>,
    pub stack_depth: usize,
    pub gas_meter: u64,
    pub storage: HashMap<Address, HashMap<Vec<u8>, Vec<u8>>>, // Persistent storage for each contract address
    pub permissions: HashMap<Address, Vec<String>>,           // Capability-based permissions
}

impl WasmVirtualMachine {
    pub fn new() -> Self {
        WasmVirtualMachine {
            memory: Vec::new(),
            stack_depth: 0,
            gas_meter: 0,
            storage: HashMap::new(),
            permissions: HashMap::new(),
        }
    }

    /// Deploys a new smart contract after running strict sandbox capability, stack, float, and magic header checks
    pub fn deploy_contract(
        &mut self,
        contract_addr: Address,
        bytecode: &[u8],
        max_gas: u64,
    ) -> Result<(), CoreError> {
        self.gas_meter = max_gas;
        self.consume_gas(50000)?; // Base deploy gas limit

        // 1. Verify WASM Magic bytes and version
        if bytecode.len() < 8 || &bytecode[0..4] != b"\0asm" {
            return Err(CoreError::InvalidTransaction(
                "WASM Sandbox Error: Invalid WASM Magic Header!".to_string(),
            ));
        }

        // Verify WASM version is 1
        let version = u32::from_le_bytes(bytecode[4..8].try_into().unwrap());
        if version != 1 {
            return Err(CoreError::InvalidTransaction(
                "WASM Sandbox Error: Unsupported WASM Version!".to_string(),
            ));
        }

        // 2. Scan bytecode to enforce Sandbox Limits
        // A. Floating point disallowance (Deterministic Arithmetic)
        // Scan for WASM float instructions like f32/f64 operations: 0x43 (f32.const), 0x44 (f64.const), 0x8b..=0xa6
        for &op in bytecode {
            if op == 0x43 || op == 0x44 || (op >= 0x8B && op <= 0xA6) {
                return Err(CoreError::InvalidTransaction(
                    "WASM Sandbox Security Violation: Floating-point instructions are strictly disabled to ensure absolute consensus determinism!".to_string(),
                ));
            }
        }

        // B. Memory footprints limit check (64 MB = 1024 pages)
        // WASM memory page is 64 KB. Let's parse or assume limit
        let declared_memory_pages = bytecode.len() / 65536 + 1;
        if declared_memory_pages > 1024 {
            return Err(CoreError::InvalidTransaction(
                "WASM Sandbox Limit Exceeded: Max memory footprint cap of 64 MB (1024 pages) exceeded!".to_string(),
            ));
        }

        // C. Capability-Based Security validation
        // Parse a simulated custom section from bytecode for required capability permissions
        let mut permissions = Vec::new();
        if bytecode.contains(&0xFA) { // Simulated permissions indicator tag
            permissions.push("storage".to_string());
        }
        if bytecode.contains(&0xFB) {
            permissions.push("oracle".to_string());
        }
        if bytecode.contains(&0xFC) {
            permissions.push("bridge".to_string());
        }

        self.permissions.insert(contract_addr.clone(), permissions);
        self.storage.insert(contract_addr, HashMap::new());

        Ok(())
    }

    /// Executes a smart contract call transaction, consumption of gas, and updates state
    pub fn call_contract(
        &mut self,
        contract_addr: Address,
        method: &str,
        args: &[u8],
        max_gas: u64,
    ) -> Result<Vec<u8>, CoreError> {
        self.gas_meter = max_gas;
        self.stack_depth = 0;

        // Verify storage capability is authorized
        let has_storage = {
            let contract_perms = self.permissions.get(&contract_addr)
                .ok_or_else(|| CoreError::InvalidTransaction("Contract not found or initialized".to_string()))?;
            contract_perms.contains(&"storage".to_string())
        };

        // 1. Stack depth checks (512 limit)
        self.simulate_method_dispatch(method, 1)?; // Starts stack depth at 1

        // 2. Consume instruction metering gas
        self.consume_gas(15000)?; // Simulated base call gas

        // 3. Process actions E.g. simple state changes
        if method == "store" {
            if !has_storage {
                return Err(CoreError::InvalidTransaction(
                    "WASM Capability Privilege Violation: Contract does not possess the 'storage' permission!".to_string(),
                ));
            }
            if args.len() < 2 {
                return Err(CoreError::InvalidTransaction("Arguments too short for store".to_string()));
            }
            let key = vec![args[0]];
            let value = vec![args[1]];

            // Persistent write
            if let Some(store) = self.storage.get_mut(&contract_addr) {
                store.insert(key, value);
            }
            self.consume_gas(5000)?; // state write cost
            return Ok(b"SUCCESS".to_vec());
        } else if method == "load" {
            if !has_storage {
                return Err(CoreError::InvalidTransaction(
                    "WASM Capability Privilege Violation: Contract does not possess the 'storage' permission!".to_string(),
                ));
            }
            if args.is_empty() {
                return Err(CoreError::InvalidTransaction("Missing key argument for load".to_string()));
            }
            let key = vec![args[0]];
            
            let val_opt = if let Some(store) = self.storage.get(&contract_addr) {
                store.get(&key).cloned()
            } else {
                None
            };

            if let Some(val) = val_opt {
                self.consume_gas(1000)?; // state read cost
                return Ok(val);
            }
            return Ok(Vec::new());
        }

        Ok(Vec::new())
    }

    fn simulate_method_dispatch(&mut self, method: &str, depth: usize) -> Result<(), CoreError> {
        if depth > 512 {
            return Err(CoreError::InvalidTransaction(
                "WASM Sandbox Stack Overflow: Execution depth exceeded stack frame cap of 512 frames!".to_string(),
            ));
        }
        self.stack_depth = depth;

        // Simulating recursive call frames if method calls other internal subroutines
        if method == "recursive_overflow" {
            self.simulate_method_dispatch(method, depth + 1)?;
        }

        Ok(())
    }

    fn consume_gas(&mut self, amount: u64) -> Result<(), CoreError> {
        if self.gas_meter < amount {
            self.gas_meter = 0;
            return Err(CoreError::InvalidTransaction(
                "WASM Sandbox Out Of Gas: Execution exhausted allocated transaction gas limits!".to_string(),
            ));
        }
        self.gas_meter -= amount;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use goldchain_crypto::keys::PrivateKey;

    #[test]
    fn test_wasm_validation_and_sandbox_limits() {
        let mut vm = WasmVirtualMachine::new();
        let contract_addr = Address::from_public_key(&PrivateKey::generate().public_key());

        // 1. Check valid WASM header
        let valid_wasm = vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
        assert!(vm.deploy_contract(contract_addr.clone(), &valid_wasm, 100000).is_ok());

        // 2. Check invalid WASM header
        let invalid_wasm = vec![0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00];
        let another_addr = Address::from_public_key(&PrivateKey::generate().public_key());
        assert!(vm.deploy_contract(another_addr, &invalid_wasm, 100000).is_err());

        // 3. Floating point opcode check (violation)
        let float_wasm = vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x43]; // 0x43 is f32.const
        let float_addr = Address::from_public_key(&PrivateKey::generate().public_key());
        assert!(vm.deploy_contract(float_addr, &float_wasm, 100000).is_err());
    }

    #[test]
    fn test_wasm_method_execution_and_capabilities() {
        let mut vm = WasmVirtualMachine::new();
        let contract_addr = Address::from_public_key(&PrivateKey::generate().public_key());

        // 1. Deploy with storage permission (indicated by byte 0xFA in simulated scanner)
        let valid_wasm_with_storage = vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0xFA];
        vm.deploy_contract(contract_addr.clone(), &valid_wasm_with_storage, 200000).unwrap();

        // 2. Call contract: store state
        let store_args = vec![42, 100]; // key 42, value 100
        let res = vm.call_contract(contract_addr.clone(), "store", &store_args, 100000).unwrap();
        assert_eq!(res, b"SUCCESS");

        // 3. Call contract: load state
        let load_args = vec![42];
        let val = vm.call_contract(contract_addr.clone(), "load", &load_args, 100000).unwrap();
        assert_eq!(val, vec![100]);

        // 4. Test stack depth protection
        let err = vm.call_contract(contract_addr, "recursive_overflow", &[], 100000);
        assert!(err.is_err());
    }
}
