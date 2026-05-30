use std::collections::HashMap;
use goldchain_crypto::hash::Hash;
use crate::transaction::{Transaction, TransactionValidation};
use crate::error::CoreError;

pub struct Mempool {
    // Map of transaction hash -> Transaction
    pub transactions: HashMap<Hash, Transaction>,
    // Tracks maximum mempool size to prevent DDoS
    pub capacity: usize,
}

impl Mempool {
    /// Creates a new mempool with a given capacity
    pub fn new(capacity: usize) -> Self {
        Mempool {
            transactions: HashMap::new(),
            capacity,
        }
    }

    /// Adds a transaction to the mempool after verification. Supports Replace-By-Fee (RBF) and eviction.
    pub fn add_tx(&mut self, tx: Transaction) -> Result<(), CoreError> {
        // Basic stateless checks first
        tx.validate_basic()?;

        let tx_hash = tx.hash();
        if self.transactions.contains_key(&tx_hash) {
            return Err(CoreError::InvalidTransaction("Transaction already in mempool".to_string()));
        }

        // 1. Check Replace-By-Fee (RBF): same sender and same nonce
        let mut rbf_target = None;
        for (hash, existing_tx) in &self.transactions {
            if existing_tx.from == tx.from && existing_tx.nonce == tx.nonce {
                if tx.fee > existing_tx.fee {
                    rbf_target = Some(hash.clone());
                    break;
                } else {
                    return Err(CoreError::InvalidTransaction(
                        "Transaction replacement fee is too low (must be strictly greater)".to_string()
                    ));
                }
            }
        }

        if let Some(target_hash) = rbf_target {
            self.transactions.remove(&target_hash);
            self.transactions.insert(tx_hash, tx);
            return Ok(());
        }

        // 2. Check Eviction if mempool is at capacity
        if self.transactions.len() >= self.capacity {
            // Find lowest fee transaction
            let lowest_tx = self.transactions.iter()
                .min_by(|(_, a), (_, b)| a.fee.cmp(&b.fee));

            if let Some((lowest_hash, lowest_tx_val)) = lowest_tx {
                if tx.fee > lowest_tx_val.fee {
                    let evicted_hash = lowest_hash.clone();
                    self.transactions.remove(&evicted_hash);
                    self.transactions.insert(tx_hash, tx);
                    return Ok(());
                } else {
                    return Err(CoreError::InvalidTransaction(
                        "Mempool is at capacity and transaction fee is too low for eviction".to_string()
                    ));
                }
            }
        }

        self.transactions.insert(tx_hash, tx);
        Ok(())
    }

    /// Retrieves up to `limit` transactions sorted by highest fee
    pub fn get_transactions_for_block(&self, limit: usize) -> Vec<Transaction> {
        let mut tx_list: Vec<&Transaction> = self.transactions.values().collect();
        // Sort descending by fee, then by nonce (ascending)
        tx_list.sort_by(|a, b| {
            b.fee.cmp(&a.fee)
                .then_with(|| a.nonce.cmp(&b.nonce))
        });

        tx_list.into_iter()
            .take(limit)
            .cloned()
            .collect()
    }

    /// Removes transactions (after block inclusion)
    pub fn remove_txs(&mut self, tx_hashes: &[Hash]) {
        for hash in tx_hashes {
            self.transactions.remove(hash);
        }
    }

    /// Returns the count of transactions in the mempool
    pub fn len(&self) -> usize {
        self.transactions.len()
    }

    /// Checks if a transaction is in the mempool
    pub fn contains(&self, hash: &Hash) -> bool {
        self.transactions.contains_key(hash)
    }
}
