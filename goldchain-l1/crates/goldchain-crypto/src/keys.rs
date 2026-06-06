use group::GroupEncoding;
use ed25519_dalek::{SigningKey, VerifyingKey, SECRET_KEY_LENGTH};
use rand::rngs::OsRng;
use serde::{Serialize, Deserialize, Serializer, Deserializer};
use crate::error::CryptoError;
use bls12_381::{G2Projective, Scalar};

#[derive(Clone)]
pub struct PrivateKey {
    pub ed25519: SigningKey,
    pub bls: Scalar,
}

use std::fmt;
use std::hash::{Hash, Hasher};

#[derive(Clone, Copy, PartialEq, Eq)]
pub struct PublicKey {
    pub ed25519: VerifyingKey,
    pub bls: G2Projective,
    pub pq_t: crate::signature::Poly256,
}

impl Hash for PublicKey {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.to_bytes().hash(state);
    }
}

impl PartialEq for PrivateKey {
    fn eq(&self, other: &Self) -> bool {
        self.to_bytes() == other.to_bytes()
    }
}

impl Eq for PrivateKey {}

impl Hash for PrivateKey {
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
        write!(f, "PublicKey({})", hex::encode(&self.to_bytes()))
    }
}

impl PrivateKey {
    /// Generates a new random private key
    pub fn generate() -> Self {
        let mut rng = OsRng;
        let signing_key = SigningKey::generate(&mut rng);
        
        let hash = blake3::hash(&signing_key.to_bytes());
        let mut scalar_bytes = [0u8; 32];
        scalar_bytes.copy_from_slice(hash.as_bytes());
        scalar_bytes[31] &= 0x3F;
        let bls = Scalar::from_bytes(&scalar_bytes).unwrap();
        
        PrivateKey { ed25519: signing_key, bls }
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
        
        let hash = blake3::hash(&key_bytes);
        let mut scalar_bytes = [0u8; 32];
        scalar_bytes.copy_from_slice(hash.as_bytes());
        scalar_bytes[31] &= 0x3F;
        let bls = Scalar::from_bytes(&scalar_bytes).unwrap();

        Ok(PrivateKey { ed25519: signing_key, bls })
    }

    /// Gets the raw bytes of the private key
    pub fn to_bytes(&self) -> [u8; SECRET_KEY_LENGTH] {
        self.ed25519.to_bytes()
    }

    /// Gets the corresponding public key
    pub fn public_key(&self) -> PublicKey {
        let ed_pub = self.ed25519.verifying_key();
        let bls_pub = G2Projective::generator() * self.bls;
        
        let (mut s1, _s2) = self.pq_private_key();
        for c in s1.coeffs.iter_mut() {
            *c = c.rem_euclid(8380417);
        }
        let pq_t = s1;

        PublicKey {
            ed25519: ed_pub,
            bls: bls_pub,
            pq_t,
        }
    }

    pub fn pq_private_key(&self) -> (crate::signature::Poly256, crate::signature::Poly256) {
        let mut s1 = crate::signature::Poly256::zero();
        let mut s2 = crate::signature::Poly256::zero();
        let seed = blake3::hash(&self.to_bytes());
        for i in 0..256 {
            let mut data = Vec::with_capacity(36);
            data.extend_from_slice(seed.as_bytes());
            data.extend_from_slice(&(i as u32).to_le_bytes());
            let h = blake3::hash(&data);
            s1.coeffs[i] = ((h.as_bytes()[0] as i32) % 3) - 1;
            s2.coeffs[i] = ((h.as_bytes()[1] as i32) % 3) - 1;
        }
        (s1, s2)
    }
}

impl PublicKey {
    /// Creates a public key from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, CryptoError> {
        borsh::from_slice(bytes).map_err(|e| CryptoError::ParseError(e.to_string()))
    }

    /// Gets the raw bytes of the public key
    pub fn to_bytes(&self) -> Vec<u8> {
        borsh::to_vec(self).unwrap()
    }
}

use borsh::{BorshSerialize, BorshDeserialize};

impl BorshSerialize for PublicKey {
    fn serialize<W: std::io::Write>(&self, writer: &mut W) -> std::io::Result<()> {
        writer.write_all(&self.ed25519.to_bytes())?;
        let bls_affine = bls12_381::G2Affine::from(self.bls);
        writer.write_all(bls_affine.to_bytes().as_ref())?;
        for &coeff in &self.pq_t.coeffs {
            writer.write_all(&coeff.to_le_bytes())?;
        }
        Ok(())
    }
}

impl BorshDeserialize for PublicKey {
    fn deserialize_reader<R: std::io::Read>(reader: &mut R) -> std::io::Result<Self> {
        let mut ed_bytes = [0u8; 32];
        reader.read_exact(&mut ed_bytes)?;
        let ed25519 = VerifyingKey::from_bytes(&ed_bytes)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string()))?;
            
        let mut bls_bytes = [0u8; 96];
        reader.read_exact(&mut bls_bytes)?;
        let mut repr = <bls12_381::G2Affine as GroupEncoding>::Repr::default();
        repr.as_mut().copy_from_slice(&bls_bytes);
        let bls_affine = bls12_381::G2Affine::from_bytes(&repr);
        if bls_affine.is_none().into() {
            return Err(std::io::Error::new(std::io::ErrorKind::InvalidData, "Invalid BLS G2 point"));
        }
        let bls = G2Projective::from(bls_affine.unwrap());
        
        let mut coeffs = [0i32; 256];
        for i in 0..256 {
            let mut c_bytes = [0u8; 4];
            reader.read_exact(&mut c_bytes)?;
            coeffs[i] = i32::from_le_bytes(c_bytes);
        }
        let pq_t = crate::signature::Poly256 { coeffs };
        
        Ok(PublicKey { ed25519, bls, pq_t })
    }
}

// Custom serialization for PublicKey using hex representation
impl Serialize for PublicKey {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let bytes = self.to_bytes();
        if serializer.is_human_readable() {
            serializer.serialize_str(&hex::encode(&bytes))
        } else {
            serializer.serialize_bytes(&bytes)
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
    pub fn encode(bytes: &[u8]) -> String {
        let mut s = String::with_capacity(bytes.len() * 2);
        for &byte in bytes {
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
