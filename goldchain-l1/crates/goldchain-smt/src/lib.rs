pub mod store;
pub mod proof;

pub use store::{Node, NodeStore, MemoryNodeStore};
pub use proof::SmtProof;

pub struct SparseMerkleTrie<S: NodeStore> {
    root: [u8; 32],
    store: S,
    default_hashes: [[u8; 32]; 257],
}

impl<S: NodeStore> SparseMerkleTrie<S> {
    /// Creates a new Sparse Merkle Trie with a given store
    pub fn new(store: S) -> Self {
        let mut default_hashes = [[0u8; 32]; 257];
        // level 0 default hash is all zeros
        for i in 0..256 {
            default_hashes[i + 1] = Self::hash_branch(&default_hashes[i], &default_hashes[i]);
        }
        let root = default_hashes[256];
        SparseMerkleTrie { root, store, default_hashes }
    }

    /// Gets the current state root hash of the Trie
    pub fn root(&self) -> [u8; 32] {
        self.root
    }

    /// Updates the value at the given key and returns the new root hash
    pub fn update(&mut self, key: [u8; 32], value_hash: [u8; 32]) -> Result<[u8; 32], String> {
        let new_root = self.update_recursive(self.root, 256, &key, &value_hash)?;
        self.root = new_root;
        Ok(new_root)
    }

    /// Generates a Sparse Merkle membership/non-membership proof for a key
    pub fn prove(&self, key: [u8; 32]) -> Result<SmtProof, String> {
        let mut siblings = Vec::new();
        self.prove_recursive(self.root, 256, &key, &mut siblings)?;
        // The collected siblings are ordered from root down to leaf.
        // We reverse them so they are ordered from leaf up to root (level 0 to level 255).
        siblings.reverse();

        // Determine the actual key and value at this path to include in the proof
        let (actual_key, actual_value) = self.get_leaf_details(self.root, 256, &key)?;

        Ok(SmtProof {
            key,
            value_hash: self.get(&key).unwrap_or([0u8; 32]),
            actual_key,
            actual_value,
            siblings,
        })
    }

    /// Helper to get the value hash for a key directly
    pub fn get(&self, key: &[u8; 32]) -> Result<[u8; 32], String> {
        let (actual_key, actual_value) = self.get_leaf_details(self.root, 256, key)?;
        if &actual_key == key {
            Ok(actual_value)
        } else {
            Ok([0u8; 32])
        }
    }

    // --- Private Helper Methods ---

    fn get_leaf_details(&self, current_hash: [u8; 32], depth: usize, key: &[u8; 32]) -> Result<([u8; 32], [u8; 32]), String> {
        if current_hash == self.default_hashes[depth] {
            return Ok(([0u8; 32], [0u8; 32]));
        }

        let node = self.store.get(&current_hash).ok_or_else(|| {
            format!("Node not found in store: {:?}", current_hash)
        })?;

        match node {
            Node::Leaf { key: k, value_hash: v } => Ok((k, v)),
            Node::Branch { left, right } => {
                let bit_index = 256 - depth;
                let bit = Self::get_bit(key, bit_index);
                if bit {
                    self.get_leaf_details(right, depth - 1, key)
                } else {
                    self.get_leaf_details(left, depth - 1, key)
                }
            }
        }
    }

    fn calculate_leaf_hash(
        key: &[u8; 32],
        value_hash: &[u8; 32],
        default_hashes: &[[u8; 32]; 257],
        depth: usize,
    ) -> [u8; 32] {
        let mut current = Self::hash_leaf(key, value_hash);
        for d in 0..depth {
            let sibling = default_hashes[d];
            let bit = Self::get_bit(key, 255 - d);
            if bit {
                current = Self::hash_branch(&sibling, &current);
            } else {
                current = Self::hash_branch(&current, &sibling);
            }
        }
        current
    }

    fn update_recursive(
        &mut self,
        current_hash: [u8; 32],
        depth: usize,
        key: &[u8; 32],
        value_hash: &[u8; 32],
    ) -> Result<[u8; 32], String> {
        if depth == 0 {
            if value_hash == &[0u8; 32] {
                return Ok(self.default_hashes[0]);
            }
            let leaf = Node::Leaf {
                key: *key,
                value_hash: *value_hash,
            };
            let hash = Self::hash_leaf(key, value_hash);
            self.store.put(hash, leaf);
            return Ok(hash);
        }

        let default_hash = self.default_hashes[depth];

        if current_hash == default_hash {
            if value_hash == &[0u8; 32] {
                return Ok(default_hash);
            }
            let leaf = Node::Leaf {
                key: *key,
                value_hash: *value_hash,
            };
            let hash = Self::calculate_leaf_hash(key, value_hash, &self.default_hashes, depth);
            self.store.put(hash, leaf);
            return Ok(hash);
        }

        let node = self.store.get(&current_hash).ok_or_else(|| {
            format!("Node not found in store: {:?}", current_hash)
        })?;

        match node {
            Node::Leaf { key: existing_key, value_hash: existing_value } => {
                if &existing_key == key {
                    if value_hash == &[0u8; 32] {
                        return Ok(self.default_hashes[depth]);
                    }
                    let leaf = Node::Leaf {
                        key: *key,
                        value_hash: *value_hash,
                    };
                    let hash = Self::calculate_leaf_hash(key, value_hash, &self.default_hashes, depth);
                    self.store.put(hash, leaf);
                    return Ok(hash);
                } else {
                    if value_hash == &[0u8; 32] {
                        return Ok(current_hash);
                    }
                    let bit_index = 256 - depth;
                    let existing_bit = Self::get_bit(&existing_key, bit_index);
                    let new_bit = Self::get_bit(key, bit_index);

                    let (mut left, mut right) = (self.default_hashes[depth - 1], self.default_hashes[depth - 1]);
                    
                    // Recalculate existing leaf hash at one level down (depth - 1)
                    let new_existing_hash = Self::calculate_leaf_hash(&existing_key, &existing_value, &self.default_hashes, depth - 1);
                    self.store.put(new_existing_hash, Node::Leaf { key: existing_key, value_hash: existing_value });

                    if existing_bit {
                        right = new_existing_hash;
                    } else {
                        left = new_existing_hash;
                    }

                    if new_bit {
                        right = self.update_recursive(right, depth - 1, key, value_hash)?;
                    } else {
                        left = self.update_recursive(left, depth - 1, key, value_hash)?;
                    }

                    let branch = Node::Branch { left, right };
                    let branch_hash = Self::hash_branch(&left, &right);
                    self.store.put(branch_hash, branch);
                    return Ok(branch_hash);
                }
            }
            Node::Branch { left, right } => {
                let bit_index = 256 - depth;
                let bit = Self::get_bit(key, bit_index);

                let (new_left, new_right) = if bit {
                    let r = self.update_recursive(right, depth - 1, key, value_hash)?;
                    (left, r)
                } else {
                    let l = self.update_recursive(left, depth - 1, key, value_hash)?;
                    (l, right)
                };

                if new_left == self.default_hashes[depth - 1] && new_right == self.default_hashes[depth - 1] {
                    return Ok(self.default_hashes[depth]);
                }

                let branch = Node::Branch { left: new_left, right: new_right };
                let branch_hash = Self::hash_branch(&new_left, &new_right);
                self.store.put(branch_hash, branch);
                return Ok(branch_hash);
            }
        }
    }

    fn prove_recursive(
        &self,
        current_hash: [u8; 32],
        depth: usize,
        key: &[u8; 32],
        siblings: &mut Vec<[u8; 32]>,
    ) -> Result<(), String> {
        if depth == 0 {
            return Ok(());
        }

        if current_hash == self.default_hashes[depth] {
            for d in (0..depth).rev() {
                siblings.push(self.default_hashes[d]);
            }
            return Ok(());
        }

        let node = self.store.get(&current_hash).ok_or_else(|| {
            format!("Node not found in store: {:?}", current_hash)
        })?;

        match node {
            Node::Leaf { key: _existing_key, value_hash: _existing_value } => {
                // If it is a leaf, all sub-siblings are defaults
                for d in (0..depth).rev() {
                    siblings.push(self.default_hashes[d]);
                }
                Ok(())
            }
            Node::Branch { left, right } => {
                let bit_index = 256 - depth;
                let bit = Self::get_bit(key, bit_index);

                if bit {
                    siblings.push(left);
                    self.prove_recursive(right, depth - 1, key, siblings)?;
                } else {
                    siblings.push(right);
                    self.prove_recursive(left, depth - 1, key, siblings)?;
                }
                Ok(())
            }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_smt_empty() {
        let store = MemoryNodeStore::new();
        let trie = SparseMerkleTrie::new(store);

        let key = [1u8; 32];
        let val = trie.get(&key).unwrap();
        assert_eq!(val, [0u8; 32]);

        let proof = trie.prove(key).unwrap();
        assert!(proof.verify(&trie.root()));
    }

    #[test]
    fn test_smt_insert_and_verify() {
        let store = MemoryNodeStore::new();
        let mut trie = SparseMerkleTrie::new(store);

        let key = [2u8; 32];
        let val = [99u8; 32];

        // Update key
        let new_root = trie.update(key, val).unwrap();
        assert_ne!(new_root, trie.default_hashes[256]);

        let retrieved = trie.get(&key).unwrap();
        assert_eq!(retrieved, val);

        // Prove membership
        let proof = trie.prove(key).unwrap();
        assert_eq!(proof.value_hash, val);
        assert!(proof.verify(&new_root));

        // Prove non-membership of another key
        let other_key = [3u8; 32];
        let proof_non_member = trie.prove(other_key).unwrap();
        assert_eq!(proof_non_member.value_hash, [0u8; 32]);
        assert!(proof_non_member.verify(&new_root));
    }

    #[test]
    fn test_smt_divergent_paths() {
        let store = MemoryNodeStore::new();
        let mut trie = SparseMerkleTrie::new(store);

        // Keys sharing first 3 bytes to force deep path traversal/divergence
        let mut key1 = [0u8; 32];
        key1[0] = 0xAA;
        key1[1] = 0xBB;
        key1[31] = 1;

        let mut key2 = [0u8; 32];
        key2[0] = 0xAA;
        key2[1] = 0xBB;
        key2[31] = 2;

        let val1 = [11u8; 32];
        let val2 = [22u8; 32];

        trie.update(key1, val1).unwrap();
        let final_root = trie.update(key2, val2).unwrap();

        // Retrieve both keys
        assert_eq!(trie.get(&key1).unwrap(), val1);
        assert_eq!(trie.get(&key2).unwrap(), val2);

        // Verify proofs for both keys
        let proof1 = trie.prove(key1).unwrap();
        assert!(proof1.verify(&final_root));

        let proof2 = trie.prove(key2).unwrap();
        assert!(proof2.verify(&final_root));
    }
}
