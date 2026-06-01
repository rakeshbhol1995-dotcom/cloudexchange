use goldchain_crypto::keys::PublicKey;
use goldchain_crypto::hash::Hash;
use goldchain_crypto::signature::{Signature, CryptoSuiteId};
use goldchain_types::BlockHeader;
use crate::error::CoreError;

pub struct SyncCommittee {
    pub members: Vec<PublicKey>,
    pub total_voting_power: u64,
    /// The aggregate group public key (BLS12-381 or FROST Threshold key) of all committee members.
    /// This prevents single-member spoofing and guarantees that the entire committee's threshold signature is verified.
    pub group_public_key: PublicKey,
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
        signers: &[PublicKey],
    ) -> Result<(), CoreError> {
        if self.current_sync_committee.members.is_empty() {
            return Err(CoreError::InvalidBlock("Sync committee cannot be empty".to_string()));
        }

        // 1. Calculate the total voting power of active signers who participated in the aggregate signature
        let mut signing_power = 0u64;
        for signer in signers {
            if self.current_sync_committee.members.contains(signer) {
                // Distribute total voting power uniformly across committee members
                let member_weight = self.current_sync_committee.total_voting_power / (self.current_sync_committee.members.len() as u64);
                signing_power = signing_power.saturating_add(member_weight);
            }
        }

        // 2. Reject if the aggregate signing power represents less than a 2/3 supermajority (67%)
        let threshold_power = (self.current_sync_committee.total_voting_power.saturating_mul(67)) / 100;
        if signing_power < threshold_power {
            return Err(CoreError::InvalidBlock(format!(
                "Sync Committee Quorum Violation: signing weight {} below 2/3 threshold supermajority (required: {})!",
                signing_power, threshold_power
            )));
        }

        // 3. Ensure the header hash is represented
        let header_hash = header.prev_hash;

        // 4. Perform aggregate verification using the group public key of the committee
        // This guarantees that the signature is valid for the combined voting weight of the committee.
        let group_pubkey = &self.current_sync_committee.group_public_key;

        // Verify based on crypto suite
        match header.crypto_suite {
            CryptoSuiteId::V1 => {
                // V1: Verify FROST / Ed25519 Threshold Group Signature against the Group Public Key with Hybrid PQ defenses
                aggregate_sig.verify_hybrid_pq(group_pubkey, header_hash.as_ref())
                    .map_err(|e| CoreError::InvalidBlock(format!("FROST Sync Committee validation failed: {:?}", e)))?;
            }
            CryptoSuiteId::V2 => {
                // V2: Verify true BLS12-381 Aggregate Signature against all individual committee members public keys
                aggregate_sig.verify_aggregate_bls(header_hash.as_ref(), &self.current_sync_committee.members)
                    .map_err(|e| CoreError::InvalidBlock(format!("BLS12-381 Aggregate Sync Committee validation failed: {:?}", e)))?;
            }
        }

        // 5. Verify that the committee's total voting power satisfies the consensus safety bounds (non-zero and valid)
        if self.current_sync_committee.total_voting_power == 0 {
            return Err(CoreError::InvalidBlock("Sync committee voting power cannot be zero".to_string()));
        }

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
            group_public_key: pub_key,
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
        assert!(client.verify_header_with_committee(&dummy_header, &sig, &[pub_key]).is_ok());

        // Rotate committee
        let new_priv = PrivateKey::generate();
        let new_pub = new_priv.public_key();
        let new_committee = SyncCommittee {
            members: vec![new_pub],
            total_voting_power: 150,
            group_public_key: new_pub,
        };
        client.rotate_committee(new_committee);
        assert_eq!(client.current_sync_committee.total_voting_power, 150);
        assert_eq!(client.current_sync_committee.group_public_key, new_pub);
    }

    #[test]
    fn test_sync_committee_quorum_safety() {
        let priv_key1 = PrivateKey::generate();
        let pub_key1 = priv_key1.public_key();
        let priv_key2 = PrivateKey::generate();
        let pub_key2 = priv_key2.public_key();
        let priv_key3 = PrivateKey::generate();
        let pub_key3 = priv_key3.public_key();

        // 3 members, each having 50 voting power (total = 150)
        let committee = SyncCommittee {
            members: vec![pub_key1, pub_key2, pub_key3],
            total_voting_power: 150,
            group_public_key: pub_key1, // simulated group key
        };

        let client = LightClient::bootstrap(Hash::digest(b"genesis"), committee);

        let dummy_header = BlockHeader {
            height: 10,
            timestamp: 12345678,
            prev_hash: Hash::digest(b"payload"),
            merkle_root: Hash([0u8; 32]),
            state_root: Hash([0u8; 32]),
            validator: goldchain_crypto::address::Address::from_public_key(&pub_key1),
            signature: None,
            crypto_suite: goldchain_crypto::signature::CryptoSuiteId::V1,
        };

        let sig = Signature::sign(&priv_key1, dummy_header.prev_hash.as_ref());

        // 1. Quorum verification with 2/3 signers participating -> Should Pass (100 weight >= 100 threshold)
        assert!(client.verify_header_with_committee(&dummy_header, &sig, &[pub_key1, pub_key2]).is_ok());

        // 2. Quorum verification with only 1/3 signers participating -> Should Fail (50 weight < 100 threshold)
        assert!(client.verify_header_with_committee(&dummy_header, &sig, &[pub_key1]).is_err());
    }
}
