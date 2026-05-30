use serde::{Serialize, Deserialize};
use borsh::{BorshSerialize, BorshDeserialize};
use goldchain_crypto::hash::Hash;
use goldchain_crypto::address::Address;

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct Event {
    pub address: Address,
    pub topics: Vec<Hash>,
    pub data: Vec<u8>,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct Receipt {
    pub tx_hash: Hash,
    pub success: bool,
    pub gas_used: u64,
    pub events: Vec<Event>,
    pub error_msg: Option<String>,
}

impl Receipt {
    /// Creates a new success receipt
    pub fn new_success(tx_hash: Hash, gas_used: u64, events: Vec<Event>) -> Self {
        Receipt {
            tx_hash,
            success: true,
            gas_used,
            events,
            error_msg: None,
        }
    }

    /// Creates a new failure receipt
    pub fn new_failure(tx_hash: Hash, gas_used: u64, error_msg: String) -> Self {
        Receipt {
            tx_hash,
            success: false,
            gas_used,
            events: Vec::new(),
            error_msg: Some(error_msg),
        }
    }
}
