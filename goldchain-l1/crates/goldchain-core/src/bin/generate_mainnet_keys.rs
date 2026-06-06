use goldchain_crypto::keys::PrivateKey;

fn main() {
    let _ = rustls::crypto::ring::default_provider().install_default();
    println!("Generating 3 secure validator key pairs...");
    for i in 0..3 {
        let priv_key = PrivateKey::generate();
        let pub_key = priv_key.public_key();
        println!("Validator {}:", i);
        println!("  PRIVATE_KEY (hex): {}", hex::encode(priv_key.to_bytes()));
        println!("  PUBLIC_KEY (hex):  {}", hex::encode(pub_key.to_bytes()));
    }
}
