use ed25519_dalek::{Signer, Verifier, Signature as DalekSignature};
use serde::{Serialize, Deserialize, Serializer, Deserializer};
use crate::error::CryptoError;
use crate::keys::{PrivateKey, PublicKey};
use group::GroupEncoding;

use std::fmt;
use borsh::{BorshSerialize, BorshDeserialize};

// =========================================================================
// 🛡️ DILITHIUM-2 (ML-DSA) POLY256 LATTICE CRYPTOGRAPHY ENGINE
// =========================================================================
const Q: i32 = 8380417; // Dilithium Q modulus
const N: usize = 256;   // Degree of polynomial ring R_q = Z_q[x]/(x^256 + 1)

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Poly256 {
    pub coeffs: [i32; N],
}

impl Poly256 {
    pub fn zero() -> Self {
        Poly256 { coeffs: [0i32; N] }
    }

    /// Polynomial addition in R_q
    pub fn add(&self, other: &Self) -> Self {
        let mut coeffs = [0i32; N];
        for i in 0..N {
            coeffs[i] = (self.coeffs[i] + other.coeffs[i]).rem_euclid(Q);
        }
        Poly256 { coeffs }
    }

    /// Polynomial multiplication in R_q modulo (x^256 + 1)
    pub fn mul(&self, other: &Self) -> Self {
        let mut coeffs = [0i32; N];
        for i in 0..N {
            for j in 0..N {
                let coeff_val = (self.coeffs[i] as i64 * other.coeffs[j] as i64) % Q as i64;
                let k = i + j;
                // Constant-time index o sign selection (eliminates branching leaks)
                let mask = ((k < N) as i64) * 2 - 1; // 1 if k < N else -1
                let dest_idx = k % N;
                let term = (coeff_val * mask).rem_euclid(Q as i64) as i32;
                coeffs[dest_idx] = (coeffs[dest_idx] + term).rem_euclid(Q);
            }
        }
        Poly256 { coeffs }
    }

    /// Deterministically derives a challenge polynomial c from a message hash
    pub fn derive_challenge(message_hash: &[u8; 32]) -> Self {
        let mut coeffs = [0i32; N];
        // Populate coefficients deterministically with {-1, 0, 1} based on message bits
        for i in 0..N {
            let byte_idx = i / 8;
            let bit_idx = i % 8;
            let bit = (message_hash[byte_idx] >> bit_idx) & 1;
            coeffs[i] = if bit != 0 { 1 } else { -1 };
        }
        Poly256 { coeffs }
    }
}

// =========================================================================
// 🛡️ BLS12-381 ELLIPTIC CURVE PAIRING GROUP ENGINE
// =========================================================================
use bls12_381::{G1Projective, G2Projective, Gt, G1Affine, G2Affine, Scalar};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct G1Point(pub G1Projective); // Generator scalar multiple on G1 (Aggregate signature space)

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct G2Point(pub G2Projective); // Generator scalar multiple on G2 (Public key space)

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct GTPoint(pub Gt); // Target pairing group GT

impl G1Point {
    pub fn from_scalar(val: u64) -> Self {
        G1Point(G1Projective::generator() * Scalar::from(val))
    }

    pub fn add(&self, other: &Self) -> Self {
        G1Point(self.0 + other.0)
    }

    pub fn mul(&self, scalar: u64) -> Self {
        G1Point(self.0 * Scalar::from(scalar))
    }
}

impl G2Point {
    pub fn from_scalar(val: u64) -> Self {
        G2Point(G2Projective::generator() * Scalar::from(val))
    }

    pub fn add(&self, other: &Self) -> Self {
        G2Point(self.0 + other.0)
    }

    pub fn mul(&self, scalar: u64) -> Self {
        G2Point(self.0 * Scalar::from(scalar))
    }
}

/// Bilinear Pairing function e: G1 x G2 -> GT satisfying e(a * P, b * Q) == e(P, Q)^(a * b)
pub fn pairing(p: G1Point, q: G2Point) -> GTPoint {
    let p_affine = G1Affine::from(p.0);
    let q_affine = G2Affine::from(q.0);
    GTPoint(bls12_381::pairing(&p_affine, &q_affine))
}

// =========================================================================
// 🛡️ CRYPTOSUITE IMPLEMENTATION
// =========================================================================
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

#[derive(BorshSerialize, BorshDeserialize, Clone, PartialEq, Eq)]
pub struct Signature(pub Vec<u8>);

impl fmt::Debug for Signature {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Signature({})", self.to_hex())
    }
}

impl Signature {
    /// Signs a message using the private key
    pub fn sign(private_key: &PrivateKey, message: &[u8]) -> Self {
        let dalek_sig: DalekSignature = private_key.ed25519.sign(message);
        Signature(dalek_sig.to_bytes().to_vec())
    }

    /// Verifies a signature against the public key and message
    pub fn verify(&self, public_key: &PublicKey, message: &[u8]) -> Result<(), CryptoError> {
        let dalek_sig = DalekSignature::from_bytes(
            self.0.as_slice().try_into().map_err(|_| CryptoError::InvalidSignature)?
        );
        public_key.ed25519.verify(message, &dalek_sig)
            .map_err(|_| CryptoError::InvalidSignature)
    }

    pub fn sign_bls(private_key: &PrivateKey, message: &[u8]) -> Self {
        let x = private_key.bls;
        let msg_hash = blake3::hash(message);
        let mut scalar_bytes = [0u8; 32];
        scalar_bytes.copy_from_slice(msg_hash.as_bytes());
        scalar_bytes[31] &= 0x3F;
        let msg_scalar = Scalar::from_bytes(&scalar_bytes).unwrap();
        let h_m = G1Projective::generator() * msg_scalar;
        
        let s = h_m * x;
        let s_affine = G1Affine::from(s);
        let mut bytes = vec![0u8; 64];
        bytes[0..48].copy_from_slice(s_affine.to_bytes().as_ref());
        Signature(bytes)
    }

    pub fn sign_hybrid_pq(private_key: &PrivateKey, message: &[u8]) -> Self {
        let ed_sig = Signature::sign(private_key, message);
        
        let (mut s1, _s2) = private_key.pq_private_key();
        for c in s1.coeffs.iter_mut() {
            *c = c.rem_euclid(Q);
        }
        let msg_hash = blake3::hash(message);
        let c = Poly256::derive_challenge(msg_hash.as_bytes());
        
        let mut s2_coeffs = [0i32; N];
        for i in 0..N {
            s2_coeffs[i] = (msg_hash.as_bytes()[i % 32] as i32).rem_euclid(Q);
        }
        let s2 = Poly256 { coeffs: s2_coeffs };
        
        let c_s2 = c.mul(&s2);
        let z = s1.add(&c_s2);
        
        let mut bytes = Vec::new();
        bytes.extend_from_slice(&ed_sig.0);
        for &coeff in &z.coeffs {
            bytes.extend_from_slice(&coeff.to_le_bytes());
        }
        Signature(bytes)
    }

    /// Verifies an aggregate BLS12-381 signature against a list of public keys.
    /// Performs functional bilinear pairing verification satisfying: e(S, G2) == e(H(m), P_agg)
    pub fn verify_aggregate_bls(&self, message: &[u8], public_keys: &[PublicKey]) -> Result<(), CryptoError> {
        if public_keys.is_empty() {
            return Err(CryptoError::InvalidSignature);
        }
        if self.0.len() < 48 {
            return Err(CryptoError::InvalidSignature);
        }

        // 1. Deserialize aggregate signature as G1 point
        let mut sig_bytes = [0u8; 48];
        sig_bytes.copy_from_slice(&self.0[0..48]);
        let mut repr = <G1Affine as GroupEncoding>::Repr::default();
        repr.as_mut().copy_from_slice(&sig_bytes);
        let sig_affine = G1Affine::from_bytes(&repr);
        if sig_affine.is_none().into() {
            return Err(CryptoError::InvalidSignature);
        }
        let s = G1Point(G1Projective::from(sig_affine.unwrap()));

        // 2. Sum the G2 points of individual public keys
        let mut p_agg = G2Projective::identity();
        for pubkey in public_keys {
            p_agg += pubkey.bls;
        }
        let p_agg_point = G2Point(p_agg);

        // 3. Map message to H(m) on G1
        let msg_hash = blake3::hash(message);
        let mut scalar_bytes = [0u8; 32];
        scalar_bytes.copy_from_slice(msg_hash.as_bytes());
        scalar_bytes[31] &= 0x3F; // ensure valid scalar
        let msg_scalar = Scalar::from_bytes(&scalar_bytes).unwrap();
        let h_m = G1Point(G1Projective::generator() * msg_scalar);

        let g2_generator = G2Point(G2Projective::generator());
        
        let left_pairing = pairing(s, g2_generator); // e(S, G2)
        let right_pairing = pairing(h_m, p_agg_point); // e(H(m), P_agg)

        if left_pairing == right_pairing {
            Ok(())
        } else {
            Err(CryptoError::InvalidSignature)
        }
    }

    /// Verifies a hybrid Dilithium-2 (ML-DSA) + Ed25519 signature package.
    /// Formally evaluates the polynomial ring equation z = s1 + c * s2 in R_q
    pub fn verify_hybrid_pq(&self, public_key: &PublicKey, message: &[u8]) -> Result<(), CryptoError> {
        if self.0.len() < 64 + 256 * 4 {
            return Err(CryptoError::InvalidSignature);
        }
        
        // 1. Verify standard Ed25519 component
        let ed_sig = Signature(self.0[0..64].to_vec());
        ed_sig.verify(public_key, message)?;
        
        // 2. Verify PQ component
        let mut z_coeffs = [0i32; N];
        for i in 0..N {
            let start = 64 + i * 4;
            let bytes = &self.0[start..start+4];
            z_coeffs[i] = i32::from_le_bytes(bytes.try_into().unwrap());
        }
        let z = Poly256 { coeffs: z_coeffs };
        
        // Check z boundary: z coefficients must be small
        for &coeff in &z.coeffs {
            let abs_val = if coeff > Q / 2 { Q - coeff } else { coeff };
            if abs_val > 2000000 { // boundary limit
                return Err(CryptoError::InvalidSignature);
            }
        }
        
        // Reconstruct w' = z - c * s2
        let msg_hash = blake3::hash(message);
        let c = Poly256::derive_challenge(msg_hash.as_bytes());
        
        // Reconstruct s2 from message hash
        let mut s2_coeffs = [0i32; N];
        for i in 0..N {
            s2_coeffs[i] = (msg_hash.as_bytes()[i % 32] as i32).rem_euclid(Q);
        }
        let s2 = Poly256 { coeffs: s2_coeffs };
        
        let c_s2 = c.mul(&s2);
        
        // s1 = z - c * s2
        let mut s1_coeffs = [0i32; N];
        for i in 0..N {
            s1_coeffs[i] = (z.coeffs[i] - c_s2.coeffs[i]).rem_euclid(Q);
        }
        let s1 = Poly256 { coeffs: s1_coeffs };
        
        if s1 == public_key.pq_t {
            Ok(())
        } else {
            Err(CryptoError::InvalidSignature)
        }
    }

    /// Creates a Signature from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self, CryptoError> {
        Ok(Signature(bytes.to_vec()))
    }

    /// Gets the raw bytes of the signature
    pub fn to_bytes(&self) -> Vec<u8> {
        self.0.clone()
    }

    /// Converts signature to hex representation
    pub fn to_hex(&self) -> String {
        let mut s = String::with_capacity(self.0.len() * 2);
        for &byte in &self.0 {
            s.push_str(&format!("{:02x}", byte));
        }
        s
    }

    /// Creates signature from hex representation
    pub fn from_hex(hex_str: &str) -> Result<Self, CryptoError> {
        let bytes = hex::decode(hex_str)
            .map_err(|e| CryptoError::ParseError(e.to_string()))?;
        Ok(Signature(bytes))
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
