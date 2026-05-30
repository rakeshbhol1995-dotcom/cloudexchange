use goldchain_crypto::hash::Hash;
use goldchain_crypto::address::Address;
use crate::block::Block;

// Total Supply: 21,000,000 GRM
// Decimals: 9
// 21,000,000 * 1,000,000,000 = 21_000_000_000_000_000 subunits
pub const GRM_DECIMALS: u32 = 9;
pub const GRM_UNIT: u64 = 1_000_000_000;
pub const TOTAL_SUPPLY_SUBUNITS: u64 = 21_000_000 * GRM_UNIT;

// Allocations
pub const FAIR_LAUNCH_ALLOCATION: u64 = 17_850_000 * GRM_UNIT; // 85%
pub const TREASURY_ALLOCATION: u64 = 2_100_000 * GRM_UNIT;     // 10%
pub const TEAM_ALLOCATION: u64 = 1_050_000 * GRM_UNIT;         // 5%

/// Creates the hardcoded Genesis block (Block 0) of the Gold Chain L1
pub fn create_genesis_block(
    _treasury_addr: Address,
    _team_addr: Address,
    _fair_launch_addr: Address,
) -> Block {
    let prev_hash = Hash([0u8; 32]);
    
    // Initial state root representation for genesis block
    // (In full execution, this would be the Merkle root of the initial accounts)
    let state_root = Hash::digest(b"genesis_state_root");

    // Block height 0, timestamp hardcoded to a fixed milestone: e.g. 2026-01-01 00:00:00 UTC (1767225600)
    let genesis_timestamp = 1767225600;
    
    // System address for block production representation at genesis
    let genesis_system_validator = Address(String::from("gold1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4rshq"));

    Block::new(
        0,
        genesis_timestamp,
        prev_hash,
        state_root,
        genesis_system_validator,
        Vec::new(), // Genesis block does not contain transaction logs, it sets the initial state
    )
}
