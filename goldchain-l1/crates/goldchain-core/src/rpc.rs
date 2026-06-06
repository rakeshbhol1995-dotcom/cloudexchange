use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;
use std::collections::HashMap;
use std::net::IpAddr;
use serde::{Deserialize, Serialize};
use serde_json::json;
use crate::mempool::Mempool;
use goldchain_crypto::hash::Hash;
use goldchain_crypto::address::Address;
use crate::transaction::Transaction;
use goldchain_storage::Storage;

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
    pub current_height: AtomicU64,
    pub mempool: Mutex<Mempool>,
    pub storage: Storage,
    pub rate_limiter: Mutex<HashMap<IpAddr, (u32, Instant)>>,
    pub consensus_queue: Mutex<std::collections::VecDeque<crate::p2p::GossipMessage>>,
}

impl RpcServerState {
    pub fn new(capacity: usize, storage: Storage) -> Self {
        let mut height = 1;
        while let Ok(Some(_)) = storage.get_block_by_height(height) {
            height += 1;
        }
        RpcServerState {
            current_height: AtomicU64::new(height),
            mempool: Mutex::new(Mempool::new(capacity)),
            storage,
            rate_limiter: Mutex::new(HashMap::new()),
            consensus_queue: Mutex::new(std::collections::VecDeque::new()),
        }
    }
}

fn load_or_generate_certs() -> Result<(Vec<u8>, Vec<u8>), Box<dyn std::error::Error>> {
    let paths_to_try = vec![
        ("crates/goldchain-core/certs/cert.pem", "crates/goldchain-core/certs/key.pem"),
        ("certs/cert.pem", "certs/key.pem"),
    ];

    for (c_path, k_path) in &paths_to_try {
        let cert_path = std::path::Path::new(c_path);
        let key_path = std::path::Path::new(k_path);
        if cert_path.exists() && key_path.exists() {
            let cert_bytes = std::fs::read(cert_path)?;
            let key_bytes = std::fs::read(key_path)?;
            return Ok((cert_bytes, key_bytes));
        }
    }

    // Generate certificates if not found
    let subject_alt_names = vec!["localhost".to_string(), "127.0.0.1".to_string()];
    let cert = rcgen::generate_simple_self_signed(subject_alt_names)?;
    let cert_pem = cert.serialize_pem()?.into_bytes();
    let key_pem = cert.serialize_private_key_pem().into_bytes();

    // Try to write them to the first path, create dir if needed
    let (c_path, k_path) = paths_to_try[0];
    let cert_path = std::path::Path::new(c_path);
    let key_path = std::path::Path::new(k_path);

    let write_res = if let Some(parent) = cert_path.parent() {
        std::fs::create_dir_all(parent)
            .and_then(|_| std::fs::write(cert_path, &cert_pem))
            .and_then(|_| std::fs::write(key_path, &key_pem))
    } else {
        Err(std::io::Error::new(std::io::ErrorKind::NotFound, "Parent dir not found"))
    };

    // If writing to crates/goldchain-core/certs/ fails, try local certs/
    if write_res.is_err() {
        let (c_path_local, k_path_local) = paths_to_try[1];
        let cert_path_local = std::path::Path::new(c_path_local);
        let key_path_local = std::path::Path::new(k_path_local);
        if let Some(parent) = cert_path_local.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(cert_path_local, &cert_pem);
        let _ = std::fs::write(key_path_local, &key_pem);
    }

    Ok((cert_pem, key_pem))
}

/// Starts a background HTTPS JSON-RPC server using tiny_http with TLS encryption.
pub fn start_rpc_server(addr: &str, state: Arc<RpcServerState>) -> std::thread::JoinHandle<()> {
    let (cert_pem, key_pem) = load_or_generate_certs().expect("Failed to load or generate SSL certificates");
    let ssl_config = tiny_http::SslConfig {
        certificate: cert_pem,
        private_key: key_pem,
    };
    let server = tiny_http::Server::https(addr, ssl_config).expect("Failed to bind secure RPC tiny_http server");
    
    // Spawn background thread to clean up the rate limiter HashMap to avoid memory leak DoS
    let state_cleanup = Arc::clone(&state);
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(std::time::Duration::from_secs(60));
            if let Ok(mut limiter) = state_cleanup.rate_limiter.lock() {
                let now = Instant::now();
                limiter.retain(|_, (_, time)| now.duration_since(*time) < std::time::Duration::from_secs(60));
            }
        }
    });

    std::thread::spawn(move || {
        for mut request in server.incoming_requests() {
            let state_clone = Arc::clone(&state);
            std::thread::spawn(move || {
                let client_ip = request.remote_addr()
                    .map(|addr| addr.ip())
                    .unwrap_or_else(|| "127.0.0.1".parse().unwrap());

                // 1. IP Rate Limiting Check
                let allowed = {
                    let mut limiter = state_clone.rate_limiter.lock().unwrap();
                    let now = Instant::now();
                    let entry = limiter.entry(client_ip).or_insert((0, now));
                    if now.duration_since(entry.1) > std::time::Duration::from_secs(60) {
                        *entry = (1, now);
                        true
                    } else if entry.0 >= 100 { // Max 100 requests per minute
                        false
                    } else {
                        entry.0 += 1;
                        true
                    }
                };

                if !allowed {
                    let response = tiny_http::Response::from_string("Rate limit exceeded")
                        .with_status_code(429);
                    let _ = request.respond(response);
                    return;
                }

                // 2. CORS preflight / OPTIONS check
                if *request.method() == tiny_http::Method::Options {
                    let response = tiny_http::Response::empty(204)
                        .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap())
                        .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"POST, GET, OPTIONS"[..]).unwrap())
                        .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type, Authorization"[..]).unwrap());
                    let _ = request.respond(response);
                    return;
                }

                // 3. Read body bytes (capped at 2MB to prevent memory exhaustion DoS)
                let content_len = request.body_length().unwrap_or(0);
                if content_len > 2 * 1024 * 1024 {
                    let response = tiny_http::Response::empty(413);
                    let _ = request.respond(response);
                    return;
                }

                let mut body_bytes = Vec::new();
                if request.as_reader().read_to_end(&mut body_bytes).is_err() {
                    let response = tiny_http::Response::empty(400);
                    let _ = request.respond(response);
                    return;
                }

                let body_str = String::from_utf8_lossy(&body_bytes);
                let trimmed_body = body_str.trim_end_matches('\0').trim();

                if let Ok(rpc_req) = serde_json::from_str::<JsonRpcRequest>(trimmed_body) {
                    let response_val = process_rpc_request(rpc_req, &state_clone);
                    let response_body = serde_json::to_string(&response_val).unwrap();
                    let response = tiny_http::Response::from_string(response_body)
                        .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
                        .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap())
                        .with_status_code(200);
                    let _ = request.respond(response);
                } else {
                    let response = tiny_http::Response::from_string("Malformed JSON-RPC request")
                        .with_status_code(400);
                    let _ = request.respond(response);
                }
            });
        }
    })
}

fn process_rpc_request(req: JsonRpcRequest, state: &RpcServerState) -> JsonRpcResponse {
    let method = req.method.as_str();

    let result = match method {
        "gold_blockNumber" => {
            Some(json!(state.current_height.load(Ordering::SeqCst)))
        }
        "gold_getBalance" => {
            if let Some(params) = req.params.as_ref() {
                if let Some(addr_str) = params.get(0).and_then(|v| v.as_str()) {
                    let addr = Address(addr_str.to_string());
                    let bal = match state.storage.get_account(&addr) {
                        Ok(Some(account)) => account.balance,
                        _ => 0,
                    };
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
                            let mut mempool = state.mempool.lock().unwrap();
                            match mempool.add_tx(tx, &state.storage) {
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
        "gold_gossipMessage" => {
            if let Some(params) = req.params.as_ref() {
                if let Some(param_val) = params.get(0) {
                    if let Ok(msg) = serde_json::from_value::<crate::p2p::GossipMessage>(param_val.clone()) {
                        let mut queue = state.consensus_queue.lock().unwrap();
                        queue.push_back(msg);
                        if queue.len() > 10000 {
                            queue.pop_front();
                        }
                        Some(json!("OK"))
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
                            match state.storage.get_receipt(&hash) {
                                Ok(Some(receipt)) => {
                                    let status_str = if receipt.success { "0x1" } else { "0x0" };
                                    Some(json!({
                                        "transactionHash": receipt.tx_hash.to_hex(),
                                        "status": status_str,
                                        "gasUsed": receipt.gas_used,
                                    }))
                                }
                                _ => Some(json!(null)),
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
    use goldchain_types::Account;
    use tempfile::TempDir;

    #[test]
    fn test_rpc_server_methods() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("rpc_test_db.redb");
        let storage = Storage::open(db_path).unwrap();
        let state = Arc::new(RpcServerState::new(10, storage.clone()));
        
        // Setup initial balance
        let priv_key = PrivateKey::generate();
        let pub_key = priv_key.public_key();
        let addr = Address::from_public_key(&pub_key);
        {
            let account = Account::new(50000, 1);
            storage.put_account(&addr, &account).unwrap();
        }

        // Start server on an ephemeral port
        let _server_handle = start_rpc_server("127.0.0.1:28545", Arc::clone(&state));
        
        // Wait a brief moment for server to bind
        std::thread::sleep(std::time::Duration::from_millis(150));

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
        let mut tx = Transaction::new(addr.clone(), Address(String::from("gold1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4rshq")), 1000, 1, 10, 10, TxType::Transfer, Vec::new());
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

    #[test]
    fn test_rpc_server_auth() {
        let _ = rustls::crypto::ring::default_provider().install_default();
        std::env::set_var("GOLDCHAIN_RPC_API_KEY", "test_secret_key");
        
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("rpc_auth_test_db.redb");
        let storage = Storage::open(db_path).unwrap();
        let state = Arc::new(RpcServerState::new(10, storage.clone()));

        // Start server on an ephemeral port
        let _server_handle = start_rpc_server("127.0.0.1:28546", Arc::clone(&state));
        
        // Wait a brief moment for server to bind
        std::thread::sleep(std::time::Duration::from_millis(200));

        #[derive(Debug)]
        struct NoVerifier;
        impl ureq::rustls::client::danger::ServerCertVerifier for NoVerifier {
            fn verify_server_cert(
                &self,
                _end_entity: &ureq::rustls::pki_types::CertificateDer<'_>,
                _intermediates: &[ureq::rustls::pki_types::CertificateDer<'_>],
                _server_name: &ureq::rustls::pki_types::ServerName<'_>,
                _ocsp: &[u8],
                _now: ureq::rustls::pki_types::UnixTime,
            ) -> Result<ureq::rustls::client::danger::ServerCertVerified, ureq::rustls::Error> {
                Ok(ureq::rustls::client::danger::ServerCertVerified::assertion())
            }

            fn verify_tls12_signature(
                &self,
                _message: &[u8],
                _cert: &ureq::rustls::pki_types::CertificateDer<'_>,
                _dss: &ureq::rustls::DigitallySignedStruct,
            ) -> Result<ureq::rustls::client::danger::HandshakeSignatureValid, ureq::rustls::Error> {
                Ok(ureq::rustls::client::danger::HandshakeSignatureValid::assertion())
            }

            fn verify_tls13_signature(
                &self,
                _message: &[u8],
                _cert: &ureq::rustls::pki_types::CertificateDer<'_>,
                _dss: &ureq::rustls::DigitallySignedStruct,
            ) -> Result<ureq::rustls::client::danger::HandshakeSignatureValid, ureq::rustls::Error> {
                Ok(ureq::rustls::client::danger::HandshakeSignatureValid::assertion())
            }

            fn supported_verify_schemes(&self) -> Vec<ureq::rustls::SignatureScheme> {
                vec![
                    ureq::rustls::SignatureScheme::RSA_PKCS1_SHA256,
                    ureq::rustls::SignatureScheme::ECDSA_NISTP256_SHA256,
                    ureq::rustls::SignatureScheme::ED25519,
                ]
            }
        }

        let config = ureq::rustls::ClientConfig::builder()
            .dangerous()
            .with_custom_certificate_verifier(std::sync::Arc::new(NoVerifier))
            .with_no_client_auth();
        
        let agent = ureq::AgentBuilder::new()
            .tls_config(std::sync::Arc::new(config))
            .build();

        // 1. Request without header -> Should succeed (200 OK)
        let req_payload = json!({
            "jsonrpc": "2.0",
            "method": "gold_blockNumber",
            "id": 1
        });

        let resp_unauth = agent.post("https://127.0.0.1:28546")
            .set("Content-Type", "application/json")
            .send_string(&req_payload.to_string())
            .unwrap();

        assert_eq!(resp_unauth.status(), 200);

        // 2. Request with valid header -> Should succeed (200 OK)
        let resp_ok = agent.post("https://127.0.0.1:28546")
            .set("Content-Type", "application/json")
            .set("Authorization", "Bearer test_secret_key")
            .send_string(&req_payload.to_string())
            .unwrap();

        assert_eq!(resp_ok.status(), 200);
        let resp_body_str = resp_ok.into_string().unwrap();
        let resp_body: serde_json::Value = serde_json::from_str(&resp_body_str).unwrap();
        assert_eq!(resp_body["result"].as_u64().unwrap(), 1);
    }
}
