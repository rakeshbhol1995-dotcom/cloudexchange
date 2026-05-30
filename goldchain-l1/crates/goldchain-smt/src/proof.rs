use serde::{Serialize, Deserialize};
use borsh::{BorshSerialize, BorshDeserialize};

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct SmtProof {
    pub key: [u8; 32],
    pub value_hash: [u8; 32],
    pub actual_key: [u8; 32],
    pub actual_value: [u8; 32],
    pub siblings: Vec<[u8; 32]>,
}

impl SmtProof {
    /// Verifies the Merkle Proof against a given root hash
    pub fn verify(&self, root: &[u8; 32]) -> bool {
        if self.siblings.len() != 256 {
            return false;
        }

        // 1. Calculate starting leaf node hash
        let mut current = if self.actual_key == [0u8; 32] && self.actual_value == [0u8; 32] {
            [0u8; 32]
        } else {
            Self::hash_leaf(&self.actual_key, &self.actual_value)
        };

        // 2. Compute path up to root
        for i in 0..256 {
            let sibling = self.siblings[i];
            let bit = Self::get_bit(&self.actual_key, 255 - i);
            if bit {
                current = Self::hash_branch(&sibling, &current);
            } else {
                current = Self::hash_branch(&current, &sibling);
            }
        }

        // 3. Verify root hash matches
        if &current != root {
            return false;
        }

        // 4. Verify membership or non-membership claim
        if self.value_hash == [0u8; 32] {
            // Non-membership claim: the key should not match the actual_key
            self.actual_key != self.key
        } else {
            // Membership claim: key and value must match
            self.actual_key == self.key && self.actual_value == self.value_hash
        }
    }

    fn get_bit(key: &[u8; 32], bit_idx: usize) -> bool {
        let byte_idx = bit_idx / 8;
        let bit_offset = 7 - (bit_idx % 8);
        (key[byte_idx] & (1 << bit_offset)) != 0
    }

    fn hash_branch(left: &[u8; 32], right: &[u8; 32]) -> [u8; 32] {
        let mut hasher = blake3::Hasher::new();
        hasher.update(left);
        hasher.update(right);
        *hasher.finalize().as_bytes()
    }

    fn hash_leaf(key: &[u8; 32], value_hash: &[u8; 32]) -> [u8; 32] {
        let mut hasher = blake3::Hasher::new();
        hasher.update(b"leaf");
        hasher.update(key);
        hasher.update(value_hash);
        *hasher.finalize().as_bytes()
    }
}
