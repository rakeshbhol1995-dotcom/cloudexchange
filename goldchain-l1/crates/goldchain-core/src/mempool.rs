use std::collections::HashMap;
use goldchain_crypto::hash::Hash;
use goldchain_crypto::address::Address;
use crate::transaction::{Transaction, TransactionValidation};
use crate::error::CoreError;
use goldchain_storage::Storage;

pub struct Mempool {
    // Map of transaction hash -> Transaction
    pub transactions: HashMap<Hash, Transaction>,
    // Tracks maximum mempool size to prevent DDoS
    pub capacity: usize,
    // Per-sender transaction limit (spammer protection)
    pub max_txs_per_sender: usize,
    // Index map of sender address -> count of pending transactions
    pub sender_counts: HashMap<Address, usize>,
    // Index map of (sender, nonce) -> transaction hash in mempool
    pub sender_nonces: HashMap<(Address, u64), Hash>,
}

impl Mempool {
    /// Creates a new mempool with a given capacity
    pub fn new(capacity: usize) -> Self {
        Mempool {
            transactions: HashMap::new(),
            capacity,
            max_txs_per_sender: 16,
            sender_counts: HashMap::new(),
            sender_nonces: HashMap::new(),
        }
    }

    /// Adds a transaction to the mempool after verification. Supports Replace-By-Fee (RBF) and eviction.
    pub fn add_tx(&mut self, tx: Transaction, storage: &Storage) -> Result<(), CoreError> {
        // Basic stateless checks first
        tx.validate_basic()?;

        if tx.fee < tx.gas_limit {
            return Err(CoreError::InvalidTransaction(format!(
                "Transaction fee {} is less than gas limit {}",
                tx.fee, tx.gas_limit
            )));
        }

        // Stateful checks against storage snapshot to prevent mempool spam
        let sender_acct = storage.get_account(&tx.from)?.unwrap_or_default();
        if tx.nonce < sender_acct.nonce {
            return Err(CoreError::InvalidTransaction(format!(
                "Nonce too low: got {}, expected at least {}",
                tx.nonce, sender_acct.nonce
            )));
        }
        let total_required = tx.amount.checked_add(tx.fee).ok_or_else(|| {
            CoreError::InvalidTransaction("Overflow when computing transaction cost".to_string())
        })?;
        if sender_acct.balance < total_required {
            return Err(CoreError::InvalidTransaction(format!(
                "Insufficient balance: sender has {}, requires {}",
                sender_acct.balance, total_required
            )));
        }

        let tx_hash = tx.hash();
        if self.transactions.contains_key(&tx_hash) {
            return Err(CoreError::InvalidTransaction("Transaction already in mempool".to_string()));
        }

        // 1. Enforce per-sender transaction limit (max 16 txs) using O(1) index lookup
        let sender_tx_count = *self.sender_counts.get(&tx.from).unwrap_or(&0);
        
        // 2. Check Replace-By-Fee (RBF) using O(1) index lookup
        let rbf_target = self.sender_nonces.get(&(tx.from.clone(), tx.nonce)).cloned();

        if let Some(target_hash) = rbf_target {
            if let Some(existing_tx) = self.transactions.get(&target_hash) {
                let required_fee = existing_tx.fee.checked_add(existing_tx.fee / 10).unwrap_or(u64::MAX);
                if tx.fee >= required_fee {
                    // Evict old RBF transaction to insert new one
                    self.transactions.remove(&target_hash);
                    self.sender_nonces.remove(&(tx.from.clone(), tx.nonce));
                    
                    self.transactions.insert(tx_hash, tx.clone());
                    self.sender_nonces.insert((tx.from.clone(), tx.nonce), tx_hash);
                    
                    // Note: sender_counts remains unchanged since we replaced a transaction
                    return Ok(());
                } else {
                    return Err(CoreError::InvalidTransaction(
                        format!("Transaction replacement fee is too low: got {}, must be at least {} (10% increase)", tx.fee, required_fee)
                    ));
                }
            }
        }

        // Check sender limit if not replacing a transaction
        if sender_tx_count >= self.max_txs_per_sender {
            return Err(CoreError::InvalidTransaction(format!(
                "Mempool spam protection: Sender exceeds maximum limit of {} pending transactions",
                self.max_txs_per_sender
            )));
        }

        // 3. Check Eviction if mempool is at capacity
        if self.transactions.len() >= self.capacity {
            // Find lowest fee transaction (O(N) during eviction, which is rare)
            let lowest_tx = self.transactions.iter()
                .min_by(|(_, a), (_, b)| a.fee.cmp(&b.fee));

            if let Some((lowest_hash, lowest_tx_val)) = lowest_tx {
                if tx.fee > lowest_tx_val.fee {
                    let evicted_hash = lowest_hash.clone();
                    
                    // Safely remove evicted transaction
                    if let Some(evicted_tx) = self.transactions.remove(&evicted_hash) {
                        if let Some(count) = self.sender_counts.get_mut(&evicted_tx.from) {
                            if *count > 0 { *count -= 1; }
                            if *count == 0 { self.sender_counts.remove(&evicted_tx.from); }
                        }
                        self.sender_nonces.remove(&(evicted_tx.from.clone(), evicted_tx.nonce));
                    }

                    // Insert new transaction
                    self.transactions.insert(tx_hash, tx.clone());
                    *self.sender_counts.entry(tx.from.clone()).or_insert(0) += 1;
                    self.sender_nonces.insert((tx.from.clone(), tx.nonce), tx_hash);
                    return Ok(());
                } else {
                    return Err(CoreError::InvalidTransaction(
                        "Mempool is at capacity and transaction fee is too low for eviction".to_string()
                    ));
                }
            }
        }

        // Normal insertion
        self.transactions.insert(tx_hash, tx.clone());
        *self.sender_counts.entry(tx.from.clone()).or_insert(0) += 1;
        self.sender_nonces.insert((tx.from.clone(), tx.nonce), tx_hash);
        Ok(())
    }

    /// Evicts expired transactions from the mempool (simulated age limit of 100 block/ticks)
    pub fn evict_expired(&mut self, current_height: u64) {
        let max_expiry_blocks = 100u64;
        let mut to_remove = Vec::new();
        for (hash, tx) in &self.transactions {
            if current_height >= tx.creation_height + max_expiry_blocks {
                to_remove.push(hash.clone());
            }
        }
        self.remove_txs(&to_remove);
    }

    /// Retrieves up to `limit` transactions sorted by highest fee
    pub fn get_transactions_for_block(&self, limit: usize) -> Vec<Transaction> {
        let mut tx_list: Vec<&Transaction> = self.transactions.values().collect();
        // Sort descending by fee density (fee / gas_limit) using u128 cross-multiplication, then by nonce (ascending)
        tx_list.sort_by(|a, b| {
            let density_a = (a.fee as u128).saturating_mul(b.gas_limit.max(1) as u128);
            let density_b = (b.fee as u128).saturating_mul(a.gas_limit.max(1) as u128);
            density_b.cmp(&density_a)
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
            if let Some(tx) = self.transactions.remove(hash) {
                if let Some(count) = self.sender_counts.get_mut(&tx.from) {
                    if *count > 0 { *count -= 1; }
                    if *count == 0 { self.sender_counts.remove(&tx.from); }
                }
                self.sender_nonces.remove(&(tx.from.clone(), tx.nonce));
            }
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
