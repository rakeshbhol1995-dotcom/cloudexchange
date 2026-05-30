pub mod db;
pub mod error;

pub use db::Storage;
pub use error::StorageError;

#[cfg(test)]
mod tests {
    use super::db::Storage;
    use tempfile::TempDir;
    use goldchain_crypto::keys::PrivateKey;
    use goldchain_crypto::address::Address;
    use goldchain_crypto::hash::Hash;
    use goldchain_types::{Block, Transaction, TxType, Account, Receipt, Event};

    #[test]
    fn test_storage_put_and_get() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("storage.redb");
        let storage = Storage::open(db_path).unwrap();

        // 1. Test account storage
        let priv_key = PrivateKey::generate();
        let address = Address::from_public_key(&priv_key.public_key());
        let account = Account::new(100_000, 5);
        storage.put_account(&address, &account).unwrap();

        let retrieved = storage.get_account(&address).unwrap().unwrap();
        assert_eq!(retrieved.balance, 100_000);
        assert_eq!(retrieved.nonce, 5);

        // 2. Test transaction storage and indexing
        let mut tx = Transaction::new(
            address.clone(),
            Address::from_public_key(&PrivateKey::generate().public_key()),
            5000,
            5,
            10,
            TxType::Transfer,
            Vec::new()
        );
        tx.sign(&priv_key);
        storage.put_transaction(&tx).unwrap();

        let retrieved_tx = storage.get_transaction(&tx.hash()).unwrap().unwrap();
        assert_eq!(retrieved_tx.amount, 5000);

        // 3. Test block storage and hash lookup
        let block = Block::new(
            15,
            123456789,
            Hash([1u8; 32]),
            Hash([2u8; 32]),
            address.clone(),
            vec![tx.clone()]
        );
        storage.put_block(&block).unwrap();

        let retrieved_block = storage.get_block_by_height(15).unwrap().unwrap();
        assert_eq!(retrieved_block.header.timestamp, 123456789);

        let retrieved_block_by_hash = storage.get_block_by_hash(&block.hash()).unwrap().unwrap();
        assert_eq!(retrieved_block_by_hash.header.height, 15);

        // 4. Test indexer address lookup
        let tx_hashes = storage.get_transactions_by_address(&address).unwrap();
        assert_eq!(tx_hashes.len(), 1);
        assert_eq!(tx_hashes[0], tx.hash());

        // 5. Test receipt storage and event indexing
        let topic = Hash::digest(b"TransferEvent");
        let event = Event {
            address: address.clone(),
            topics: vec![topic.clone()],
            data: vec![9, 9, 9]
        };
        let receipt = Receipt::new_success(tx.hash(), 50, vec![event]);
        storage.put_receipt(&receipt).unwrap();

        let retrieved_receipt = storage.get_receipt(&tx.hash()).unwrap().unwrap();
        assert_eq!(retrieved_receipt.gas_used, 50);

        let retrieved_events = storage.get_events_by_topic(&topic).unwrap();
        assert_eq!(retrieved_events.len(), 1);
        assert_eq!(retrieved_events[0].data, vec![9, 9, 9]);
    }
}
