pub use goldchain_types::{Transaction, TxType};
use crate::error::CoreError;

pub trait TransactionValidation {
    fn validate_basic(&self) -> Result<(), CoreError>;
}

impl TransactionValidation for Transaction {
    /// Basic stateless verification of transaction integrity
    fn validate_basic(&self) -> Result<(), CoreError> {
        if self.amount == 0 && self.tx_type == TxType::Transfer {
            return Err(CoreError::InvalidTransaction("Transfer amount cannot be zero".to_string()));
        }
        if self.fee == 0 {
            return Err(CoreError::InvalidTransaction("Transaction fee must be greater than zero".to_string()));
        }
        self.verify_signature().map_err(|e| CoreError::InvalidTransaction(e))
    }
}
