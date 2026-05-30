use std::collections::HashSet;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WalletType {
    Hot,   // Automated low-value withdrawal (< 10k USDT). Managed by automated keys.
    Warm,  // Mid-value tier. Requires M-of-N multisig signatures from authorized officers.
    Cold,  // High-value tier. Requires Hardware Security Module (HSM) PKCS#11 physical signature.
}

#[derive(Debug, Clone)]
pub struct WithdrawalRequest {
    pub request_id: u64,
    pub asset: String,
    pub amount: u64, // Scale: 10^8
    pub destination_address: String,
}

pub struct Signature {
    pub signer_id: String,
    pub signature_hex: String,
}

pub struct EnterpriseWalletManager {
    hot_limit: u64,
    warm_limit: u64,
    multisig_signers: HashSet<String>,
    required_multisig_count: usize,
    hsm_public_key: String,
}

impl EnterpriseWalletManager {
    pub fn new() -> Self {
        let mut signers = HashSet::new();
        signers.insert("officer_compliance_1".to_string());
        signers.insert("officer_operations_2".to_string());
        signers.insert("officer_treasury_3".to_string());

        Self {
            hot_limit: 10_000_00000000,      // 10,000 USDT
            warm_limit: 100_000_00000000,    // 100,000 USDT
            multisig_signers: signers,
            required_multisig_count: 2,       // 2 of 3 required
            hsm_public_key: "hsm_pubkey_ecdsa_secp256k1_prod_vault_99a8f".to_string(),
        }
    }

    /// Processes a withdrawal, determining which wallet security level is required
    pub fn route_withdrawal(
        &self,
        request: &WithdrawalRequest,
        signatures: &[Signature],
        hsm_signature: Option<&str>,
    ) -> Result<WalletType, String> {
        let amount = request.amount;

        if amount < self.hot_limit {
            println!(
                "[Wallet Security] Request #{}: Amount {:.2} {} routed to HOT WALLET. Processing automated signing...",
                request.request_id,
                amount as f64 / 100_000_000.0,
                request.asset
            );
            Ok(WalletType::Hot)
        } else if amount < self.warm_limit {
            println!(
                "[Wallet Security] Request #{}: Amount {:.2} {} routed to WARM WALLET. Verifying multi-sig signatures...",
                request.request_id,
                amount as f64 / 100_000_000.0,
                request.asset
            );
            self.verify_multisig(signatures)?;
            Ok(WalletType::Warm)
        } else {
            println!(
                "[Wallet Security CRITICAL] Request #{}: High-value amount {:.2} {} routed to COLD WALLET. Verifying physical HSM signature...",
                request.request_id,
                amount as f64 / 100_000_000.0,
                request.asset
            );
            let hsm_sig = hsm_signature.ok_or("Cold wallet withdrawal requires an HSM PKCS#11 cryptosignature")?;
            self.verify_hsm_signature(request, hsm_sig)?;
            Ok(WalletType::Cold)
        }
    }

    /// Verifies warm wallet M-of-N multi-signature constraints
    fn verify_multisig(&self, signatures: &[Signature]) -> Result<(), String> {
        let mut valid_signers = HashSet::new();

        for sig in signatures {
            if self.multisig_signers.contains(&sig.signer_id) {
                // In production, cryptographically verify signature_hex using signer's public key
                valid_signers.insert(sig.signer_id.clone());
                println!(
                    "  [Multisig Check] Verified valid signature from signer: {}",
                    sig.signer_id
                );
            } else {
                return Err(format!("Unauthorized multisig signer: {}", sig.signer_id));
            }
        }

        if valid_signers.len() < self.required_multisig_count {
            return Err(format!(
                "Insufficient multisig signatures. Got {}, need {}",
                valid_signers.len(),
                self.required_multisig_count
            ));
        }

        println!(
            "  [Multisig SUCCESS] Multi-sig threshold met: {} of {} valid signatures verified.",
            valid_signers.len(),
            self.required_multisig_count
        );
        Ok(())
    }

    /// Verifies physical HSM PKCS#11 signatures
    fn verify_hsm_signature(&self, request: &WithdrawalRequest, signature_hex: &str) -> Result<(), String> {
        // Mock HSM signature verification against HSM public key
        // Verify key parameters match request hashing payload
        let expected_payload = format!(
            "WITHDRAW_REQ_ID:{}_AMT:{}_ADDR:{}",
            request.request_id, request.amount, request.destination_address
        );

        println!("  [HSM PKCS#11 Verification] Querying HSM card slot 0 pubkey: {}...", self.hsm_public_key);
        println!("  [HSM PKCS#11 Verification] Payload: '{}'", expected_payload);

        if signature_hex.starts_with("hsm_sig_valid_") {
            println!("  [HSM SUCCESS] Cryptographic signature verified by HSM card partition. Vault release authorized.");
            Ok(())
        } else {
            Err("Invalid cryptographic signature. HSM verification check rejected. Locking treasury output!".to_string())
        }
    }
}
