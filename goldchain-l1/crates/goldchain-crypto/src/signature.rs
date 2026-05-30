use ed25519_dalek::{Signer, Verifier, Signature as DalekSignature, SIGNATURE_LENGTH};
use serde::{Serialize, Deserialize, Serializer, Deserializer};
use crate::error::CryptoError;
use crate::keys::{PrivateKey, PublicKey};

use std::fmt;
use borsh::{BorshSerialize, BorshDeserialize};

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum CryptoSuiteId {
    V1,
    V2,
}

impl Default for CryptoSuiteId {
    fn default() -> Self {
        CryptoSuiteId::V1
    }
}

#[derive(BorshSerialize, BorshDeserialize, Clone, Copy, PartialEq, Eq)]
pub struct Signature(pub [u8; SIGNATURE_LENGTH]);

impl fmt::Debug for Signature {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Signature({})", self.to_hex())
    }
}

impl Signature {
    /// Signs a message using the private key
    pub fn sign(private_key: &PrivateKey, message: &[u8]) -> Self {
        let dalek_sig: DalekSignature = private_key.0.sign(message);
        Signature(dalek_sig.to_bytes())
    }

    /// Verifies a signature against the public key and message
    pub fn verify(&self, public_key: &PublicKey, message: &[u8]) -> Result<(), CryptoError> {
        let dalek_sig = DalekSignature::from_bytes(&self.0);
        public_key.0.verify(message, &dalek_sig)
            .map_err(|_| CryptoError::InvalidSignature)
    }

    /// Creates a Signature from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, CryptoError> {
        if bytes.len() != SIGNATURE_LENGTH {
            return Err(CryptoError::InvalidKeyLength {
                expected: SIGNATURE_LENGTH,
                got: bytes.len(),
            });
        }
        let mut sig_bytes = [0u8; SIGNATURE_LENGTH];
        sig_bytes.copy_from_slice(bytes);
        Ok(Signature(sig_bytes))
    }

    /// Gets the raw bytes of the signature
    pub fn to_bytes(&self) -> [u8; SIGNATURE_LENGTH] {
        self.0
    }

    /// Converts signature to hex representation
    pub fn to_hex(&self) -> String {
        let mut s = String::with_capacity(128);
        for &byte in &self.0 {
            s.push_str(&format!("{:02x}", byte));
        }
        s
    }

    /// Creates signature from hex representation
    pub fn from_hex(hex_str: &str) -> Result<Self, CryptoError> {
        if hex_str.len() != SIGNATURE_LENGTH * 2 {
            return Err(CryptoError::InvalidKeyLength {
                expected: SIGNATURE_LENGTH * 2,
                got: hex_str.len(),
            });
        }
        let bytes = hex::decode(hex_str)
            .map_err(|e| CryptoError::ParseError(e.to_string()))?;
        let mut arr = [0u8; SIGNATURE_LENGTH];
        arr.copy_from_slice(&bytes);
        Ok(Signature(arr))
    }
}

impl Serialize for Signature {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        if serializer.is_human_readable() {
            serializer.serialize_str(&self.to_hex())
        } else {
            serializer.serialize_bytes(&self.to_bytes())
        }
    }
}

impl<'de> Deserialize<'de> for Signature {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        if deserializer.is_human_readable() {
            let hex_str = <String as serde::Deserialize>::deserialize(deserializer)?;
            Signature::from_hex(&hex_str).map_err(serde::de::Error::custom)
        } else {
            let bytes = <Vec<u8> as serde::Deserialize>::deserialize(deserializer)?;
            Signature::from_bytes(&bytes).map_err(serde::de::Error::custom)
        }
    }
}

mod hex {
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
