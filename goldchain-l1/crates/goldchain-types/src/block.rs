use serde::{Serialize, Deserialize};
use borsh::{BorshSerialize, BorshDeserialize};
use goldchain_crypto::hash::Hash;
use goldchain_crypto::address::Address;
use goldchain_crypto::signature::{Signature, CryptoSuiteId};
use goldchain_crypto::keys::PrivateKey;
use crate::transaction::Transaction;

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct BlockHeader {
    pub height: u64,
    pub timestamp: u64,
    pub prev_hash: Hash,
    pub merkle_root: Hash,
    pub state_root: Hash,
    pub validator: Address,
    pub signature: Option<Signature>,
    pub crypto_suite: CryptoSuiteId,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct Block {
    pub header: BlockHeader,
    pub transactions: Vec<Transaction>,
}

impl Block {
    /// Creates a new block (signature is initially None)
    pub fn new(
        height: u64,
        timestamp: u64,
        prev_hash: Hash,
        state_root: Hash,
        validator: Address,
        transactions: Vec<Transaction>,
    ) -> Self {
        let tx_hashes: Vec<[u8; 32]> = transactions.iter().map(|tx| tx.hash().0).collect();
        let merkle_root = Self::calculate_merkle_root(&tx_hashes);

        Block {
            header: BlockHeader {
                height,
                timestamp,
                prev_hash,
                merkle_root,
                state_root,
                validator,
                signature: None,
                crypto_suite: CryptoSuiteId::V1,
            },
            transactions,
        }
    }

    /// Computes the hash of the block header (excluding signature)
    pub fn hash(&self) -> Hash {
        let unsigned_header = BlockHeader {
            height: self.header.height,
            timestamp: self.header.timestamp,
            prev_hash: self.header.prev_hash,
            merkle_root: self.header.merkle_root,
            state_root: self.header.state_root,
            validator: self.header.validator.clone(),
            signature: None,
            crypto_suite: self.header.crypto_suite,
        };

        let bytes = borsh::to_vec(&unsigned_header).expect("Borsh serialization of BlockHeader should succeed");
        Hash::digest(&bytes)
    }

    /// Signs the block header with the validator's private key
    pub fn sign(&mut self, private_key: &PrivateKey) {
        let header_hash = self.hash();
        let signature = Signature::sign(private_key, header_hash.as_ref());
        self.header.signature = Some(signature);
    }

    /// Verifies the validator signature on the block header
    pub fn verify_signature(&self) -> Result<(), String> {
        let signature = self.header.signature.as_ref().ok_or_else(|| "No block signature found".to_string())?;
        let pub_key = self.header.validator.to_public_key().map_err(|e| e.to_string())?;
        let header_hash = self.hash();
        signature.verify(&pub_key, header_hash.as_ref())
            .map_err(|e| e.to_string())
    }

    /// Helper to compute transaction Merkle root simply (leaves-only pairing)
    pub fn calculate_merkle_root(hashes: &[[u8; 32]]) -> Hash {
        if hashes.is_empty() {
            return Hash::digest(&[]);
        }
        let mut current = hashes.to_vec();
        while current.len() > 1 {
            let mut next = Vec::new();
            for chunk in current.chunks(2) {
                if chunk.len() == 2 {
                    let mut combined = [0u8; 64];
                    combined[..32].copy_from_slice(&chunk[0]);
                    combined[32..].copy_from_slice(&chunk[1]);
                    next.push(Hash::digest(&combined).0);
                } else {
                    next.push(chunk[0]); // Odd leaf carried over
                }
            }
            current = next;
        }
        Hash(current[0])
    }
}
