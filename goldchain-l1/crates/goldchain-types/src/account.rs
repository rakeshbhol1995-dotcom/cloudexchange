use serde::{Serialize, Deserialize};
use borsh::{BorshSerialize, BorshDeserialize};

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, Default, PartialEq, Eq)]
pub struct Account {
    pub balance: u64,
    pub nonce: u64,
    pub staked: u64,
    pub code: Option<Vec<u8>>,
}

impl Account {
    /// Creates a new empty account
    pub fn new(balance: u64, nonce: u64) -> Self {
        Account {
            balance,
            nonce,
            staked: 0,
            code: None,
        }
    }
}
