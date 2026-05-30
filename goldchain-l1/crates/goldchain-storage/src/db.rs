use std::path::Path;
use std::sync::Arc;
use redb::{Database, TableDefinition};
use borsh::BorshDeserialize;
use goldchain_crypto::hash::Hash;
use goldchain_crypto::address::Address;
use goldchain_types::{Block, Transaction, Account, Receipt, Event};
use crate::error::StorageError;

pub const TABLE_BLOCKS: TableDefinition<u64, &[u8]> = TableDefinition::new("blocks");
pub const TABLE_BLOCK_HASHES: TableDefinition<&[u8], u64> = TableDefinition::new("block_hashes");
pub const TABLE_STATE: TableDefinition<&str, &[u8]> = TableDefinition::new("state");
pub const TABLE_TXS: TableDefinition<&[u8], &[u8]> = TableDefinition::new("txs");
pub const TABLE_RECEIPTS: TableDefinition<&[u8], &[u8]> = TableDefinition::new("receipts");
pub const TABLE_IDX_ADDRESS_TXS: TableDefinition<&[u8], &[u8]> = TableDefinition::new("idx_address_txs");
pub const TABLE_IDX_EVENT_TOPIC: TableDefinition<&[u8], &[u8]> = TableDefinition::new("idx_event_topic");

#[derive(Clone)]
pub struct Storage {
    db: Arc<Database>,
}

impl Storage {
    /// Opens a ReDB instance at the specified path (creating the file if missing)
    pub fn open(path: impl AsRef<Path>) -> Result<Self, StorageError> {
        let db = Database::create(path).map_err(|e| StorageError::DbError(e.to_string()))?;
        
        // Open a write transaction to initialize all tables
        let write_txn = db.begin_write().map_err(|e| StorageError::DbError(e.to_string()))?;
        {
            let _ = write_txn.open_table(TABLE_BLOCKS).map_err(|e| StorageError::DbError(e.to_string()))?;
            let _ = write_txn.open_table(TABLE_BLOCK_HASHES).map_err(|e| StorageError::DbError(e.to_string()))?;
            let _ = write_txn.open_table(TABLE_STATE).map_err(|e| StorageError::DbError(e.to_string()))?;
            let _ = write_txn.open_table(TABLE_TXS).map_err(|e| StorageError::DbError(e.to_string()))?;
            let _ = write_txn.open_table(TABLE_RECEIPTS).map_err(|e| StorageError::DbError(e.to_string()))?;
            let _ = write_txn.open_table(TABLE_IDX_ADDRESS_TXS).map_err(|e| StorageError::DbError(e.to_string()))?;
            let _ = write_txn.open_table(TABLE_IDX_EVENT_TOPIC).map_err(|e| StorageError::DbError(e.to_string()))?;
        }
        write_txn.commit().map_err(|e| StorageError::DbError(e.to_string()))?;

        Ok(Storage { db: Arc::new(db) })
    }

    // --- Block Storage Methods ---

    /// Writes block data, maps block hash to height, and indexes all transactions/events inside it
    pub fn put_block(&self, block: &Block) -> Result<(), StorageError> {
        let block_bytes = borsh::to_vec(block)?;
        let block_hash = block.hash();

        let write_txn = self.db.begin_write().map_err(|e| StorageError::DbError(e.to_string()))?;
        {
            let mut blocks_table = write_txn.open_table(TABLE_BLOCKS).map_err(|e| StorageError::DbError(e.to_string()))?;
            blocks_table.insert(block.header.height, block_bytes.as_slice()).map_err(|e| StorageError::DbError(e.to_string()))?;

            let mut hashes_table = write_txn.open_table(TABLE_BLOCK_HASHES).map_err(|e| StorageError::DbError(e.to_string()))?;
            hashes_table.insert(block_hash.as_ref(), block.header.height).map_err(|e| StorageError::DbError(e.to_string()))?;

            // Put transactions inside this transaction
            let mut txs_table = write_txn.open_table(TABLE_TXS).map_err(|e| StorageError::DbError(e.to_string()))?;
            let mut idx_addr_table = write_txn.open_table(TABLE_IDX_ADDRESS_TXS).map_err(|e| StorageError::DbError(e.to_string()))?;

            for tx in &block.transactions {
                let tx_bytes = borsh::to_vec(tx)?;
                let tx_hash = tx.hash();
                txs_table.insert(tx_hash.as_ref(), tx_bytes.as_slice()).map_err(|e| StorageError::DbError(e.to_string()))?;

                // Index sender
                let sender_pub = tx.from.to_public_key().map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
                let mut sender_key = Vec::with_capacity(32 + 32);
                sender_key.extend_from_slice(&sender_pub.to_bytes());
                sender_key.extend_from_slice(tx_hash.as_ref());
                idx_addr_table.insert(sender_key.as_slice(), &[] as &[u8]).map_err(|e| StorageError::DbError(e.to_string()))?;

                // Index recipient
                let recipient_pub = tx.to.to_public_key().map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
                let mut recipient_key = Vec::with_capacity(32 + 32);
                recipient_key.extend_from_slice(&recipient_pub.to_bytes());
                recipient_key.extend_from_slice(tx_hash.as_ref());
                idx_addr_table.insert(recipient_key.as_slice(), &[] as &[u8]).map_err(|e| StorageError::DbError(e.to_string()))?;
            }
        }
        write_txn.commit().map_err(|e| StorageError::DbError(e.to_string()))?;

        Ok(())
    }

    /// Fetches block details using block height (u64)
    pub fn get_block_by_height(&self, height: u64) -> Result<Option<Block>, StorageError> {
        let read_txn = self.db.begin_read().map_err(|e| StorageError::DbError(e.to_string()))?;
        let table = read_txn.open_table(TABLE_BLOCKS).map_err(|e| StorageError::DbError(e.to_string()))?;
        
        match table.get(height).map_err(|e| StorageError::DbError(e.to_string()))? {
            Some(guard) => {
                let bytes = guard.value();
                let block = Block::deserialize(&mut &bytes[..])?;
                Ok(Some(block))
            }
            None => Ok(None),
        }
    }

    /// Fetches block details using block header hash
    pub fn get_block_by_hash(&self, hash: &Hash) -> Result<Option<Block>, StorageError> {
        let read_txn = self.db.begin_read().map_err(|e| StorageError::DbError(e.to_string()))?;
        let hashes_table = read_txn.open_table(TABLE_BLOCK_HASHES).map_err(|e| StorageError::DbError(e.to_string()))?;

        match hashes_table.get(hash.as_ref()).map_err(|e| StorageError::DbError(e.to_string()))? {
            Some(guard) => {
                let height = guard.value();
                self.get_block_by_height(height)
            }
            None => Ok(None),
        }
    }

    // --- State Storage Methods ---

    /// Writes account state to the database
    pub fn put_account(&self, address: &Address, account: &Account) -> Result<(), StorageError> {
        let write_txn = self.db.begin_write().map_err(|e| StorageError::DbError(e.to_string()))?;
        {
            let mut table = write_txn.open_table(TABLE_STATE).map_err(|e| StorageError::DbError(e.to_string()))?;
            let bytes = borsh::to_vec(account)?;
            table.insert(address.as_str(), bytes.as_slice()).map_err(|e| StorageError::DbError(e.to_string()))?;
        }
        write_txn.commit().map_err(|e| StorageError::DbError(e.to_string()))?;
        Ok(())
    }

    /// Reads account state from the database
    pub fn get_account(&self, address: &Address) -> Result<Option<Account>, StorageError> {
        let read_txn = self.db.begin_read().map_err(|e| StorageError::DbError(e.to_string()))?;
        let table = read_txn.open_table(TABLE_STATE).map_err(|e| StorageError::DbError(e.to_string()))?;
        
        match table.get(address.as_str()).map_err(|e| StorageError::DbError(e.to_string()))? {
            Some(guard) => {
                let bytes = guard.value();
                let account = Account::deserialize(&mut &bytes[..])?;
                Ok(Some(account))
            }
            None => Ok(None),
        }
    }

    // --- Transaction Storage Methods ---

    /// Writes raw transaction data to database
    pub fn put_transaction(&self, tx: &Transaction) -> Result<(), StorageError> {
        let write_txn = self.db.begin_write().map_err(|e| StorageError::DbError(e.to_string()))?;
        {
            let mut table = write_txn.open_table(TABLE_TXS).map_err(|e| StorageError::DbError(e.to_string()))?;
            let tx_hash = tx.hash();
            let bytes = borsh::to_vec(tx)?;
            table.insert(tx_hash.as_ref(), bytes.as_slice()).map_err(|e| StorageError::DbError(e.to_string()))?;
        }
        write_txn.commit().map_err(|e| StorageError::DbError(e.to_string()))?;
        Ok(())
    }

    /// Reads raw transaction details from database
    pub fn get_transaction(&self, hash: &Hash) -> Result<Option<Transaction>, StorageError> {
        let read_txn = self.db.begin_read().map_err(|e| StorageError::DbError(e.to_string()))?;
        let table = read_txn.open_table(TABLE_TXS).map_err(|e| StorageError::DbError(e.to_string()))?;
        
        match table.get(hash.as_ref()).map_err(|e| StorageError::DbError(e.to_string()))? {
            Some(guard) => {
                let bytes = guard.value();
                let tx = Transaction::deserialize(&mut &bytes[..])?;
                Ok(Some(tx))
            }
            None => Ok(None),
        }
    }

    // --- Receipt/Event Storage Methods ---

    /// Writes transaction receipt outcome to database
    pub fn put_receipt(&self, receipt: &Receipt) -> Result<(), StorageError> {
        let write_txn = self.db.begin_write().map_err(|e| StorageError::DbError(e.to_string()))?;
        {
            let mut receipts_table = write_txn.open_table(TABLE_RECEIPTS).map_err(|e| StorageError::DbError(e.to_string()))?;
            let bytes = borsh::to_vec(receipt)?;
            receipts_table.insert(receipt.tx_hash.as_ref(), bytes.as_slice()).map_err(|e| StorageError::DbError(e.to_string()))?;

            let mut events_table = write_txn.open_table(TABLE_IDX_EVENT_TOPIC).map_err(|e| StorageError::DbError(e.to_string()))?;
            // Index events
            for (event_idx, event) in receipt.events.iter().enumerate() {
                let event_bytes = borsh::to_vec(event)?;
                for topic in &event.topics {
                    // Key: Topic Hash (32 bytes) + Tx Hash (32 bytes) + Event Index (4 bytes)
                    let mut key = Vec::with_capacity(32 + 32 + 4);
                    key.extend_from_slice(topic.as_ref());
                    key.extend_from_slice(receipt.tx_hash.as_ref());
                    key.extend_from_slice(&(event_idx as u32).to_be_bytes());

                    events_table.insert(key.as_slice(), event_bytes.as_slice()).map_err(|e| StorageError::DbError(e.to_string()))?;
                }
            }
        }
        write_txn.commit().map_err(|e| StorageError::DbError(e.to_string()))?;
        Ok(())
    }

    /// Reads transaction receipt outcome from database
    pub fn get_receipt(&self, tx_hash: &Hash) -> Result<Option<Receipt>, StorageError> {
        let read_txn = self.db.begin_read().map_err(|e| StorageError::DbError(e.to_string()))?;
        let table = read_txn.open_table(TABLE_RECEIPTS).map_err(|e| StorageError::DbError(e.to_string()))?;
        
        match table.get(tx_hash.as_ref()).map_err(|e| StorageError::DbError(e.to_string()))? {
            Some(guard) => {
                let bytes = guard.value();
                let receipt = Receipt::deserialize(&mut &bytes[..])?;
                Ok(Some(receipt))
            }
            None => Ok(None),
        }
    }

    // --- Indexer Query Methods ---

    /// Returns list of all transaction hashes associated with a given Address
    pub fn get_transactions_by_address(&self, address: &Address) -> Result<Vec<Hash>, StorageError> {
        let read_txn = self.db.begin_read().map_err(|e| StorageError::DbError(e.to_string()))?;
        let table = read_txn.open_table(TABLE_IDX_ADDRESS_TXS).map_err(|e| StorageError::DbError(e.to_string()))?;

        let pub_key = address.to_public_key().map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        let prefix = pub_key.to_bytes();

        let mut tx_hashes = Vec::new();

        // Scan keys starting with prefix
        let range = table.range(prefix.as_slice()..).map_err(|e| StorageError::DbError(e.to_string()))?;
        for result in range {
            let (key_guard, _) = result.map_err(|e| StorageError::DbError(e.to_string()))?;
            let key = key_guard.value();
            
            if !key.starts_with(&prefix) {
                break;
            }
            if key.len() == prefix.len() + 32 {
                let mut hash_bytes = [0u8; 32];
                hash_bytes.copy_from_slice(&key[prefix.len()..]);
                tx_hashes.push(Hash(hash_bytes));
            }
        }

        Ok(tx_hashes)
    }

    /// Returns all events matching a given topic hash
    pub fn get_events_by_topic(&self, topic: &Hash) -> Result<Vec<Event>, StorageError> {
        let read_txn = self.db.begin_read().map_err(|e| StorageError::DbError(e.to_string()))?;
        let table = read_txn.open_table(TABLE_IDX_EVENT_TOPIC).map_err(|e| StorageError::DbError(e.to_string()))?;

        let prefix = topic.as_ref();
        let mut events = Vec::new();

        let range = table.range(prefix..).map_err(|e| StorageError::DbError(e.to_string()))?;
        for result in range {
            let (key_guard, value_guard) = result.map_err(|e| StorageError::DbError(e.to_string()))?;
            let key = key_guard.value();
            let value = value_guard.value();

            if !key.starts_with(prefix) {
                break;
            }
            let event = Event::deserialize(&mut &value[..])?;
            events.push(event);
        }

        Ok(events)
    }
}
