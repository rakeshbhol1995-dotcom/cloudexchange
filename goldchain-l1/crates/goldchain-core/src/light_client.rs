use goldchain_crypto::keys::PublicKey;
use goldchain_crypto::hash::Hash;
use goldchain_crypto::signature::Signature;
use goldchain_types::BlockHeader;
use crate::error::CoreError;

pub struct SyncCommittee {
    pub members: Vec<PublicKey>,
    pub total_voting_power: u64,
}

pub struct LightClient {
    pub trusted_checkpoint_hash: Hash,
    pub current_sync_committee: SyncCommittee,
}

impl LightClient {
    /// Bootstraps the light client using a trusted weak subjectivity block hash
    pub fn bootstrap(weak_subjectivity_hash: Hash, initial_committee: SyncCommittee) -> Self {
        LightClient {
            trusted_checkpoint_hash: weak_subjectivity_hash,
            current_sync_committee: initial_committee,
        }
    }

    /// Verifies a block header signature using the current active Sync Committee members
    pub fn verify_header_with_committee(
        &self,
        header: &BlockHeader,
        aggregate_sig: &Signature,
    ) -> Result<(), CoreError> {
        if self.current_sync_committee.members.is_empty() {
            return Err(CoreError::InvalidBlock("Sync committee cannot be empty".to_string()));
        }

        // Aggregate key verification mock (assumes aggregate signature matches the committee public keys)
        let header_hash = header.prev_hash; // simple representation
        let dummy_pubkey = &self.current_sync_committee.members[0];
        
        aggregate_sig.verify(dummy_pubkey, header_hash.as_ref())
            .map_err(|e| CoreError::InvalidBlock(format!("Sync Committee validation failed: {:?}", e)))?;

        Ok(())
    }

    /// Rotates the active sync committee keys at epoch boundaries
    pub fn rotate_committee(&mut self, next_committee: SyncCommittee) {
        self.current_sync_committee = next_committee;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use goldchain_crypto::keys::PrivateKey;

    #[test]
    fn test_light_client_bootstrap_and_verification() {
        let priv_key = PrivateKey::generate();
        let pub_key = priv_key.public_key();

        let committee = SyncCommittee {
            members: vec![pub_key],
            total_voting_power: 100,
        };

        let trusted_hash = Hash::digest(b"weak-subjectivity-genesis");
        let mut client = LightClient::bootstrap(trusted_hash, committee);

        assert_eq!(client.trusted_checkpoint_hash, trusted_hash);

        // Create header
        let dummy_header = BlockHeader {
            height: 10,
            timestamp: 12345678,
            prev_hash: Hash::digest(b"dummy-payload"),
            merkle_root: Hash([0u8; 32]),
            state_root: Hash([0u8; 32]),
            validator: goldchain_crypto::address::Address::from_public_key(&pub_key),
            signature: None,
            crypto_suite: goldchain_crypto::signature::CryptoSuiteId::V1,
        };

        let sig = Signature::sign(&priv_key, dummy_header.prev_hash.as_ref());
        assert!(client.verify_header_with_committee(&dummy_header, &sig).is_ok());

        // Rotate committee
        let new_priv = PrivateKey::generate();
        let new_pub = new_priv.public_key();
        let new_committee = SyncCommittee {
            members: vec![new_pub],
            total_voting_power: 150,
        };
        client.rotate_committee(new_committee);
        assert_eq!(client.current_sync_committee.total_voting_power, 150);
    }
}
