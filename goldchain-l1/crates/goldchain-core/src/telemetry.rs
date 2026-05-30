use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

#[derive(Clone, Default, Debug)]
pub struct Telemetry {
    pub chain_height: Arc<AtomicU64>,
    pub total_transactions_processed: Arc<AtomicU64>,
    pub total_gas_used: Arc<AtomicU64>,
    pub last_block_validation_time_ms: Arc<AtomicU64>,
    pub active_peers: Arc<AtomicU64>,
    pub mempool_size: Arc<AtomicU64>,
}

impl Telemetry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn set_chain_height(&self, height: u64) {
        self.chain_height.store(height, Ordering::Relaxed);
    }

    pub fn increment_txs(&self, count: u64) {
        self.total_transactions_processed.fetch_add(count, Ordering::Relaxed);
    }

    pub fn increment_gas(&self, gas: u64) {
        self.total_gas_used.fetch_add(gas, Ordering::Relaxed);
    }

    pub fn set_last_block_validation_time(&self, ms: u64) {
        self.last_block_validation_time_ms.store(ms, Ordering::Relaxed);
    }

    pub fn set_active_peers(&self, peers: u64) {
        self.active_peers.store(peers, Ordering::Relaxed);
    }

    pub fn set_mempool_size(&self, size: u64) {
        self.mempool_size.store(size, Ordering::Relaxed);
    }

    pub fn print_report(&self) {
        println!(
            "[TELEMETRY] Height: {} | Txs: {} | Gas: {} | LastBlockTime: {}ms | Peers: {} | Mempool: {}",
            self.chain_height.load(Ordering::Relaxed),
            self.total_transactions_processed.load(Ordering::Relaxed),
            self.total_gas_used.load(Ordering::Relaxed),
            self.last_block_validation_time_ms.load(Ordering::Relaxed),
            self.active_peers.load(Ordering::Relaxed),
            self.mempool_size.load(Ordering::Relaxed)
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_telemetry_flow() {
        let telemetry = Telemetry::new();
        telemetry.set_chain_height(100);
        telemetry.increment_txs(5);
        telemetry.increment_gas(15000);
        telemetry.set_last_block_validation_time(42);
        telemetry.set_active_peers(8);
        telemetry.set_mempool_size(23);

        assert_eq!(telemetry.chain_height.load(Ordering::Relaxed), 100);
        assert_eq!(telemetry.total_transactions_processed.load(Ordering::Relaxed), 5);
        assert_eq!(telemetry.total_gas_used.load(Ordering::Relaxed), 15000);
        assert_eq!(telemetry.last_block_validation_time_ms.load(Ordering::Relaxed), 42);
        assert_eq!(telemetry.active_peers.load(Ordering::Relaxed), 8);
        assert_eq!(telemetry.mempool_size.load(Ordering::Relaxed), 23);
    }
}
