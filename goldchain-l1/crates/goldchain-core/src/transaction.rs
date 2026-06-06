pub use goldchain_types::{Transaction, TxType};
use goldchain_crypto::address::Address;
use crate::error::CoreError;

pub trait TransactionValidation {
    fn validate_basic(&self) -> Result<(), CoreError>;
}

pub trait StateAccessListVerification {
    /// Verifies that any dynamic state reads or writes are explicitly declared in the transaction's access list.
    /// If an undeclared address is touched, the execution immediately aborts to prevent concurrency conflicts.
    fn verify_state_access_list(&self, declared_access_list: &[Address], touched_address: &Address) -> Result<(), CoreError>;
}

pub trait ChainHaltProtection {
    /// Automatic Chain Halt Protection: Detects invalid state transitions or consensus corruption
    /// and triggers a safe halt condition rather than allowing state corruption.
    fn assert_chain_integrity(supply_circulating: u64, supply_staked: u64, expected_total: u64) -> Result<(), CoreError>;
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
        if self.fee < self.gas_limit {
            return Err(CoreError::InvalidTransaction(format!(
                "Transaction fee ({}) is less than gas limit ({})",
                self.fee, self.gas_limit
            )));
        }
        self.verify_signature().map_err(|e| CoreError::InvalidTransaction(e))
    }
}

impl StateAccessListVerification for Transaction {
    fn verify_state_access_list(&self, declared_access_list: &[Address], touched_address: &Address) -> Result<(), CoreError> {
        if !declared_access_list.contains(touched_address) {
            return Err(CoreError::InvalidTransaction(format!(
                "Security Breach: Touched address {:?} not declared in transaction state-access list!",
                touched_address
            )));
        }
        Ok(())
    }
}

impl ChainHaltProtection for Transaction {
    fn assert_chain_integrity(supply_circulating: u64, supply_staked: u64, expected_total: u64) -> Result<(), CoreError> {
        let actual_total = supply_circulating.saturating_add(supply_staked);
        if actual_total != expected_total {
            // Automatic self-halt simulation
            return Err(CoreError::StateError(format!(
                "CRITICAL halted: Supply invariant failure. Expected {}, got {}",
                expected_total, actual_total
            )));
        }
        Ok(())
    }
}

#[cfg(test)]
mod state_access_list_tests {
    use super::*;
    use goldchain_crypto::keys::PrivateKey;

    #[test]
    fn test_state_access_list_compliance() {
        let priv_key = PrivateKey::generate();
        let from_addr = Address::from_public_key(&priv_key.public_key());
        let to_addr = Address::from_public_key(&PrivateKey::generate().public_key());

        let tx = Transaction::new(from_addr, to_addr, 1000, 1, 10, 10, TxType::Transfer, Vec::new());

        let decl1 = Address::from_public_key(&PrivateKey::generate().public_key());
        let decl2 = Address::from_public_key(&PrivateKey::generate().public_key());
        let declared_list = vec![decl1.clone(), decl2.clone()];

        // Verified access
        assert!(tx.verify_state_access_list(&declared_list, &decl1).is_ok());

        // Security violation access
        let undeclared = Address::from_public_key(&PrivateKey::generate().public_key());
        assert!(tx.verify_state_access_list(&declared_list, &undeclared).is_err());
    }

    #[test]
    fn test_automatic_chain_halt_on_supply_violation() {
        // Correct invariant
        assert!(Transaction::assert_chain_integrity(7000, 3000, 10000).is_ok());

        // Violation invariant -> Halt
        assert!(Transaction::assert_chain_integrity(7000, 3000, 12000).is_err());
    }
}

