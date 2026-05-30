use crate::error::CoreError;

pub struct DataAvailabilityLayer;

impl DataAvailabilityLayer {
    /// Simulates splitting block data into N raw chunks and expanding to 2N coding shards
    pub fn erasure_code_split(block_data: &[u8], num_shards: usize) -> Result<Vec<Vec<u8>>, CoreError> {
        if block_data.is_empty() {
            return Err(CoreError::InvalidBlock("Empty block data cannot be erasure coded".to_string()));
        }
        if num_shards == 0 {
            return Err(CoreError::InvalidBlock("Number of shards must be greater than zero".to_string()));
        }

        let chunk_size = (block_data.len() + num_shards - 1) / num_shards;
        let mut shards = Vec::with_capacity(num_shards * 2);

        // Raw shards
        for i in 0..num_shards {
            let start = std::cmp::min(i * chunk_size, block_data.len());
            let end = std::cmp::min((i + 1) * chunk_size, block_data.len());
            let mut shard = vec![0u8; chunk_size];
            let segment = &block_data[start..end];
            shard[..segment.len()].copy_from_slice(segment);
            shards.push(shard);
        }

        // Parity shards (xor-based simulation of Reed-Solomon erasure)
        for i in 0..num_shards {
            let mut parity_shard = vec![0u8; chunk_size];
            for j in 0..chunk_size {
                parity_shard[j] = shards[i][j] ^ ((i + 1) as u8);
            }
            shards.push(parity_shard);
        }

        Ok(shards)
    }

    /// Simulates Data Availability Sampling (DAS) from a random selection of shards
    pub fn verify_data_availability(shards: &[Vec<u8>], samples: &[usize]) -> bool {
        if shards.is_empty() || samples.is_empty() {
            return false;
        }
        for &sample_idx in samples {
            if sample_idx >= shards.len() {
                return false; // Sample index out of bounds
            }
            // Check that the sampled chunk contains valid non-empty byte patterns
            if shards[sample_idx].is_empty() {
                return false;
            }
        }
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_erasure_coding_splitting() {
        let block_data = b"goldchain-da-block-payload-data-to-sample";
        let shards = DataAvailabilityLayer::erasure_code_split(block_data, 4).unwrap();
        assert_eq!(shards.len(), 8); // 4 raw + 4 parity

        // Verify correct chunk sizing
        let expected_chunk_size = (block_data.len() + 3) / 4;
        assert_eq!(shards[0].len(), expected_chunk_size);
    }

    #[test]
    fn test_data_availability_sampling() {
        let block_data = b"block-payload";
        let shards = DataAvailabilityLayer::erasure_code_split(block_data, 2).unwrap();

        // Sample valid indices
        assert!(DataAvailabilityLayer::verify_data_availability(&shards, &[0, 2]));
        // Invalid index
        assert!(!DataAvailabilityLayer::verify_data_availability(&shards, &[0, 4]));
    }
}
