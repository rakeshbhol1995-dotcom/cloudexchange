use thiserror::Error;

#[derive(Error, Debug, Clone, PartialEq, Eq)]
pub enum StorageError {
    #[error("Database error: {0}")]
    DbError(String),

    #[error("Serialization/Deserialization error: {0}")]
    BorshError(String),

    #[error("Block not found: height {0}")]
    BlockNotFound(u64),

    #[error("Transaction not found: hash {0}")]
    TxNotFound(String),

    #[error("Account not found: address {0}")]
    AccountNotFound(String),

    #[error("Receipt not found: tx_hash {0}")]
    ReceiptNotFound(String),

    #[error("Storage initialization error: {0}")]
    InitError(String),
}

impl From<std::io::Error> for StorageError {
    fn from(error: std::io::Error) -> Self {
        StorageError::BorshError(error.to_string())
    }
}
