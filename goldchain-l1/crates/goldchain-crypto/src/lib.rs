pub mod hash;
pub mod keys;
pub mod address;
pub mod signature;
pub mod error;

#[cfg(test)]
mod tests {
    use super::hash::Hash;
    use super::keys::{PrivateKey, PublicKey};
    use super::address::Address;
    use super::signature::Signature;

    #[test]
    fn test_hashing() {
        let data = b"goldchain-l1";
        let h1 = Hash::digest(data);
        let h2 = Hash::digest(data);
        assert_eq!(h1, h2);
        assert_ne!(h1, Hash::digest(b"goldchain-l2"));
        assert_eq!(h1.to_hex().len(), 64);
    }

    #[test]
    fn test_keys_and_address() {
        let priv_key = PrivateKey::generate();
        let pub_key: PublicKey = priv_key.public_key();
        
        let addr = Address::from_public_key(&pub_key);
        assert!(addr.as_str().starts_with("gold1"));
        
        let decoded_addr = Address::from_str(addr.as_str()).unwrap();
        assert_eq!(addr, decoded_addr);
        
        let decoded_pubkey: PublicKey = decoded_addr.to_public_key().unwrap();
        assert_eq!(pub_key, decoded_pubkey);
    }

    #[test]
    fn test_signing_and_verification() {
        let priv_key = PrivateKey::generate();
        let pub_key: PublicKey = priv_key.public_key();
        let message = b"blockchain-from-scratch-transaction-data";
        
        let signature = Signature::sign(&priv_key, message);
        assert!(signature.verify(&pub_key, message).is_ok());
        
        // Tamper message
        assert!(signature.verify(&pub_key, b"different-message").is_err());
        
        // Tamper signature
        let mut tampered_bytes = signature.to_bytes();
        tampered_bytes[0] ^= 0xFF;
        let tampered_sig = Signature::from_bytes(&tampered_bytes).unwrap();
        assert!(tampered_sig.verify(&pub_key, message).is_err());
    }

    #[test]
    fn test_poly256_lattice_multiplication() {
        use super::signature::Poly256;
        let mut p1 = Poly256::zero();
        p1.coeffs[0] = 5;
        p1.coeffs[1] = 10;

        let mut p2 = Poly256::zero();
        p2.coeffs[0] = 2;

        let p3 = p1.mul(&p2);
        assert_eq!(p3.coeffs[0], 10);
        assert_eq!(p3.coeffs[1], 20);
    }

    #[test]
    fn test_pairing_bilinear_groups() {
        use super::signature::{G1Point, G2Point, pairing};
        let p = G1Point::from_scalar(3);
        let q = G2Point::from_scalar(4);
        
        let p_agg = p.mul(2); // 2 * P
        let q_agg = q.mul(2); // 2 * Q

        // Test bilinear identity: e(2 * P, Q) == e(P, 2 * Q)
        let e1 = pairing(p_agg, q);
        let e2 = pairing(p, q_agg);

        assert_eq!(e1, e2);
    }
}

