use goldchain_crypto::keys::PublicKey;
use goldchain_crypto::hash::Hash;
use goldchain_crypto::signature::Signature;
use crate::error::CoreError;

pub struct EmergencyRecoveryCommittee {
    pub members: Vec<PublicKey>,
    pub required_signatures: usize,
}

pub struct EmergencyProposal {
    pub proposal_id: Hash,
    pub created_timestamp: u64,
    pub executed: bool,
}

impl EmergencyRecoveryCommittee {
    pub fn new(members: Vec<PublicKey>) -> Self {
        EmergencyRecoveryCommittee {
            members,
            required_signatures: 5, // Enforce 5-of-7 rule
        }
    }

    /// Verifies 5-of-7 signatures from committee members on the target proposal hash
    pub fn verify_signatures(
        &self,
        proposal_hash: &Hash,
        signatures: &[(PublicKey, Signature)],
    ) -> Result<(), CoreError> {
        if signatures.len() < self.required_signatures {
            return Err(CoreError::InvalidTransaction(format!(
                "Insufficient emergency signatures: expected {}, got {}",
                self.required_signatures,
                signatures.len()
            )));
        }

        let mut verified_count = 0;
        for (pubkey, sig) in signatures {
            if self.members.contains(pubkey) {
                if sig.verify(pubkey, proposal_hash.as_ref()).is_ok() {
                    verified_count += 1;
                }
            }
        }

        if verified_count < self.required_signatures {
            return Err(CoreError::InvalidTransaction("Signature validation failed for emergency committee".to_string()));
        }

        Ok(())
    }

    /// Enforces that the ERC authority window is active (max 14 days from activation block time)
    pub fn verify_authority_expiry(&self, activation_time: u64, current_time: u64) -> Result<(), CoreError> {
        let active_duration = current_time.saturating_sub(activation_time);
        let fourteen_days_in_seconds = 14 * 24 * 60 * 60; // 1,209,600 seconds
        if active_duration > fourteen_days_in_seconds {
            return Err(CoreError::InvalidTransaction(
                "ERC authority window expired (exceeded 14-day emergency window limit)".to_string(),
            ));
        }
        Ok(())
    }

    /// Verifies that the emergency proposal execution satisfies the 12-hour timelock delay requirement
    pub fn verify_timelock_delay(&self, proposal: &EmergencyProposal, current_time: u64) -> Result<(), CoreError> {
        let delay = current_time.saturating_sub(proposal.created_timestamp);
        let twelve_hours_in_seconds = 12 * 60 * 60; // 43,200 seconds
        if delay < twelve_hours_in_seconds {
            return Err(CoreError::InvalidTransaction(format!(
                "Emergency proposal timelock active: remaining delay {} seconds",
                twelve_hours_in_seconds - delay
            )));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use goldchain_crypto::keys::PrivateKey;

    #[test]
    fn test_erc_multisig_verification() {
        let mut members = Vec::new();
        let mut priv_keys = Vec::new();
        for _ in 0..7 {
            let priv_k = PrivateKey::generate();
            members.push(priv_k.public_key());
            priv_keys.push(priv_k);
        }

        let committee = EmergencyRecoveryCommittee::new(members);
        let proposal_hash = Hash::digest(b"emergency-upgrade-runtime");

        // Generate 5 signatures
        let mut signatures = Vec::new();
        for priv_k in &priv_keys[0..5] {
            let sig = Signature::sign(priv_k, proposal_hash.as_ref());
            signatures.push((priv_k.public_key(), sig));
        }

        assert!(committee.verify_signatures(&proposal_hash, &signatures).is_ok());

        // Generate 4 signatures (insufficient quorum)
        assert!(committee.verify_signatures(&proposal_hash, &signatures[0..4]).is_err());
    }

    #[test]
    fn test_erc_authority_expiry() {
        let committee = EmergencyRecoveryCommittee::new(vec![]);
        // Active for 5 days => OK
        assert!(committee.verify_authority_expiry(1000, 1000 + 5 * 24 * 3600).is_ok());
        // Active for 15 days => Err
        assert!(committee.verify_authority_expiry(1000, 1000 + 15 * 24 * 3600).is_err());
    }

    #[test]
    fn test_proposal_timelock_delay() {
        let committee = EmergencyRecoveryCommittee::new(vec![]);
        let proposal = EmergencyProposal {
            proposal_id: Hash::digest(b"p1"),
            created_timestamp: 100000,
            executed: false,
        };

        // Try executing after 5 hours (18000 seconds) => Err
        assert!(committee.verify_timelock_delay(&proposal, 100000 + 18000).is_err());
        // Try executing after 13 hours (46800 seconds) => OK
        assert!(committee.verify_timelock_delay(&proposal, 100000 + 46800).is_ok());
    }
}
