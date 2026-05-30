use ed25519_dalek::{SigningKey, VerifyingKey, SECRET_KEY_LENGTH, PUBLIC_KEY_LENGTH};
use rand::rngs::OsRng;
use serde::{Serialize, Deserialize, Serializer, Deserializer};
use crate::error::CryptoError;

#[derive(Clone)]
pub struct PrivateKey(pub SigningKey);

use std::fmt;
use std::hash::{Hash, Hasher};

#[derive(Clone, Copy)]
pub struct PublicKey(pub VerifyingKey);

impl PartialEq for PublicKey {
    fn eq(&self, other: &Self) -> bool {
        self.to_bytes() == other.to_bytes()
    }
}

impl Eq for PublicKey {}

impl Hash for PublicKey {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.to_bytes().hash(state);
    }
}

impl PartialOrd for PublicKey {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for PublicKey {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.to_bytes().cmp(&other.to_bytes())
    }
}

impl fmt::Debug for PublicKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "PublicKey({})", hex::encode(self.to_bytes()))
    }
}


impl PrivateKey {
    /// Generates a new random Ed25519 private key
    pub fn generate() -> Self {
        let mut rng = OsRng;
        let signing_key = SigningKey::generate(&mut rng);
        PrivateKey(signing_key)
    }

    /// Creates a private key from 32 raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, CryptoError> {
        if bytes.len() != SECRET_KEY_LENGTH {
            return Err(CryptoError::InvalidKeyLength {
                expected: SECRET_KEY_LENGTH,
                got: bytes.len(),
            });
        }
        let mut key_bytes = [0u8; SECRET_KEY_LENGTH];
        key_bytes.copy_from_slice(bytes);
        let signing_key = SigningKey::from_bytes(&key_bytes);
        Ok(PrivateKey(signing_key))
    }

    /// Gets the raw bytes of the private key
    pub fn to_bytes(&self) -> [u8; SECRET_KEY_LENGTH] {
        self.0.to_bytes()
    }

    /// Gets the corresponding public key
    pub fn public_key(&self) -> PublicKey {
        PublicKey(self.0.verifying_key())
    }
}

impl PublicKey {
    /// Creates a public key from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, CryptoError> {
        if bytes.len() != PUBLIC_KEY_LENGTH {
            return Err(CryptoError::InvalidKeyLength {
                expected: PUBLIC_KEY_LENGTH,
                got: bytes.len(),
            });
        }
        let mut key_bytes = [0u8; PUBLIC_KEY_LENGTH];
        key_bytes.copy_from_slice(bytes);
        let verifying_key = VerifyingKey::from_bytes(&key_bytes)
            .map_err(|_| CryptoError::InvalidKeyLength { expected: PUBLIC_KEY_LENGTH, got: bytes.len() })?;
        Ok(PublicKey(verifying_key))
    }

    /// Gets the raw bytes of the public key
    pub fn to_bytes(&self) -> [u8; PUBLIC_KEY_LENGTH] {
        self.0.to_bytes()
    }
}

// Custom serialization for PublicKey using hex representation
impl Serialize for PublicKey {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        if serializer.is_human_readable() {
            serializer.serialize_str(&hex::encode(self.to_bytes()))
        } else {
            serializer.serialize_bytes(&self.to_bytes())
        }
    }
}

impl<'de> Deserialize<'de> for PublicKey {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        if deserializer.is_human_readable() {
            let hex_str = <String as serde::Deserialize>::deserialize(deserializer)?;
            let bytes = hex::decode(&hex_str).map_err(serde::de::Error::custom)?;
            PublicKey::from_bytes(&bytes).map_err(serde::de::Error::custom)
        } else {
            let bytes = <Vec<u8> as serde::Deserialize>::deserialize(deserializer)?;
            PublicKey::from_bytes(&bytes).map_err(serde::de::Error::custom)
        }
    }
}

// Simple hex module duplicate/re-use to avoid dependencies
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
