use std::fmt;
use serde::{Serialize, Deserialize};
use borsh::{BorshSerialize, BorshDeserialize};

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Hash(pub [u8; 32]);

impl Hash {
    /// Computes the BLAKE3 hash of the given data
    pub fn digest(data: &[u8]) -> Self {
        let mut hasher = blake3::Hasher::new();
        hasher.update(data);
        let result = hasher.finalize();
        Hash(*result.as_bytes())
    }

    /// Creates a hash from a 32-byte array
    pub fn new(bytes: [u8; 32]) -> Self {
        Hash(bytes)
    }

    /// Converts the hash to a hex string
    pub fn to_hex(&self) -> String {
        hex::encode(self.0)
    }

    /// Creates a hash from a hex string
    pub fn from_hex(hex_str: &str) -> Result<Self, crate::error::CryptoError> {
        let bytes = hex::decode(hex_str)
            .map_err(|e| crate::error::CryptoError::ParseError(e.to_string()))?;
        if bytes.len() != 32 {
            return Err(crate::error::CryptoError::InvalidKeyLength { expected: 32, got: bytes.len() });
        }
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&bytes);
        Ok(Hash(arr))
    }
}

impl AsRef<[u8]> for Hash {
    fn as_ref(&self) -> &[u8] {
        &self.0
    }
}

impl fmt::Display for Hash {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.to_hex())
    }
}

impl fmt::Debug for Hash {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Hash({})", self.to_hex())
    }
}

// Add simple helper for hex module since we don't have dependency on hex crate yet. Let's make sure hex is in Cargo.toml or write our own hex helper.
// Wait, we can add hex crate to Cargo.toml, or implement simple hex helper. Let's add `hex = "0.4.3"` to Cargo.toml to keep it robust.
mod hex {
    pub fn encode(bytes: [u8; 32]) -> String {
        let mut s = String::with_capacity(64);
        for &byte in &bytes {
            s.push_str(&format!("{:02x}", byte));
        }
        s
    }

    pub fn decode(hex_str: &str) -> Result<Vec<u8>, String> {
        if hex_str.len() % 2 != 0 {
            return Err("Odd length hex string".to_string());
        }
        let mut bytes = Vec::with_capacity(hex_str.len() / 2);
        let chars: Vec<char> = hex_str.chars().collect();
        for i in (0..hex_str.len()).step_by(2) {
            let s: String = chars[i..i+2].iter().collect();
            let byte = u8::from_str_radix(&s, 16).map_err(|e| e.to_string())?;
            bytes.push(byte);
        }
        Ok(bytes)
    }
}
