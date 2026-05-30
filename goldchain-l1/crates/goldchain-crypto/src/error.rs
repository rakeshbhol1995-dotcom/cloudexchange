use thiserror::Error;

#[derive(Error, Debug, Clone, PartialEq, Eq)]
pub enum CryptoError {
    #[error("Invalid signature")]
    InvalidSignature,

    #[error("Invalid key length: expected {expected}, got {got}")]
    InvalidKeyLength { expected: usize, got: usize },

    #[error("Invalid address format")]
    InvalidAddressFormat,

    #[error("Bech32 decoding error")]
    Bech32DecodingError,

    #[error("Bech32 encoding error")]
    Bech32EncodingError,

    #[error("Invalid prefix: expected {expected}, got {got}")]
    InvalidPrefix { expected: String, got: String },

    #[error("Failed to parse bytes: {0}")]
    ParseError(String),
}
