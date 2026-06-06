pub mod block;
pub mod transaction;
pub mod account;
pub mod mempool;
pub mod genesis;
pub mod error;
pub mod telemetry;
pub mod economics;
pub mod da;
pub mod light_client;
pub mod governance;
pub mod consensus;
pub mod vm;
pub mod p2p;
pub mod rpc;


#[cfg(test)]
mod tests {
    use super::block::{Block, BlockValidation};
    use super::transaction::{Transaction, TxType};
    use super::mempool::Mempool;
    use super::genesis;
    use goldchain_types::Account;
    use goldchain_crypto::keys::PrivateKey;
    use goldchain_crypto::address::Address;
    use goldchain_crypto::hash::Hash;

    #[test]
    fn test_transaction_signing_and_verification() {
        let sender_priv = PrivateKey::generate();
        let sender_pub = sender_priv.public_key();
        let sender_addr = Address::from_public_key(&sender_pub);

        let receiver_priv = PrivateKey::generate();
        let receiver_addr = Address::from_public_key(&receiver_priv.public_key());

        let mut tx = Transaction::new(
            sender_addr,
            receiver_addr,
            1000,
            1,
            10,
            10, // gas_limit
            TxType::Transfer,
            Vec::new(),
        );

        assert!(tx.verify_signature().is_err()); // Unsigned

        tx.sign(&sender_priv);
        assert!(tx.verify_signature().is_ok()); // Signed successfully

        // Tamper with the transaction
        tx.amount = 2000;
        assert!(tx.verify_signature().is_err()); // Signature mismatch
    }

    #[test]
    fn test_block_creation_and_linking() {
        let validator_priv = PrivateKey::generate();
        let validator_addr = Address::from_public_key(&validator_priv.public_key());

        let prev_hash = Hash([0u8; 32]);
        let state_root = Hash::digest(b"initial_state");

        let mut block0 = Block::new(
            0,
            1000000000,
            prev_hash,
            state_root,
            validator_addr.clone(),
            Vec::new(),
        );
        block0.sign(&validator_priv);
        assert!(block0.verify_signature().is_ok());

        let block0_hash = block0.hash();
        let next_state_root = Hash::digest(b"next_state");

        let mut block1 = Block::new(
            1,
            1000000400, // + 400ms block time
            block0_hash,
            next_state_root,
            validator_addr.clone(),
            Vec::new(),
        );
        block1.sign(&validator_priv);

        assert!(block1.validate_linkage(&block0).is_ok());
    }

    #[test]
    fn test_mempool_sorting() {
        let mempool_capacity = 10;
        let mut mempool = Mempool::new(mempool_capacity);
        let temp_dir = tempfile::TempDir::new().unwrap();
        let storage = goldchain_storage::Storage::open(temp_dir.path().join("db.redb")).unwrap();

        let sender_priv = PrivateKey::generate();
        let sender_addr = Address::from_public_key(&sender_priv.public_key());
        let receiver_addr = Address::from_public_key(&PrivateKey::generate().public_key());

        let sender_acct = Account::new(1000000, 1);
        storage.put_account(&sender_addr, &sender_acct).unwrap();

        // Create 3 txs with different fees but constant gas limits (to test fee-density prioritization)
        let mut tx1 = Transaction::new(sender_addr.clone(), receiver_addr.clone(), 100, 1, 10, 10, TxType::Transfer, Vec::new());
        tx1.sign(&sender_priv);

        let mut tx2 = Transaction::new(sender_addr.clone(), receiver_addr.clone(), 100, 2, 50, 10, TxType::Transfer, Vec::new());
        tx2.sign(&sender_priv);

        let mut tx3 = Transaction::new(sender_addr.clone(), receiver_addr.clone(), 100, 3, 25, 10, TxType::Transfer, Vec::new());
        tx3.sign(&sender_priv);

        mempool.add_tx(tx1.clone(), &storage).unwrap();
        mempool.add_tx(tx2.clone(), &storage).unwrap();
        mempool.add_tx(tx3.clone(), &storage).unwrap();

        assert_eq!(mempool.len(), 3);

        // Fetch txs for block, limit = 2
        let block_txs = mempool.get_transactions_for_block(2);
        assert_eq!(block_txs.len(), 2);
        // Fee priority: tx2 (50) first, then tx3 (25) second
        assert_eq!(block_txs[0].fee, 50);
        assert_eq!(block_txs[1].fee, 25);
    }

    #[test]
    fn test_mempool_rbf() {
        let mut mempool = Mempool::new(10);
        let temp_dir = tempfile::TempDir::new().unwrap();
        let storage = goldchain_storage::Storage::open(temp_dir.path().join("db.redb")).unwrap();

        let sender_priv = PrivateKey::generate();
        let sender_addr = Address::from_public_key(&sender_priv.public_key());
        let receiver_addr = Address::from_public_key(&PrivateKey::generate().public_key());

        let sender_acct = Account::new(1000000, 1);
        storage.put_account(&sender_addr, &sender_acct).unwrap();

        // Create transaction with fee = 10, nonce = 1
        let mut tx = Transaction::new(sender_addr.clone(), receiver_addr.clone(), 1000, 1, 10, 10, TxType::Transfer, Vec::new());
        tx.sign(&sender_priv);
        mempool.add_tx(tx.clone(), &storage).unwrap();

        // Create RBF transaction with same nonce = 1, but fee = 30
        let mut tx_rbf = Transaction::new(sender_addr.clone(), receiver_addr.clone(), 1000, 1, 30, 30, TxType::Transfer, Vec::new());
        tx_rbf.sign(&sender_priv);
        mempool.add_tx(tx_rbf.clone(), &storage).unwrap();

        // The mempool should have 1 tx, and its fee must be 30 (RBF replaced)
        assert_eq!(mempool.len(), 1);
        let active_txs = mempool.get_transactions_for_block(1);
        assert_eq!(active_txs[0].fee, 30);

        // Create another RBF transaction with fee = 32 (less than 10% increase from 30, which requires 33) -> should fail
        let mut tx_rbf_low = Transaction::new(sender_addr.clone(), receiver_addr.clone(), 1000, 1, 32, 32, TxType::Transfer, Vec::new());
        tx_rbf_low.sign(&sender_priv);
        assert!(mempool.add_tx(tx_rbf_low, &storage).is_err());
    }

    #[test]
    fn test_mempool_eviction() {
        let mut mempool = Mempool::new(2); // Capacity = 2
        let temp_dir = tempfile::TempDir::new().unwrap();
        let storage = goldchain_storage::Storage::open(temp_dir.path().join("db.redb")).unwrap();

        let sender_priv = PrivateKey::generate();
        let sender_addr = Address::from_public_key(&sender_priv.public_key());
        let receiver_addr = Address::from_public_key(&PrivateKey::generate().public_key());

        let sender_acct = Account::new(1000000, 1);
        storage.put_account(&sender_addr, &sender_acct).unwrap();

        let mut tx1 = Transaction::new(sender_addr.clone(), receiver_addr.clone(), 100, 1, 10, 10, TxType::Transfer, Vec::new());
        tx1.sign(&sender_priv);
        let mut tx2 = Transaction::new(sender_addr.clone(), receiver_addr.clone(), 100, 2, 20, 20, TxType::Transfer, Vec::new());
        tx2.sign(&sender_priv);

        mempool.add_tx(tx1.clone(), &storage).unwrap();
        mempool.add_tx(tx2.clone(), &storage).unwrap();
        assert_eq!(mempool.len(), 2);

        // Add third transaction with fee = 50 (higher than tx1's 10). tx1 should be evicted!
        let mut tx3 = Transaction::new(sender_addr.clone(), receiver_addr.clone(), 100, 3, 50, 50, TxType::Transfer, Vec::new());
        tx3.sign(&sender_priv);

        mempool.add_tx(tx3.clone(), &storage).unwrap();
        assert_eq!(mempool.len(), 2);
        assert!(mempool.contains(&tx3.hash()));
        assert!(mempool.contains(&tx2.hash()));
        assert!(!mempool.contains(&tx1.hash())); // Evicted!
    }

    #[test]
    fn test_mempool_ttl_expiry() {
        let mut mempool = Mempool::new(10);
        let temp_dir = tempfile::TempDir::new().unwrap();
        let storage = goldchain_storage::Storage::open(temp_dir.path().join("db.redb")).unwrap();

        let sender_priv = PrivateKey::generate();
        let sender_addr = Address::from_public_key(&sender_priv.public_key());
        let receiver_addr = Address::from_public_key(&PrivateKey::generate().public_key());

        let sender_acct = Account::new(1000000, 1);
        storage.put_account(&sender_addr, &sender_acct).unwrap();

        // Create transaction with creation_height = 5000, nonce = 1
        let mut tx = Transaction::new(sender_addr.clone(), receiver_addr.clone(), 100, 1, 10, 10, TxType::Transfer, Vec::new())
            .with_creation_height(5000);
        tx.sign(&sender_priv);

        mempool.add_tx(tx.clone(), &storage).unwrap();
        assert_eq!(mempool.len(), 1);

        // Evict at height 5050 => should NOT evict
        mempool.evict_expired(5050);
        assert_eq!(mempool.len(), 1);

        // Evict at height 5100 => should evict
        mempool.evict_expired(5100);
        assert_eq!(mempool.len(), 0);
    }

    #[test]
    fn test_genesis_block() {
        let treasury = Address::from_public_key(&PrivateKey::generate().public_key());
        let team = Address::from_public_key(&PrivateKey::generate().public_key());
        let fair_launch = Address::from_public_key(&PrivateKey::generate().public_key());

        let genesis_block = genesis::create_genesis_block(treasury, team, fair_launch);
        assert_eq!(genesis_block.header.height, 0);
        assert_eq!(genesis_block.header.prev_hash, Hash([0u8; 32]));
        assert_eq!(genesis_block.transactions.len(), 0);
    }
}


