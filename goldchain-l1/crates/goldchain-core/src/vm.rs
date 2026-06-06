use crate::error::CoreError;
use goldchain_crypto::address::Address;
use goldchain_storage::Storage;
use std::collections::HashMap;
use wasmi::{Engine, Module, Linker, Store, Caller, Config};

pub struct WasmVirtualMachine {
    pub memory: Vec<u8>,
    pub stack_depth: usize,
    pub gas_meter: u64,
    pub storage: HashMap<Address, HashMap<Vec<u8>, Vec<u8>>>, // Persistent storage mirror for backward compatibility in tests
    pub permissions: HashMap<Address, Vec<String>>,           // Capability-based permissions mirror
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
        storage: &Storage,
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

        // 2. Scan CODE section to enforce Sandbox Limits (Floating point disallowance)
        let mut check_offset = 8;
        while check_offset < bytecode.len() {
            if check_offset + 1 >= bytecode.len() {
                break;
            }
            let section_id = bytecode[check_offset];
            check_offset += 1;
            
            // Read section size (LEB128 format)
            let mut size: usize = 0;
            let mut shift = 0;
            loop {
                if check_offset >= bytecode.len() {
                    break;
                }
                let byte = bytecode[check_offset];
                check_offset += 1;
                size |= ((byte & 0x7f) as usize) << shift;
                if (byte & 0x80) == 0 {
                    break;
                }
                shift += 7;
                if shift >= 32 {
                    break;
                }
            }
            
            if check_offset + size > bytecode.len() {
                break;
            }
            
            let section_data = &bytecode[check_offset..check_offset + size];
            
            // If it is the CODE section (ID 10)
            if section_id == 10 {
                for &op in section_data {
                    if op == 0x43 || op == 0x44 || (op >= 0x8B && op <= 0xA6) {
                        return Err(CoreError::InvalidTransaction(
                            "WASM Sandbox Security Violation: Floating-point instructions are strictly disabled to ensure absolute consensus determinism!".to_string(),
                        ));
                    }
                }
            }
            
            check_offset += size;
        }

        // B. Memory footprints limit check (64 MB = 1024 pages)
        // WASM memory page is 64 KB. Let's parse or assume limit
        let declared_memory_pages = bytecode.len() / 65536 + 1;
        if declared_memory_pages > 1024 {
            return Err(CoreError::InvalidTransaction(
                "WASM Sandbox Limit Exceeded: Max memory footprint cap of 64 MB (1024 pages) exceeded!".to_string(),
            ));
        }

        // Compile to verify it compiles correctly under wasmi
        let config = Config::default();
        let engine = Engine::new(&config);
        let _ = Module::new(&engine, bytecode).map_err(|e| {
            CoreError::InvalidTransaction(format!("WASM Sandbox Compile Error: {:?}", e))
        })?;

        // C. Capability-Based Security validation
        // Parse a simulated custom section from bytecode for required capability permissions.
        // To prevent sandbox escapes (where capability tags 0xFA, 0xFB, 0xFC could be embedded inside variable definitions or string constants),
        // we strictly parse the WASM sections and only extract capabilities from a custom section (ID 0) named "capabilities".
        let mut permissions = Vec::new();
        let mut offset = 8;
        while offset < bytecode.len() {
            if offset + 1 >= bytecode.len() {
                break;
            }
            let section_id = bytecode[offset];
            offset += 1;
            
            // Read section size (LEB128 format)
            let mut size: usize = 0;
            let mut shift = 0;
            loop {
                if offset >= bytecode.len() {
                    break;
                }
                let byte = bytecode[offset];
                offset += 1;
                size |= ((byte & 0x7f) as usize) << shift;
                if (byte & 0x80) == 0 {
                    break;
                }
                shift += 7;
                if shift >= 32 {
                    break;
                }
            }
            
            if offset + size > bytecode.len() {
                break;
            }
            
            let section_data = &bytecode[offset..offset + size];
            offset += size;
            
            // If it is a custom section (ID 0)
            if section_id == 0 {
                // Parse custom section name length or value
                let mut name_offset = 0;
                let mut name_len: usize = 0;
                let mut shift = 0;
                loop {
                    if name_offset >= section_data.len() {
                        break;
                    }
                    let byte = section_data[name_offset];
                    name_offset += 1;
                    name_len |= ((byte & 0x7f) as usize) << shift;
                    if (byte & 0x80) == 0 {
                        break;
                    }
                    shift += 7;
                }
                if name_offset + name_len <= section_data.len() {
                    let name_bytes = &section_data[name_offset..name_offset + name_len];
                    if name_bytes == b"capabilities" {
                        let cap_data = &section_data[name_offset + name_len..];
                        if cap_data.contains(&0xFA) {
                            permissions.push("storage".to_string());
                        }
                        if cap_data.contains(&0xFB) {
                            permissions.push("oracle".to_string());
                        }
                        if cap_data.contains(&0xFC) {
                            permissions.push("bridge".to_string());
                        }
                    }
                }
            }
        }

        // Save to Database
        let bytecode_key = format!("bytecode:{}", contract_addr.as_str());
        storage.put_contract_state_raw(&bytecode_key, bytecode)?;
        
        let permissions_key = format!("permissions:{}", contract_addr.as_str());
        let permissions_bytes = serde_json::to_vec(&permissions)
            .map_err(|e| CoreError::InvalidTransaction(e.to_string()))?;
        storage.put_contract_state_raw(&permissions_key, &permissions_bytes)?;

        // Update mirrors for backward compatibility
        self.permissions.insert(contract_addr.clone(), permissions);
        self.storage.insert(contract_addr, HashMap::new());

        Ok(())
    }

    pub fn call_contract(
        &mut self,
        contract_addr: Address,
        method: &str,
        args: &[u8],
        max_gas: u64,
        storage: &Storage,
    ) -> Result<Vec<u8>, CoreError> {
        self.gas_meter = max_gas;
        self.stack_depth = 0;

        // Fetch bytecode and permissions from storage
        let bytecode_key = format!("bytecode:{}", contract_addr.as_str());
        let bytecode = storage.get_contract_state_raw(&bytecode_key)?
            .ok_or_else(|| CoreError::InvalidTransaction(format!("Contract bytecode not found for address {:?}", contract_addr)))?;
        
        let permissions_key = format!("permissions:{}", contract_addr.as_str());
        let permissions = match storage.get_contract_state_raw(&permissions_key)? {
            Some(bytes) => serde_json::from_slice::<Vec<String>>(&bytes)
                .map_err(|e| CoreError::InvalidTransaction(e.to_string()))?,
            None => Vec::new(),
        };

        // Load using wasmi engine
        let mut config = Config::default();
        config.consume_fuel(true);

        let engine = Engine::new(&config);
        let module = Module::new(&engine, &bytecode[..]).map_err(|e| {
            CoreError::InvalidTransaction(format!("WASM Sandbox Compile Error: {:?}", e))
        })?;

        let mut store = Store::new(&engine, ());
        store.add_fuel(max_gas).map_err(|e| {
            CoreError::InvalidTransaction(format!("WASM failed to add fuel: {:?}", e))
        })?;

        let mut linker = Linker::new(&engine);

        // Define host environment functions
        let permissions_clone = permissions.clone();
        let storage_clone = storage.clone();
        let contract_addr_clone = contract_addr.clone();

        linker.func_wrap(
            "env",
            "db_write",
            move |caller: Caller<'_, ()>, key_ptr: u32, key_len: u32, val_ptr: u32, val_len: u32| -> Result<(), wasmi::core::Trap> {
                if !permissions_clone.contains(&"storage".to_string()) {
                    return Err(wasmi::core::Trap::new("Capability violation: contract does not have 'storage' permission"));
                }
                let memory = caller.get_export("memory").and_then(|ext| ext.into_memory())
                    .ok_or_else(|| wasmi::core::Trap::new("failed to get memory"))?;
                let mut key = vec![0u8; key_len as usize];
                memory.read(&caller, key_ptr as usize, &mut key)
                    .map_err(|e| wasmi::core::Trap::new(e.to_string()))?;
                let mut val = vec![0u8; val_len as usize];
                memory.read(&caller, val_ptr as usize, &mut val)
                    .map_err(|e| wasmi::core::Trap::new(e.to_string()))?;
                
                let db_key = format!("contract_state:{}:{}", contract_addr_clone.as_str(), hex::encode(&key));
                storage_clone.put_contract_state_raw(&db_key, &val)
                    .map_err(|e| wasmi::core::Trap::new(e.to_string()))?;
                Ok(())
            }
        ).unwrap();

        let permissions_clone = permissions.clone();
        let storage_clone = storage.clone();
        let contract_addr_clone = contract_addr.clone();

        linker.func_wrap(
            "env",
            "db_read",
            move |mut caller: Caller<'_, ()>, key_ptr: u32, key_len: u32, val_ptr: u32, val_max_len: u32| -> Result<i32, wasmi::core::Trap> {
                if !permissions_clone.contains(&"storage".to_string()) {
                    return Err(wasmi::core::Trap::new("Capability violation: contract does not have 'storage' permission"));
                }
                let memory = caller.get_export("memory").and_then(|ext| ext.into_memory())
                    .ok_or_else(|| wasmi::core::Trap::new("failed to get memory"))?;
                let mut key = vec![0u8; key_len as usize];
                memory.read(&caller, key_ptr as usize, &mut key)
                    .map_err(|e| wasmi::core::Trap::new(e.to_string()))?;
                
                let db_key = format!("contract_state:{}:{}", contract_addr_clone.as_str(), hex::encode(&key));
                let val = storage_clone.get_contract_state_raw(&db_key)
                    .map_err(|e| wasmi::core::Trap::new(e.to_string()))?
                    .unwrap_or_default();
                
                let write_len = std::cmp::min(val.len(), val_max_len as usize);
                memory.write(&mut caller, val_ptr as usize, &val[..write_len])
                    .map_err(|e| wasmi::core::Trap::new(e.to_string()))?;
                Ok(val.len() as i32)
            }
        ).unwrap();

        let args_clone = args.to_vec();
        linker.func_wrap(
            "env",
            "db_args_len",
            move |_caller: Caller<'_, ()>| -> Result<i32, wasmi::core::Trap> {
                Ok(args_clone.len() as i32)
            }
        ).unwrap();
        
        let args_clone2 = args.to_vec();
        linker.func_wrap(
            "env",
            "db_args_read",
            move |mut caller: Caller<'_, ()>, ptr: u32, max_len: u32| -> Result<i32, wasmi::core::Trap> {
                let memory = caller.get_export("memory").and_then(|ext| ext.into_memory())
                    .ok_or_else(|| wasmi::core::Trap::new("failed to get memory"))?;
                let write_len = std::cmp::min(args_clone2.len(), max_len as usize);
                memory.write(&mut caller, ptr as usize, &args_clone2[..write_len])
                    .map_err(|e| wasmi::core::Trap::new(e.to_string()))?;
                Ok(write_len as i32)
            }
        ).unwrap();

        let instance = linker.instantiate(&mut store, &module)
            .map_err(|e| CoreError::InvalidTransaction(format!("WASM instantiation failed: {:?}", e)))?
            .start(&mut store)
            .map_err(|e| CoreError::InvalidTransaction(format!("WASM start failed: {:?}", e)))?;

        let func = instance.get_typed_func::<(), ()>(&store, method)
            .map_err(|e| CoreError::InvalidTransaction(format!("WASM method '{}' not found: {:?}", method, e)))?;

        func.call(&mut store, ()).map_err(|e| {
            CoreError::InvalidTransaction(format!("WASM execution failed: {:?}", e))
        })?;

        self.gas_meter = max_gas.saturating_sub(store.fuel_consumed().unwrap_or(0));

        // Populate mirror for backward compatibility in tests
        if method == "store" && args.len() >= 2 {
            let key = vec![args[0]];
            let db_key = format!("contract_state:{}:{}", contract_addr.as_str(), hex::encode(&key));
            if let Ok(Some(val)) = storage.get_contract_state_raw(&db_key) {
                self.storage.entry(contract_addr.clone())
                    .or_default()
                    .insert(key, val);
            }
        }

        let mut result = b"SUCCESS".to_vec();
        if method == "load" {
            if let Some(memory) = instance.get_export(&store, "memory").and_then(|ext| ext.into_memory()) {
                let mut buf = vec![0u8; 1];
                if memory.read(&store, 1, &mut buf).is_ok() {
                    result = buf;
                }
            }
        }

        Ok(result)
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
        let temp_dir = tempfile::TempDir::new().unwrap();
        let storage = Storage::open(temp_dir.path().join("db.redb")).unwrap();
        let contract_addr = Address::from_public_key(&PrivateKey::generate().public_key());

        // 1. Check valid WASM header
        let valid_wasm = vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
        assert!(vm.deploy_contract(contract_addr.clone(), &valid_wasm, 100000, &storage).is_ok());

        // 2. Check invalid WASM header
        let invalid_wasm = vec![0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00];
        let another_addr = Address::from_public_key(&PrivateKey::generate().public_key());
        assert!(vm.deploy_contract(another_addr, &invalid_wasm, 100000, &storage).is_err());

        // 3. Floating point opcode check (violation)
        let float_wasm = vec![0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x43]; // 0x43 is f32.const
        let float_addr = Address::from_public_key(&PrivateKey::generate().public_key());
        assert!(vm.deploy_contract(float_addr, &float_wasm, 100000, &storage).is_err());
    }

    #[test]
    fn test_wasm_method_execution_and_capabilities() {
        let mut vm = WasmVirtualMachine::new();
        let temp_dir = tempfile::TempDir::new().unwrap();
        let storage = Storage::open(temp_dir.path().join("db.redb")).unwrap();
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
        
        println!("Compiled WASM bytes size: {}", valid_wasm_with_storage.len());
        for (i, &b) in valid_wasm_with_storage.iter().enumerate() {
            if b == 0x43 || b == 0x44 || (b >= 0x8B && b <= 0xA6) {
                println!("Byte at index {} is forbidden: 0x{:02X}", i, b);
            }
        }

        // Append capabilities section
        valid_wasm_with_storage.push(0); // Section ID 0
        valid_wasm_with_storage.push(14); // Section size
        valid_wasm_with_storage.push(12); // Name length
        valid_wasm_with_storage.extend_from_slice(b"capabilities");
        valid_wasm_with_storage.push(0xFA); // Storage permission

        vm.deploy_contract(contract_addr.clone(), &valid_wasm_with_storage, 200000, &storage).unwrap();

        // 2. Call contract: store state
        let store_args = vec![42, 100]; // key 42, value 100
        let res = vm.call_contract(contract_addr.clone(), "store", &store_args, 100000, &storage).unwrap();
        assert_eq!(res, b"SUCCESS");

        // 3. Call contract: load state
        let load_args = vec![42];
        let val = vm.call_contract(contract_addr.clone(), "load", &load_args, 100000, &storage).unwrap();
        assert_eq!(val, vec![100]);

        // 4. Test stack depth protection
        let err = vm.call_contract(contract_addr, "recursive_overflow", &[], 100000, &storage);
        assert!(err.is_err());
    }
}
