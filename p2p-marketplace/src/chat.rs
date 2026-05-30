use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct EncryptedChatMessage {
    pub message_id: u64,
    pub sender: String,
    pub ciphertext_hex: String,
    pub signature_hex: String,
}

pub struct P2PChatSession {
    pub session_id: String,
    pub buyer_id: String,
    pub seller_id: String,
    buyer_dh_private: u64,
    seller_dh_private: u64,
    shared_secret: u64, // Derived Diffie-Hellman secret key
    message_store: Vec<EncryptedChatMessage>,
}

impl P2PChatSession {
    pub fn new(session_id: String, buyer_id: String, seller_id: String) -> Self {
        // Simulating Diffie-Hellman Key Exchange (base g = 5, prime p = 97)
        let g: u64 = 5;
        let p: u64 = 97;

        // Private keys
        let buyer_private = 6;
        let seller_private = 15;

        // Compute Public keys
        let buyer_public = g.pow(buyer_private as u32) % p; // A = g^a mod p
        let seller_public = g.pow(seller_private as u32) % p; // B = g^b mod p

        // Derive Shared Secret
        let buyer_secret = seller_public.pow(buyer_private as u32) % p; // s = B^a mod p
        let seller_secret = buyer_public.pow(seller_private as u32) % p; // s = A^b mod p

        assert_eq!(buyer_secret, seller_secret, "Diffie-Hellman key exchange failed!");

        Self {
            session_id,
            buyer_id,
            seller_id,
            buyer_dh_private: buyer_private,
            seller_dh_private: seller_private,
            shared_secret: buyer_secret,
            message_store: Vec::new(),
        }
    }

    /// Simulates E2E message encryption using derived shared secret (Caesar shift representation for clarity)
    pub fn encrypt(&self, plain_text: &str) -> String {
        let shift = (self.shared_secret % 26) as u8;
        plain_text
            .chars()
            .map(|c| {
                if c.is_ascii_alphabetic() {
                    let first = if c.is_ascii_uppercase() { b'A' } else { b'a' };
                    (((c as u8 - first + shift) % 26) + first) as char
                } else {
                    c
                }
            })
            .collect()
    }

    /// Simulates E2E message decryption using derived shared secret
    pub fn decrypt(&self, cipher_text: &str) -> String {
        let shift = (self.shared_secret % 26) as u8;
        cipher_text
            .chars()
            .map(|c| {
                if c.is_ascii_alphabetic() {
                    let first = if c.is_ascii_uppercase() { b'A' } else { b'a' };
                    // Handle negative wrap-around in subtraction
                    let shifted = (c as i16 - first as i16 - shift as i16) % 26;
                    let final_shift = if shifted < 0 { shifted + 26 } else { shifted };
                    ((final_shift as u8 + first) as char)
                } else {
                    c
                }
            })
            .collect()
    }

    /// Send a message from a user in the chat
    pub fn send_message(&mut self, sender: String, plain_text: &str) -> Result<(), String> {
        if sender != self.buyer_id && sender != self.seller_id {
            return Err("Sender is not a member of this chat session".to_string());
        }

        let ciphertext_hex = self.encrypt(plain_text);
        
        // Dynamic mock signature to prove non-repudiation
        let signature_hex = format!("sig_{}_sha256_{}", sender, Math_mock_hash(&ciphertext_hex));

        let msg = EncryptedChatMessage {
            message_id: self.message_store.len() as u64 + 1,
            sender: sender.clone(),
            ciphertext_hex: ciphertext_hex.clone(),
            signature_hex,
        };

        println!(
            "[E2E P2P Chat] Sent from {}: Raw: '{}' | Ciphertext: '{}'",
            sender, plain_text, ciphertext_hex
        );

        self.message_store.push(msg);
        Ok(())
    }

    /// Decrypts and prints the entire chat log history
    pub fn print_chat_log(&self) {
        println!("\n--- Encrypted Message Board (Session: {}) ---", self.session_id);
        for msg in &self.message_store {
            let decrypted = self.decrypt(&msg.ciphertext_hex);
            println!(
                "  [{}] {}: {}  (Verify Signature: {})",
                msg.message_id, msg.sender, decrypted, msg.signature_hex
            );
        }
        println!("--------------------------------------------------");
    }
}

fn Math_mock_hash(input: &str) -> String {
    let mut sum: u32 = 0;
    for c in input.chars() {
        sum = sum.wrapping_add(c as u32);
    }
    format!("{:x}", sum)
}
