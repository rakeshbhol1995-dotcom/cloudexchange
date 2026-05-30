pub use goldchain_types::Account;
use crate::error::CoreError;

pub trait AccountActions {
    fn add_balance(&mut self, amount: u64);
    fn deduct_balance(&mut self, amount: u64) -> Result<(), CoreError>;
    fn increment_nonce(&mut self);
    fn is_contract(&self) -> bool;
}

impl AccountActions for Account {
    /// Adds balance to account
    fn add_balance(&mut self, amount: u64) {
        self.balance = self.balance.saturating_add(amount);
    }

    /// Deducts balance from account, returning error if insufficient funds
    fn deduct_balance(&mut self, amount: u64) -> Result<(), CoreError> {
        if self.balance < amount {
            return Err(CoreError::InsufficientBalance {
                balance: self.balance,
                required: amount,
            });
        }
        self.balance -= amount;
        Ok(())
    }

    /// Increments nonce by 1
    fn increment_nonce(&mut self) {
        self.nonce = self.nonce.saturating_add(1);
    }

    /// Checks if the account is a smart contract (has code)
    fn is_contract(&self) -> bool {
        self.code.is_some()
    }
}
