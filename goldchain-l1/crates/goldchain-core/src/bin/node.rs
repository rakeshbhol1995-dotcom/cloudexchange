use std::sync::Arc;
use std::thread;
use std::time::Duration;
use std::collections::HashMap;
use std::sync::atomic::Ordering;
use goldchain_core::rpc::{start_rpc_server, RpcServerState};
use goldchain_core::block::{ChainState, elect_active_validators};
use goldchain_core::economics::EconomicsModule;
use goldchain_crypto::keys::PrivateKey;
use goldchain_crypto::address::Address;
use goldchain_crypto::hash::Hash;
use goldchain_storage::Storage;
use goldchain_types::{Block, Account};
use goldchain_core::consensus::{ConsensusState, ConsensusStep, Validator};
use goldchain_core::p2p::GossipMessage;
use serde_json::json;

#[derive(serde::Deserialize)]
struct ValidatorConfigItem {
    pubkey: goldchain_crypto::keys::PublicKey,
    voting_power: u64,
    staked_balance: u64,
}

#[derive(serde::Deserialize)]
struct ValidatorConfig {
    private_key: String,
    peers: Vec<String>,
    active_validators: Vec<ValidatorConfigItem>,
}

#[derive(Debug)]
struct NoCertificateVerification;

impl ureq::rustls::client::danger::ServerCertVerifier for NoCertificateVerification {
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

fn post_json(url: &str, body: &str) -> Result<(), String> {
    // 1. Rewrite url to make sure it starts with https://
    let https_url = if url.starts_with("http://") {
        url.replacen("http://", "https://", 1)
    } else if !url.starts_with("https://") {
        format!("https://{}", url)
    } else {
        url.to_string()
    };

    // 2. Build ureq Agent (use dangerous override only if GOLDCHAIN_INSECURE_TLS is set)
    let agent = if std::env::var("GOLDCHAIN_INSECURE_TLS").is_ok() {
        let config = ureq::rustls::ClientConfig::builder()
            .dangerous()
            .with_custom_certificate_verifier(std::sync::Arc::new(NoCertificateVerification))
            .with_no_client_auth();
        
        ureq::AgentBuilder::new()
            .tls_config(std::sync::Arc::new(config))
            .timeout(Duration::from_millis(1500))
            .build()
    } else {
        ureq::AgentBuilder::new()
            .timeout(Duration::from_millis(1500))
            .build()
    };

    // 3. Send request
    let resp = agent.post(&https_url)
        .set("Content-Type", "application/json")
        .send_string(body)
        .map_err(|e| e.to_string())?;

    if resp.status() >= 400 {
        return Err(format!("HTTP request failed with status: {}", resp.status()));
    }

    Ok(())
}

fn main() {
    let _ = rustls::crypto::ring::default_provider().install_default();
    println!("====================================================");
    println!("🛡️ GoldChain L1 Blockchain Validator Node Starting...");
    println!("====================================================");

    // Parse CLI arguments
    let args: Vec<String> = std::env::args().collect();
    let rpc_port = args.iter().position(|a| a == "--port")
        .and_then(|idx| args.get(idx + 1))
        .cloned()
        .unwrap_or_else(|| "8545".to_string());
    
    let validator_id = args.iter().position(|a| a == "--id")
        .and_then(|idx| args.get(idx + 1))
        .and_then(|val| val.parse::<usize>().ok())
        .unwrap_or(0);

    let peers_arg = args.iter().position(|a| a == "--peers")
        .and_then(|idx| args.get(idx + 1))
        .cloned();

    let config_arg = args.iter().position(|a| a == "--config")
        .and_then(|idx| args.get(idx + 1))
        .cloned();

    let rpc_addr = format!("0.0.0.0:{}", rpc_port);
    println!("🚀 Starting JSON-RPC HTTP Server on http://{} (Validator ID: {})", rpc_addr, validator_id);

    // Initialize Storage
    let db_filename = format!("goldchain_data_val_{}.redb", validator_id);
    let storage = Storage::open(&db_filename).expect("Failed to open redb ledger storage");

    // Load validator private key (must be started with --config or GOLDCHAIN_VALIDATOR_KEY)
    let mut our_key = if let Some(env_key) = std::env::var("GOLDCHAIN_VALIDATOR_KEY").ok() {
        let key_bytes = hex::decode(&env_key).expect("Invalid GOLDCHAIN_VALIDATOR_KEY hex");
        PrivateKey::from_bytes(&key_bytes).expect("Invalid GOLDCHAIN_VALIDATOR_KEY bytes")
    } else if let Some(ref config_path) = config_arg {
        let config_data = std::fs::read_to_string(config_path)
            .expect("Failed to read validator configuration file");
        let config: ValidatorConfig = serde_json::from_str(&config_data)
            .expect("Failed to parse validator configuration JSON");
        let key_bytes = hex::decode(&config.private_key)
            .expect("Invalid private key hex in configuration");
        PrivateKey::from_bytes(&key_bytes)
            .expect("Invalid private key bytes in configuration")
    } else {
        panic!("❌ Security Error: Node must be started with either --config <path> or the GOLDCHAIN_VALIDATOR_KEY environment variable. Dynamic key generation / fallback is disabled for security.");
    };
    
    let mut peers = Vec::new();
    let mut active_validators = Vec::new();
    let mut using_custom_config = false;

    if let Some(config_path) = config_arg {
        println!("📂 Loading validator configuration from: {}", config_path);
        let config_data = std::fs::read_to_string(&config_path)
            .expect("Failed to read validator configuration file");
        let config: ValidatorConfig = serde_json::from_str(&config_data)
            .expect("Failed to parse validator configuration JSON");
        
        let key_bytes = hex::decode(&config.private_key)
            .expect("Invalid private key hex in configuration");
        our_key = PrivateKey::from_bytes(&key_bytes)
            .expect("Invalid private key bytes in configuration");
        
        peers = config.peers;
        
        for item in config.active_validators {
            active_validators.push(Validator {
                pubkey: item.pubkey,
                voting_power: item.voting_power,
                staked_balance: item.staked_balance,
                is_slashed: false,
            });
        }
        using_custom_config = true;
    } else {
        // Connect peers
        if let Some(p_str) = peers_arg {
            peers = p_str.split(',').map(|s| s.to_string()).collect();
        } else {
            let docker_peers = vec![
                "http://goldchain-validator-0:8545".to_string(),
                "http://goldchain-validator-1:8545".to_string(),
                "http://goldchain-validator-2:8545".to_string(),
            ];
            let self_docker_url = format!("http://goldchain-validator-{}:8545", validator_id);
            for dp in docker_peers {
                if dp != self_docker_url {
                    peers.push(dp);
                }
            }
        }
        
        active_validators = vec![
            Validator { pubkey: our_key.public_key(), voting_power: 100, staked_balance: 5_000 * 1_000_000_000, is_slashed: false },
        ];
    }

    let our_addr = Address::from_public_key(&our_key.public_key());
    println!("🔑 Loaded Validator Credentials:");
    println!("   Bech32 Address: {}", our_addr.as_str());
    println!("🌐 Configured Consensus Peers: {:?}", peers);

    // Funded allocation: 2,100,000 GRM to governance address
    let gov_addr = goldchain_core::governance::governance_address();
    if storage.get_account(&gov_addr).unwrap().is_none() {
        let account = Account::new(2_100_000 * 1_000_000_000, 0);
        storage.put_account(&gov_addr, &account).expect("Failed to write governance genesis balance");
        println!("🏦 Initialized governance genesis allocation: 2,100,000 GRM");

        // Deploy the genesis governance WASM bytecode to the storage state
        let gov_bytecode = goldchain_core::governance::governance_wasm_bytecode();
        let mut vm = goldchain_core::vm::WasmVirtualMachine::new();
        vm.deploy_contract(gov_addr.clone(), &gov_bytecode, 500000, &storage)
            .expect("Failed to deploy genesis governance contract bytecode");
        println!("📜 Deployed genesis governance contract bytecode at {}", gov_addr.as_str());
    }

    // Pre-fund the validators so they can stake/vote
    let val_addresses = if using_custom_config {
        active_validators.iter().map(|v| Address::from_public_key(&v.pubkey)).collect()
    } else {
        vec![
            Address::from_public_key(&our_key.public_key()),
        ]
    };

    if using_custom_config {
        for (idx, addr) in val_addresses.iter().enumerate() {
            if storage.get_account(addr).unwrap().is_none() {
                let mut acct = Account::new(10_000 * 1_000_000_000, 0);
                acct.staked = active_validators[idx].staked_balance;
                storage.put_account(addr, &acct).unwrap();
                println!("💼 Initialized validator-{} balance: 10,000 GRM, staked: {} GRM", idx, acct.staked);
            }
        }
    } else {
        let addr = Address::from_public_key(&our_key.public_key());
        if storage.get_account(&addr).unwrap().is_none() {
            let mut acct = Account::new(10_000 * 1_000_000_000, 0);
            acct.staked = 5_000 * 1_000_000_000;
            storage.put_account(&addr, &acct).unwrap();
            println!("💼 Initialized validator balance: 10,000 GRM, staked: 5,000 GRM");
        }
    }

    // Initialize/update SMT with the genesis accounts!
    {
        let trie_store = goldchain_core::block::SmtDbStore {
            storage: storage.clone(),
            cache: HashMap::new(),
        };
        let mut trie = goldchain_smt::SparseMerkleTrie::new(trie_store);
        
        let mut genesis_accounts = val_addresses.clone();
        genesis_accounts.push(gov_addr.clone());
        
        for addr in genesis_accounts {
            if let Some(acct) = storage.get_account(&addr).unwrap() {
                let account_hash = Hash::digest(&borsh::to_vec(&acct).unwrap());
                let key_hash = Hash::digest(addr.as_str().as_bytes()).0;
                trie.update(key_hash, account_hash.0).unwrap();
            }
        }
        let mut raw_cache = HashMap::new();
        for (h, node) in &trie.store.cache {
            if let Ok(bytes) = borsh::to_vec(node) {
                raw_cache.insert(*h, bytes);
            }
        }
        storage.put_smt_nodes_raw(&raw_cache).unwrap();
    }

    // Initialize RPC server state
    let rpc_state = Arc::new(RpcServerState::new(1000, storage.clone()));

    // Start JSON-RPC HTTP Server in background
    let _server_handle = start_rpc_server(&rpc_addr, Arc::clone(&rpc_state));

    println!("✅ JSON-RPC Daemon successfully bound and running.");
    println!("⚙️ Validator BFT Consensus engine active.");

    // Recover current block height
    let mut height = 1;
    while let Ok(Some(_)) = storage.get_block_by_height(height) {
        height += 1;
    }
    rpc_state.current_height.store(height, Ordering::SeqCst);
    println!("⚙️ Resuming blockchain at height: H={}", height);

    // Initialize chain state
    let mut chain_state = ChainState::load_from_db(&storage).unwrap().unwrap_or_else(|| {
        let val_circulating: u64 = val_addresses.len() as u64 * 10_000 * 1_000_000_000;
        let val_staked: u64 = active_validators.iter().map(|v| v.staked_balance).sum();
        let circulating = 2_100_000 * 1_000_000_000 + val_circulating;
        let total = circulating + val_staked;
        let initial = ChainState {
            circulating_supply: circulating,
            staked_supply: val_staked,
            treasury_supply: 0,
            locked_supply: 0,
            total_supply: total,
            bridge_tvl: 0,
            vm: goldchain_core::vm::WasmVirtualMachine::new(),
        };
        initial.save_to_db(&storage).unwrap();
        initial
    });

    let economics = EconomicsModule::new(
        goldchain_core::economics::EconomicsConfig::default()
    );

    // Initialize BFT Consensus state machine
    let initial_validators = elect_active_validators(&storage).unwrap_or_else(|_| active_validators.clone());
    let mut consensus = ConsensusState::new(initial_validators);
    consensus.height = height;

    let mut block_proposal_cache: HashMap<Hash, Block> = HashMap::new();

    // BFT Consensus Loop
    loop {
        thread::sleep(Duration::from_millis(500));

        // 1. Process gossip queue from RPC server
        let messages = {
            let mut queue = rpc_state.consensus_queue.lock().unwrap();
            let msgs = queue.clone();
            queue.clear();
            msgs
        };

        for msg in messages {
            match msg {
                GossipMessage::BlockProposal { height: p_height, round: p_round, block: p_block } => {
                    if p_height == consensus.height && p_round == consensus.round {
                        if consensus.step == ConsensusStep::Propose {
                            // Verify that the proposer is the designated leader for this height and round
                            let expected_leader_idx = ((p_height - 1) as usize + p_round as usize) % consensus.validators.len();
                            let expected_leader_pubkey = &consensus.validators[expected_leader_idx].pubkey;
                            let proposer_pubkey = match p_block.header.validator.to_public_key() {
                                Ok(pk) => pk,
                                Err(_) => {
                                    println!("❌ Invalid proposer public key");
                                    continue;
                                }
                            };
                            if &proposer_pubkey != expected_leader_pubkey {
                                println!("🚨 IGNORING block proposal: sender {} is not the designated leader for height {} round {}",
                                    p_block.header.validator.as_str(), p_height, p_round);
                                continue;
                            }

                            if p_block.verify_signature().is_ok() && p_block.header.height == p_height {
                                if let Err(e) = consensus.verify_and_record_proposal(&p_block, &storage) {
                                    println!("🚨 Block proposal verification failed: {:?}", e);
                                    continue;
                                }
                                let block_hash = p_block.hash();
                                println!("🗳️ [BFT Consensus H={} R={}] Received BlockProposal from {}", p_height, p_round, p_block.header.validator.as_str());
                                
                                consensus.propose_block(block_hash).unwrap();
                                block_proposal_cache.insert(block_hash, p_block);

                                // Cast our Prevote
                                let our_vote = Some(block_hash);
                                consensus.cast_prevote(our_key.public_key(), our_vote).unwrap();

                                let prevote_msg = GossipMessage::Prevote {
                                    height: p_height,
                                    round: p_round,
                                    block_hash: our_vote,
                                    validator: our_key.public_key(),
                                };

                                for peer in &peers {
                                    let payload = json!({
                                        "jsonrpc": "2.0",
                                        "method": "gold_gossipMessage",
                                        "params": [serde_json::to_value(&prevote_msg).unwrap()],
                                        "id": 1
                                    });
                                    let _ = post_json(peer, &payload.to_string());
                                }
                            }
                        }
                    }
                }
                GossipMessage::Prevote { height: v_height, round: v_round, block_hash: v_hash, validator: v_pubkey } => {
                    if v_height == consensus.height && v_round == consensus.round {
                        let _ = consensus.cast_prevote(v_pubkey, v_hash);
                        if consensus.step == ConsensusStep::Precommit {
                            // Prevote quorum achieved! Cast Precommit
                            let our_precommit = consensus.locked_block;
                            let _ = consensus.cast_precommit(our_key.public_key(), our_precommit);

                            println!("🗳️ [BFT Consensus H={} R={}] Prevote Quorum Achieved. Casting Precommit.", v_height, v_round);

                            let precommit_msg = GossipMessage::Precommit {
                                height: v_height,
                                round: v_round,
                                block_hash: our_precommit,
                                validator: our_key.public_key(),
                            };

                            for peer in &peers {
                                let payload = json!({
                                    "jsonrpc": "2.0",
                                    "method": "gold_gossipMessage",
                                    "params": [serde_json::to_value(&precommit_msg).unwrap()],
                                    "id": 1
                                });
                                let _ = post_json(peer, &payload.to_string());
                            }
                        }
                    }
                }
                GossipMessage::Precommit { height: c_height, round: c_round, block_hash: c_hash, validator: c_pubkey } => {
                    if c_height == consensus.height && c_round == consensus.round {
                        let _ = consensus.cast_precommit(c_pubkey, c_hash);
                    }
                }
            }
        }

        // 2. Process BFT Commit trigger
        if consensus.step == ConsensusStep::Commit {
            if let Some(block_hash) = consensus.locked_block {
                if let Some(mut block) = block_proposal_cache.remove(&block_hash) {
                    let mut mempool = rpc_state.mempool.lock().unwrap();
                    match chain_state.execute_block_state_transition(&mut block, &economics, &mut mempool, &storage) {
                        Ok(_) => {
                            println!("🧱 [STAGE: COMMIT] Block #{} successfully committed to Redb ledger storage!", block.header.height);
                            println!("   - State Merkle Root: 0x{}", block.header.state_root.to_hex());
                            
                            // Persist Economic state
                            chain_state.save_to_db(&storage).unwrap();
                            
                            rpc_state.current_height.store(block.header.height + 1, Ordering::SeqCst);
                            consensus.advance_height();
                            if let Ok(new_vals) = elect_active_validators(&storage) {
                                if !new_vals.is_empty() {
                                    consensus.validators = new_vals;
                                }
                            }
                            height = consensus.height;
                            println!("   - Next Consensus Round height advanced to H={}", height);
                        }
                        Err(e) => {
                            println!("❌ [CONSENSUS] State transition execution failed for Block #{}: {:?}", height, e);
                            consensus.advance_round();
                        }
                    }
                }
            }
        }

        // 3. Proposer Block Packaging & Broadcast
        let leader_idx = ((consensus.height - 1) as usize + consensus.round as usize) % consensus.validators.len();
        let is_leader = consensus.validators.get(leader_idx)
            .map(|v| v.pubkey == our_key.public_key())
            .unwrap_or(false);
        if is_leader && consensus.step == ConsensusStep::Propose {
            let pending_txs = {
                let mempool = rpc_state.mempool.lock().unwrap();
                mempool.get_transactions_for_block(10)
            };

            if !pending_txs.is_empty() {
                println!("\n----------------------------------------------------");
                println!("⛏️ [CONSENSUS Height {}] Packaging {} transaction(s)...", consensus.height, pending_txs.len());
                println!("👑 We are leader proposer!");

                let hashes: Vec<Hash> = pending_txs.iter().map(|t| t.hash()).collect();
                {
                    let mut mempool = rpc_state.mempool.lock().unwrap();
                    mempool.remove_txs(&hashes);
                }

                let prev_block_hash = if consensus.height == 1 {
                    Hash([0u8; 32])
                } else {
                    storage.get_block_by_height(consensus.height - 1).unwrap().unwrap().hash()
                };

                let mut block = Block::new(
                    consensus.height,
                    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64,
                    prev_block_hash,
                    Hash([0u8; 32]), // computed by execute_block_state_transition
                    our_addr.clone(),
                    pending_txs,
                );

                let mut mempool = rpc_state.mempool.lock().unwrap();
                match chain_state.execute_block_state_transition(&mut block, &economics, &mut mempool, &storage) {
                    Ok(_) => {
                        block.sign(&our_key);
                        let block_hash = block.hash();

                        consensus.propose_block(block_hash).unwrap();
                        block_proposal_cache.insert(block_hash, block.clone());

                        // Cast local Prevote
                        let our_vote = Some(block_hash);
                        consensus.cast_prevote(our_key.public_key(), our_vote).unwrap();

                        // Gossip proposal and prevote to consensus mesh
                        let prop_msg = GossipMessage::BlockProposal {
                            height: consensus.height,
                            round: consensus.round,
                            block: block.clone(),
                        };
                        let prevote_msg = GossipMessage::Prevote {
                            height: consensus.height,
                            round: consensus.round,
                            block_hash: our_vote,
                            validator: our_key.public_key(),
                        };

                        for peer in &peers {
                            let payload_prop = json!({
                                "jsonrpc": "2.0",
                                "method": "gold_gossipMessage",
                                "params": [serde_json::to_value(&prop_msg).unwrap()],
                                "id": 1
                            });
                            let payload_vote = json!({
                                "jsonrpc": "2.0",
                                "method": "gold_gossipMessage",
                                "params": [serde_json::to_value(&prevote_msg).unwrap()],
                                "id": 1
                            });
                            let _ = post_json(peer, &payload_prop.to_string());
                            let _ = post_json(peer, &payload_vote.to_string());
                        }
                    }
                    Err(e) => {
                        println!("❌ [Propose] Local state transition failed: {:?}", e);
                    }
                }
                println!("----------------------------------------------------");
            }
        }
    }
}
