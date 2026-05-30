use std::fmt;
use serde::{Serialize, Deserialize, Serializer, Deserializer};
use bech32::{self, Variant, ToBase32, FromBase32};
use crate::error::CryptoError;
use crate::keys::PublicKey;

use borsh::{BorshSerialize, BorshDeserialize};

const HRP: &str = "gold";

#[derive(BorshSerialize, BorshDeserialize, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Address(pub String);

impl Address {
    /// Creates a Bech32 address from a PublicKey
    pub fn from_public_key(pubkey: &PublicKey) -> Self {
        let bytes = pubkey.to_bytes();
        let base32_data = bytes.to_base32();
        let address_str = bech32::encode(HRP, base32_data, Variant::Bech32)
            .expect("Bech32 encoding should not fail with static hrp and data");
        Address(address_str)
    }

    /// Creates an Address from a string, validating it
    pub fn from_str(addr_str: &str) -> Result<Self, CryptoError> {
        let (hrp, base32_data, variant) = bech32::decode(addr_str)
            .map_err(|_| CryptoError::Bech32DecodingError)?;

        if hrp != HRP {
            return Err(CryptoError::InvalidPrefix {
                expected: HRP.to_string(),
                got: hrp,
            });
        }

        if variant != Variant::Bech32 {
            return Err(CryptoError::InvalidAddressFormat);
        }

        // Decode base32 back to bytes
        let bytes = Vec::<u8>::from_base32(&base32_data)
            .map_err(|_| CryptoError::Bech32DecodingError)?;

        if bytes.len() != 32 {
            return Err(CryptoError::InvalidKeyLength {
                expected: 32,
                got: bytes.len(),
            });
        }

        Ok(Address(addr_str.to_string()))
    }

    /// Decodes the address back to a PublicKey
    pub fn to_public_key(&self) -> Result<PublicKey, CryptoError> {
        let (_hrp, base32_data, _variant) = bech32::decode(&self.0)
            .map_err(|_| CryptoError::Bech32DecodingError)?;

        let bytes = Vec::<u8>::from_base32(&base32_data)
            .map_err(|_| CryptoError::Bech32DecodingError)?;

        PublicKey::from_bytes(&bytes)
    }

    /// Returns the address as a string slice
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for Address {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl fmt::Debug for Address {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Address({})", self.0)
    }
}

impl Serialize for Address {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.0)
    }
}

impl<'de> Deserialize<'de> for Address {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = <String as serde::Deserialize>::deserialize(deserializer)?;
        Address::from_str(&s).map_err(serde::de::Error::custom)
    }
}
