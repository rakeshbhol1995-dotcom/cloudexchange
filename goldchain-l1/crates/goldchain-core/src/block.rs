pub use goldchain_types::{Block, BlockHeader};
use crate::error::CoreError;

pub trait BlockValidation {
    fn validate_linkage(&self, prev_block: &Block) -> Result<(), CoreError>;
}

impl BlockValidation for Block {
    /// Validates linkage with the previous block
    fn validate_linkage(&self, prev_block: &Block) -> Result<(), CoreError> {
        if self.header.height != prev_block.header.height + 1 {
            return Err(CoreError::InvalidBlock(format!(
                "Invalid height linkage: expected {}, got {}",
                prev_block.header.height + 1,
                self.header.height
            )));
        }

        if self.header.prev_hash != prev_block.hash() {
            return Err(CoreError::InvalidBlock("Invalid prev_hash field".to_string()));
        }

        if self.header.timestamp < prev_block.header.timestamp {
            return Err(CoreError::InvalidBlock("Block timestamp is in the past".to_string()));
        }

        Ok(())
    }
}
