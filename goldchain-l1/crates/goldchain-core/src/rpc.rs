use std::net::{TcpListener, TcpStream};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::mempool::Mempool;
use goldchain_crypto::hash::Hash;
use goldchain_crypto::address::Address;
use crate::transaction::Transaction;

#[derive(Deserialize, Serialize, Debug)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub method: String,
    pub params: Option<serde_json::Value>,
    pub id: Option<serde_json::Value>,
}

#[derive(Serialize, Debug)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub result: Option<serde_json::Value>,
    pub error: Option<serde_json::Value>,
    pub id: Option<serde_json::Value>,
}

pub struct RpcServerState {
    pub current_height: u64,
    pub mempool: Mempool,
    pub balances: std::collections::HashMap<Address, u64>,
    pub receipts: std::collections::HashMap<Hash, serde_json::Value>,
}

impl RpcServerState {
    pub fn new(capacity: usize) -> Self {
        RpcServerState {
            current_height: 1,
            mempool: Mempool::new(capacity),
            balances: std::collections::HashMap::new(),
            receipts: std::collections::HashMap::new(),
        }
    }
}

/// Starts a background TCP JSON-RPC HTTP server listening on the specified address.
pub fn start_rpc_server(addr: &str, state: Arc<Mutex<RpcServerState>>) -> std::thread::JoinHandle<()> {
    let listener = TcpListener::bind(addr).expect("Failed to bind RPC TCP listener");
    // Make listener non-blocking or just accept connections in loop
    thread::spawn(move || {
        for stream in listener.incoming() {
            if let Ok(s) = stream {
                let state_clone = Arc::clone(&state);
                thread::spawn(move || {
                    handle_connection(s, state_clone);
                });
            }
        }
    })
}

fn handle_connection(mut stream: TcpStream, state: Arc<Mutex<RpcServerState>>) {
    let mut buffer = [0u8; 8192];
    let bytes_read = match stream.read(&mut buffer) {
        Ok(n) if n > 0 => n,
        _ => return,
    };

    let request_str = String::from_utf8_lossy(&buffer[..bytes_read]);
    
    // Check if OPTIONS CORS preflight request
    if request_str.starts_with("OPTIONS") {
        let response = "HTTP/1.1 204 No Content\r\n\
                        Access-Control-Allow-Origin: *\r\n\
                        Access-Control-Allow-Methods: POST, GET, OPTIONS\r\n\
                        Access-Control-Allow-Headers: Content-Type\r\n\
                        Content-Length: 0\r\n\
                        Connection: close\r\n\r\n";
        let _ = stream.write_all(response.as_bytes());
        let _ = stream.flush();
        return;
    }

    // Parse HTTP POST body
    if let Some(body_start) = request_str.find("\r\n\r\n") {
        let body = &request_str[body_start + 4..];
        
        // Clean up any trailing null bytes
        let trimmed_body = body.trim_end_matches('\0').trim();
        
        if let Ok(rpc_req) = serde_json::from_str::<JsonRpcRequest>(trimmed_body) {
            let response_val = process_rpc_request(rpc_req, &state);
            let response_body = serde_json::to_string(&response_val).unwrap();
            let http_response = format!(
                "HTTP/1.1 200 OK\r\n\
                 Content-Type: application/json\r\n\
                 Access-Control-Allow-Origin: *\r\n\
                 Content-Length: {}\r\n\
                 Connection: close\r\n\r\n{}",
                response_body.len(),
                response_body
            );
            let _ = stream.write_all(http_response.as_bytes());
            let _ = stream.flush();
        }
    }
}

fn process_rpc_request(req: JsonRpcRequest, state_lock: &Arc<Mutex<RpcServerState>>) -> JsonRpcResponse {
    let method = req.method.as_str();
    let mut state = state_lock.lock().unwrap();

    let result = match method {
        "gold_blockNumber" => {
            Some(json!(state.current_height))
        }
        "gold_getBalance" => {
            if let Some(params) = req.params.as_ref() {
                if let Some(addr_str) = params.get(0).and_then(|v| v.as_str()) {
                    let addr = Address(addr_str.to_string());
                    let bal = state.balances.get(&addr).cloned().unwrap_or(0);
                    Some(json!(bal))
                } else {
                    None
                }
            } else {
                None
            }
        }
        "gold_sendRawTransaction" => {
            if let Some(params) = req.params.as_ref() {
                if let Some(hex_str) = params.get(0).and_then(|v| v.as_str()) {
                    if let Ok(tx_bytes) = hex_helper::decode(hex_str) {
                        if let Ok(tx) = borsh::from_slice::<Transaction>(&tx_bytes) {
                            let tx_hash = tx.hash();
                            match state.mempool.add_tx(tx) {
                                Ok(_) => Some(json!(tx_hash.to_hex())),
                                Err(e) => Some(json!({ "error": format!("{:?}", e) })),
                            }
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            }
        }
        "gold_getTransactionReceipt" => {
            if let Some(params) = req.params.as_ref() {
                if let Some(hash_str) = params.get(0).and_then(|v| v.as_str()) {
                    if let Ok(hash_bytes) = hex_helper::decode(hash_str) {
                        if hash_bytes.len() == 32 {
                            let mut arr = [0u8; 32];
                            arr.copy_from_slice(&hash_bytes);
                            let hash = Hash(arr);
                            let receipt = state.receipts.get(&hash).cloned().unwrap_or(json!(null));
                            Some(receipt)
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            }
        }
        _ => None,
    };

    let has_error = result.is_none();

    JsonRpcResponse {
        jsonrpc: "2.0".to_string(),
        result,
        error: if has_error { Some(json!({ "code": -32601, "message": "Method not found" })) } else { None },
        id: req.id,
    }
}

mod hex_helper {
    pub fn decode(hex_str: &str) -> Result<Vec<u8>, String> {
        if hex_str.len() % 2 != 0 {
            return Err("Odd length hex string".to_string());
        }
        let mut bytes = Vec::with_capacity(hex_str.len() / 2);
        let chars: Vec<char> = hex_str.chars().collect();
        for i in (0..hex_str.len()).step_by(2) {
            let s: String = chars[i..i+2].iter().collect();
            let byte = u8::from_str_radix(&s, 16).map_err(|e| e.to_string())?;
            bytes.push(byte);
        }
        Ok(bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use goldchain_crypto::keys::PrivateKey;
    use crate::transaction::TxType;

    #[test]
    fn test_rpc_server_methods() {
        let state = Arc::new(Mutex::new(RpcServerState::new(10)));
        
        // Setup initial balance
        let priv_key = PrivateKey::generate();
        let pub_key = priv_key.public_key();
        let addr = Address::from_public_key(&pub_key);
        {
            let mut s = state.lock().unwrap();
            s.balances.insert(addr.clone(), 50000);
        }

        // Start server on an ephemeral port
        let _server_handle = start_rpc_server("127.0.0.1:28545", Arc::clone(&state));
        
        // Wait a brief moment for server to bind
        thread::sleep(std::time::Duration::from_millis(150));

        // 1. Query block number via direct request processor
        let req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "gold_blockNumber".to_string(),
            params: None,
            id: Some(json!(1)),
        };
        let resp = process_rpc_request(req, &state);
        assert_eq!(resp.result.unwrap().as_u64().unwrap(), 1);

        // 2. Query balance
        let req_bal = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "gold_getBalance".to_string(),
            params: Some(json!([addr.as_str()])),
            id: Some(json!(2)),
        };
        let resp_bal = process_rpc_request(req_bal, &state);
        assert_eq!(resp_bal.result.unwrap().as_u64().unwrap(), 50000);

        // 3. Send raw transaction
        let mut tx = Transaction::new(addr.clone(), Address(String::from("gold1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4rshq")), 1000, 1, 10, TxType::Transfer, Vec::new());
        tx.sign(&priv_key);
        let tx_bytes = borsh::to_vec(&tx).unwrap();
        
        let mut tx_hex = String::with_capacity(tx_bytes.len() * 2);
        for &b in &tx_bytes {
            tx_hex.push_str(&format!("{:02x}", b));
        }

        let req_send = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            method: "gold_sendRawTransaction".to_string(),
            params: Some(json!([tx_hex])),
            id: Some(json!(3)),
        };
        let resp_send = process_rpc_request(req_send, &state);
        assert!(resp_send.result.is_some());
    }
}
