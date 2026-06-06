use goldchain_crypto::keys::PrivateKey;
use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Serialize, Clone)]
struct ValidatorConfigItem {
    pubkey: goldchain_crypto::keys::PublicKey,
    voting_power: u64,
    staked_balance: u64,
}

#[derive(Serialize)]
struct ValidatorConfig {
    private_key: String,
    peers: Vec<String>,
    active_validators: Vec<ValidatorConfigItem>,
}

fn main() {
    let _ = rustls::crypto::ring::default_provider().install_default();
    println!("⚙️ Generating validator config files for AWS Terraform deployment...");

    let configs_dir = Path::new("devops/terraform/configs");
    fs::create_dir_all(configs_dir).expect("Failed to create configs directory");

    // 1. Generate 3 keys
    let mut private_keys = Vec::new();
    let mut public_keys = Vec::new();

    for _ in 0..3 {
        let priv_key = PrivateKey::generate();
        let pub_key = priv_key.public_key();
        private_keys.push(hex::encode(priv_key.to_bytes()));
        public_keys.push(pub_key);
    }

    // 2. Build active validators list
    let mut active_validators = Vec::new();
    for i in 0..3 {
        active_validators.push(ValidatorConfigItem {
            pubkey: public_keys[i],
            voting_power: 100,
            staked_balance: 5_000 * 1_000_000_000,
        });
    }

    // 3. Static IPs for nodes
    let ips = vec![
        "10.0.1.10".to_string(),
        "10.0.1.11".to_string(),
        "10.0.1.12".to_string(),
    ];

    // 4. Write config JSON for each validator
    for i in 0..3 {
        let mut peers = Vec::new();
        for j in 0..3 {
            if i != j {
                peers.push(format!("https://{}:8545", ips[j]));
            }
        }

        let config = ValidatorConfig {
            private_key: private_keys[i].clone(),
            peers,
            active_validators: active_validators.clone(),
        };

        let json_content = serde_json::to_string_pretty(&config).unwrap();
        let file_path = configs_dir.join(format!("config-{}.json", i));
        fs::write(&file_path, json_content).expect("Failed to write config file");
        println!("📝 Generated config file: {:?}", file_path);
    }

    println!("✅ All validator configurations generated successfully!");
}
