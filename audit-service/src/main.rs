use serde::{Serialize, Deserialize};
use sha2::{Sha256, Digest};
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditRecord {
    pub timestamp: String,
    pub service: String,
    pub action: String,
    pub details: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainEntry {
    pub index: u64,
    pub record: AuditRecord,
    pub previous_hash: String,
    pub hash: String,
}

pub struct AuditChain {
    entries: Vec<ChainEntry>,
}

impl AuditChain {
    pub fn new() -> Self {
        Self { entries: Vec::new() }
    }

    pub fn append(&mut self, record: AuditRecord) {
        let index = self.entries.len() as u64;
        let previous_hash = if index == 0 {
            "0000000000000000000000000000000000000000000000000000000000000000".to_string()
        } else {
            self.entries[index as usize - 1].hash.clone()
        };

        // Calculate SHA256 of payload concatenated with previous hash
        let mut hasher = Sha256::new();
        let payload_bytes = serde_json::to_vec(&record).unwrap();
        hasher.update(&payload_bytes);
        hasher.update(previous_hash.as_bytes());
        let hash = hex::encode(hasher.finalize());

        self.entries.push(ChainEntry {
            index,
            record,
            previous_hash,
            hash,
        });
    }

    pub fn verify_integrity(&self) -> Result<(), (u64, String)> {
        for i in 0..self.entries.len() {
            let entry = &self.entries[i];

            // 1. Verify previous hash link
            if i > 0 {
                let prev_entry = &self.entries[i - 1];
                if entry.previous_hash != prev_entry.hash {
                    return Err((entry.index, format!("Hash link broken: expected previous hash '{}', got '{}'", prev_entry.hash, entry.previous_hash)));
                }
            } else {
                if entry.previous_hash != "0000000000000000000000000000000000000000000000000000000000000000" {
                    return Err((entry.index, "Genesis previous hash must be zeroes".to_string()));
                }
            }

            // 2. Re-compute hash and verify integrity
            let mut hasher = Sha256::new();
            let payload_bytes = serde_json::to_vec(&entry.record).unwrap();
            hasher.update(&payload_bytes);
            hasher.update(entry.previous_hash.as_bytes());
            let computed_hash = hex::encode(hasher.finalize());

            if entry.hash != computed_hash {
                return Err((entry.index, format!("Hash mismatch: expected '{}', computed '{}'", entry.hash, computed_hash)));
            }
        }
        Ok(())
    }

    pub fn tamper_entry(&mut self, index: usize, new_action: &str) {
        if index < self.entries.len() {
            self.entries[index].record.action = new_action.to_string();
        }
    }
}

#[tokio::main]
async fn main() {
    println!("[AUDIT-SERVICE] Initializing Immutable Audit Chain...");
    let mut chain = AuditChain::new();

    chain.append(AuditRecord {
        timestamp: Utc::now().to_rfc3339(),
        service: "auth-gateway".to_string(),
        action: "USER_LOGIN_SUCCESS".to_string(),
        details: "User bunty_trader@exchange.com logged in from 192.168.1.1".to_string(),
    });

    chain.append(AuditRecord {
        timestamp: Utc::now().to_rfc3339(),
        service: "ledger-settlement".to_string(),
        action: "WITHDRAWAL_APPROVED".to_string(),
        details: "Withdrawal request W-909 of 2.5 BTC to 3J98t1Wp... approved (MFA valid)".to_string(),
    });

    chain.append(AuditRecord {
        timestamp: Utc::now().to_rfc3339(),
        service: "admin-panel".to_string(),
        action: "MANUAL_KYC_VERIFICATION_OVERRIDE".to_string(),
        details: "Admin user rakesh_bhol approved user id 102 (PAN ABCDE1234F)".to_string(),
    });

    println!("[INTEGRITY CHECK] Verifying chain integrity...");
    match chain.verify_integrity() {
        Ok(_) => println!("[VERIFIED] Audit chain is 100% integral and untampered! ✅"),
        Err((idx, err)) => println!("[TAMPER ALERT] Verification failed at index {}: {}", idx, err),
    }

    println!("\n[TAMPER DEMO] Simulating malicious database edit at index 1...");
    // Tamper with the withdrawal approval action
    chain.tamper_entry(1, "WITHDRAWAL_REJECTED");

    println!("[INTEGRITY CHECK] Re-verifying chain integrity post-tamper...");
    match chain.verify_integrity() {
        Ok(_) => println!("[VERIFIED] Audit chain is 100% integral and untampered! ✅"),
        Err((idx, err)) => println!("[TAMPER ALERT] Verification failed at index {}: {} ❌ (Audit log alteration blocked!)", idx, err),
    }
}
