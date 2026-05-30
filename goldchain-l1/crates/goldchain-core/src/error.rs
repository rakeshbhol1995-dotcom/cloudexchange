use thiserror::Error;
use goldchain_crypto::error::CryptoError;

#[derive(Error, Debug, Clone, PartialEq, Eq)]
pub enum CoreError {
    #[error("Crypto error: {0}")]
    CryptoError(#[from] CryptoError),

    #[error("Transaction signature verification failed")]
    InvalidSignature,

    #[error("Insufficient balance: account has {balance}, transaction requires {required}")]
    InsufficientBalance { balance: u64, required: u64 },

    #[error("Invalid nonce: expected {expected}, got {got}")]
    InvalidNonce { expected: u64, got: u64 },

    #[error("Block validation failed: {0}")]
    InvalidBlock(String),

    #[error("Transaction validation failed: {0}")]
    InvalidTransaction(String),

    #[error("State validation error: {0}")]
    StateError(String),
}
