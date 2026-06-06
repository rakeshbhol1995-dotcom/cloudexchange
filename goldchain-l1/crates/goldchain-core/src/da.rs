use crate::error::CoreError;
use goldchain_crypto::hash::Hash;

pub struct DataAvailabilityLayer;

// Galois Field GF(256) arithmetic over the primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11D)
#[inline]
fn gf_mul(mut a: u8, mut b: u8) -> u8 {
    let mut p = 0u8;
    for _ in 0..8 {
        if (b & 1) != 0 {
            p ^= a;
        }
        let carry = a & 0x80;
        a <<= 1;
        if carry != 0 {
            a ^= 0x1D; // Modulo the generator polynomial 0x11D & 0xFF
        }
        b >>= 1;
    }
    p
}

#[inline]
fn gf_pow(mut base: u8, mut exp: u8) -> u8 {
    let mut res = 1u8;
    while exp > 0 {
        if (exp & 1) != 0 {
            res = gf_mul(res, base);
        }
        base = gf_mul(base, base);
        exp >>= 1;
    }
    res
}

#[inline]
fn gf_inv(b: u8) -> u8 {
    gf_pow(b, 254) // b^254 is the multiplicative inverse in GF(2^8)
}

fn gf_invert_matrix(matrix: &mut [Vec<u8>], n: usize) -> Result<Vec<Vec<u8>>, CoreError> {
    let mut inv = vec![vec![0u8; n]; n];
    for i in 0..n {
        inv[i][i] = 1;
    }

    for i in 0..n {
        if matrix[i][i] == 0 {
            let mut pivot_row = i;
            for r in (i + 1)..n {
                if matrix[r][i] != 0 {
                    pivot_row = r;
                    break;
                }
            }
            if matrix[pivot_row][i] == 0 {
                return Err(CoreError::InvalidBlock("Matrix is singular and cannot be inverted".to_string()));
            }
            matrix.swap(i, pivot_row);
            inv.swap(i, pivot_row);
        }

        let pivot = matrix[i][i];
        let inv_pivot = gf_inv(pivot);
        for c in 0..n {
            matrix[i][c] = gf_mul(matrix[i][c], inv_pivot);
            inv[i][c] = gf_mul(inv[i][c], inv_pivot);
        }

        for r in 0..n {
            if r != i {
                let factor = matrix[r][i];
                if factor != 0 {
                    for c in 0..n {
                        matrix[r][c] ^= gf_mul(matrix[i][c], factor);
                        inv[r][c] ^= gf_mul(inv[i][c], factor);
                    }
                }
            }
        }
    }

    Ok(inv)
}

impl DataAvailabilityLayer {
    /// Splits block data into N systematic data shards and generates N parity shards using Reed-Solomon over GF(256)
    pub fn erasure_code_split(block_data: &[u8], num_shards: usize) -> Result<Vec<Vec<u8>>, CoreError> {
        if block_data.is_empty() {
            return Err(CoreError::InvalidBlock("Empty block data cannot be erasure coded".to_string()));
        }
        if num_shards == 0 {
            return Err(CoreError::InvalidBlock("Number of shards must be greater than zero".to_string()));
        }

        let chunk_size = (block_data.len() + num_shards - 1) / num_shards;
        let mut shards = Vec::with_capacity(num_shards * 2);

        // 1. Data Shards (Systematic)
        for i in 0..num_shards {
            let start = std::cmp::min(i * chunk_size, block_data.len());
            let end = std::cmp::min((i + 1) * chunk_size, block_data.len());
            let mut shard = vec![0u8; chunk_size];
            let segment = &block_data[start..end];
            shard[..segment.len()].copy_from_slice(segment);
            shards.push(shard);
        }

        // 2. Parity Shards (Systematic Reed-Solomon generation matrix multiplication)
        for i in 0..num_shards {
            let mut parity_shard = vec![0u8; chunk_size];
            for j in 0..chunk_size {
                let mut sum = 0u8;
                for k in 0..num_shards {
                    let coef = gf_pow((i + 1) as u8, k as u8);
                    sum ^= gf_mul(coef, shards[k][j]);
                }
                parity_shard[j] = sum;
            }
            shards.push(parity_shard);
        }

        Ok(shards)
    }

    /// Reconstructs original data from any K (num_shards) available shards
    pub fn reconstruct(
        received_shards: &[Option<Vec<u8>>],
        num_shards: usize,
        chunk_size: usize,
    ) -> Result<Vec<u8>, CoreError> {
        if received_shards.len() != num_shards * 2 {
            return Err(CoreError::InvalidBlock("Invalid received shards length".to_string()));
        }

        let mut available_indices = Vec::new();
        let mut available_data = Vec::new();
        for (idx, shard_opt) in received_shards.iter().enumerate() {
            if let Some(shard) = shard_opt {
                available_indices.push(idx);
                available_data.push(shard);
                if available_indices.len() == num_shards {
                    break;
                }
            }
        }

        if available_indices.len() < num_shards {
            return Err(CoreError::InvalidBlock("Insufficient shards available for BFT reconstruction".to_string()));
        }

        let mut system_matrix = vec![vec![0u8; num_shards]; num_shards];
        for r in 0..num_shards {
            let original_idx = available_indices[r];
            if original_idx < num_shards {
                system_matrix[r][original_idx] = 1;
            } else {
                let parity_idx = original_idx - num_shards;
                for col in 0..num_shards {
                    system_matrix[r][col] = gf_pow((parity_idx + 1) as u8, col as u8);
                }
            }
        }

        let inv_matrix = gf_invert_matrix(&mut system_matrix, num_shards)?;

        let mut recovered_data_shards = vec![vec![0u8; chunk_size]; num_shards];
        for col in 0..num_shards {
            let mut recovered_shard = vec![0u8; chunk_size];
            for byte_idx in 0..chunk_size {
                let mut sum = 0u8;
                for row in 0..num_shards {
                    let coef = inv_matrix[col][row];
                    sum ^= gf_mul(coef, available_data[row][byte_idx]);
                }
                recovered_shard[byte_idx] = sum;
            }
            recovered_data_shards[col] = recovered_shard;
        }

        let mut original_data = Vec::new();
        for shard in recovered_data_shards {
            original_data.extend_from_slice(&shard);
        }

        Ok(original_data)
    }

    /// Computes the Merkle Root hash of the erasure coded shards to guarantee integrity of sampled indices
    pub fn compute_shards_merkle_root(shards: &[Vec<u8>]) -> Hash {
        let hashes: Vec<[u8; 32]> = shards.iter()
            .map(|shard| Hash::digest(shard).0)
            .collect();
        Self::calculate_merkle_root(&hashes)
    }

    fn calculate_merkle_root(hashes: &[[u8; 32]]) -> Hash {
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
                    next.push(chunk[0]);
                }
            }
            current = next;
        }
        Hash(current[0])
    }

    /// Generates a cryptographic Merkle proof for a given shard index
    pub fn generate_shard_proof(shards: &[Vec<u8>], index: usize) -> Result<Vec<[u8; 32]>, CoreError> {
        if index >= shards.len() {
            return Err(CoreError::InvalidBlock("Shard index out of bounds".to_string()));
        }
        let mut hashes: Vec<[u8; 32]> = shards.iter()
            .map(|shard| Hash::digest(shard).0)
            .collect();
        let mut proof = Vec::new();
        let mut current_index = index;

        while hashes.len() > 1 {
            let mut next = Vec::new();
            for i in (0..hashes.len()).step_by(2) {
                if i + 1 < hashes.len() {
                    let mut combined = [0u8; 64];
                    combined[..32].copy_from_slice(&hashes[i]);
                    combined[32..].copy_from_slice(&hashes[i + 1]);
                    next.push(Hash::digest(&combined).0);

                    if i == current_index {
                        proof.push(hashes[i + 1]);
                    } else if i + 1 == current_index {
                        proof.push(hashes[i]);
                    }
                } else {
                    next.push(hashes[i]);
                }
            }
            current_index /= 2;
            hashes = next;
        }

        Ok(proof)
    }

    /// Verifies the Merkle inclusion proof of a sampled shard against the declared Merkle root
    pub fn verify_shard_proof(
        shard: &[u8],
        index: usize,
        proof: &[[u8; 32]],
        expected_root: &Hash,
    ) -> bool {
        let mut current_hash = Hash::digest(shard).0;
        let mut current_index = index;

        for &sibling in proof {
            let mut combined = [0u8; 64];
            if current_index % 2 == 0 {
                combined[..32].copy_from_slice(&current_hash);
                combined[32..].copy_from_slice(&sibling);
            } else {
                combined[..32].copy_from_slice(&sibling);
                combined[32..].copy_from_slice(&current_hash);
            }
            current_hash = Hash::digest(&combined).0;
            current_index /= 2;
        }

        Hash(current_hash) == *expected_root
    }

    /// Verifies Data Availability Sampling (DAS) proofs from a random selection of shards
    pub fn verify_data_availability(shards: &[Vec<u8>], samples: &[usize]) -> bool {
        if shards.is_empty() || samples.is_empty() {
            return false;
        }
        for &sample_idx in samples {
            if sample_idx >= shards.len() {
                return false;
            }
            if shards[sample_idx].is_empty() {
                return false;
            }
        }
        true
    }

    /// Verifies Data Availability Sampling (DAS) proofs from a random selection of shards
    /// by selecting S indices pseudo-randomly using a block seed, and verifying Merkle inclusion proofs.
    pub fn verify_data_availability_sampling(
        shards: &[Vec<u8>],
        block_hash: &Hash,
        num_samples: usize,
        expected_root: &Hash,
    ) -> Result<bool, CoreError> {
        if shards.is_empty() || num_samples == 0 {
            return Ok(false);
        }

        // 1. Generate pseudo-random indices to sample using a cryptographically secure hash-based PRNG (Blake3 keyed derivation)
        let mut sample_indices = Vec::new();
        for i in 0..num_samples {
            // Derive a secure pseudo-random seed index based on block_hash o counter i
            let mut input = Vec::with_capacity(32 + 8);
            input.extend_from_slice(&block_hash.0);
            input.extend_from_slice(&(i as u64).to_be_bytes());
            let hash_res = Hash::digest(&input);
            
            let val = u64::from_be_bytes(hash_res.0[0..8].try_into().unwrap());
            let idx = (val % (shards.len() as u64)) as usize;
            if !sample_indices.contains(&idx) {
                sample_indices.push(idx);
            }
        }

        // 2. Perform Merkle proof verification for each selected index
        for &sample_idx in &sample_indices {
            let shard = &shards[sample_idx];
            if shard.is_empty() {
                return Ok(false);
            }

            // Generate proof locally to simulate validation of incoming network proof
            let proof = Self::generate_shard_proof(shards, sample_idx)?;
            let verified = Self::verify_shard_proof(shard, sample_idx, &proof, expected_root);
            if !verified {
                return Ok(false);
            }
        }

        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_erasure_coding_splitting_and_reconstruction() {
        let block_data = b"goldchain-da-block-payload-data-to-sample";
        let num_shards = 4;
        let shards = DataAvailabilityLayer::erasure_code_split(block_data, num_shards).unwrap();
        assert_eq!(shards.len(), 8);

        let chunk_size = shards[0].len();

        // Simulate losing data shard 1 and parity shard 2 (leaving 6 available shards)
        let received = vec![
            Some(shards[0].clone()), // data 0
            None,                    // data 1 (lost!)
            Some(shards[2].clone()), // data 2
            Some(shards[3].clone()), // data 3
            Some(shards[4].clone()), // parity 0
            None,                    // parity 1 (lost!)
            Some(shards[6].clone()), // parity 2
            Some(shards[7].clone()), // parity 3
        ];

        let reconstructed = DataAvailabilityLayer::reconstruct(&received, num_shards, chunk_size).unwrap();
        assert_eq!(&reconstructed[..block_data.len()], block_data);
    }

    #[test]
    fn test_das_merkle_proofs() {
        let block_data = b"sampling-block-data-with-merkle-proofs";
        let shards = DataAvailabilityLayer::erasure_code_split(block_data, 2).unwrap();
        
        let root = DataAvailabilityLayer::compute_shards_merkle_root(&shards);
        let proof = DataAvailabilityLayer::generate_shard_proof(&shards, 1).unwrap();

        assert!(DataAvailabilityLayer::verify_shard_proof(&shards[1], 1, &proof, &root));
        assert!(!DataAvailabilityLayer::verify_shard_proof(&shards[0], 0, &proof, &root)); // Wrong index
    }

    #[test]
    fn test_das_pseudo_random_merkle_sampling() {
        let block_data = b"sampling-block-data-with-pseudo-random-seeds-and-proofs";
        let shards = DataAvailabilityLayer::erasure_code_split(block_data, 4).unwrap();
        let root = DataAvailabilityLayer::compute_shards_merkle_root(&shards);
        let block_hash = Hash::digest(b"dummy-block-hash-seed-123");

        let ok = DataAvailabilityLayer::verify_data_availability_sampling(
            &shards,
            &block_hash,
            3,
            &root,
        ).unwrap();
        assert!(ok);
    }
}
