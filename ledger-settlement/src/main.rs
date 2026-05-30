mod ledger;
mod settlement;
mod wallet;
mod custody;

use settlement::{SettlementEngine, TradeEvent};
use ledger::Currency;
use wallet::{EnterpriseWalletManager, WithdrawalRequest, Signature};

fn main() {
    println!("============================================================");
    println!("CloudExchange — Institutional Double-Entry Ledger & Settlement");
    println!("============================================================");

    // Initialize Settlement Engine
    let mut engine = SettlementEngine::new();

    println!("Executing initial treasury-backed user deposits...");
    // 1. Deposit 100,000 USDT to Buyer's account
    let buyer_user = "user_buyer_123".to_string();
    let deposit_amount_usdt = 100_000 * 100_000_000; // $100,000 with 8 decimals
    engine.deposit(buyer_user.clone(), Currency::USDT, deposit_amount_usdt).unwrap();

    // 2. Deposit 2 BTC to Seller's account
    let seller_user = "user_seller_456".to_string();
    let deposit_amount_btc = 2 * 100_000_000; // 2 BTC with 8 decimals
    engine.deposit(seller_user.clone(), Currency::BTC, deposit_amount_btc).unwrap();

    println!("Initial deposits completed successfully.");
    println!("------------------------------------------------------------");

    // 3. Perform a BTC_USDT Trade Settlement:
    // Buyer buys 1 BTC from Seller at $65,000.00
    println!("Processing Trade Settlement: 1.0 BTC @ $65,000.00...");
    let trade = TradeEvent {
        trade_id: 1,
        buyer_user_id: buyer_user.clone(),
        seller_user_id: seller_user.clone(),
        price: 65_000 * 100_000_000,   // $65,000.00
        quantity: 1 * 100_000_000,    // 1.0 BTC
        symbol: "BTC_USDT".to_string(),
    };

    match engine.settle_trade(trade) {
        Ok(tx_id) => {
            println!("Trade successfully settled in ledger! Tx UUID: {}", tx_id);
        }
        Err(e) => {
            eprintln!("[ERROR] Trade settlement failed: {}", e);
            return;
        }
    }
    println!("------------------------------------------------------------");

    // 4. Print post-settlement balances
    println!("Post-Settlement Balance Audit:");
    for (acct_id, balance) in &engine.ledger.balances {
        let account = &engine.ledger.accounts[acct_id];
        // Format balance value back to standard decimal units (divide by 10^8)
        let balance_decimal = *balance as f64 / 100_000_000.0;
        println!(
            "  Account: {} (User: {}, Type: {:?}) -> Balance: {:.4} {:?}",
            acct_id, account.user_id, account.account_type, balance_decimal, account.currency
        );
    }
    println!("------------------------------------------------------------");

    // 5. Run Reconciliation Audit
    println!("Running double-entry reconciliation audit...");
    match engine.ledger.audit_reconciliation() {
        Ok(_) => {
            println!("RECONCILIATION SUCCESSFUL: All ledger assets reconcile exactly.");
        }
        Err(e) => {
            eprintln!("[CRITICAL AUDIT ERROR] Ledger reconciliation failed: {}", e);
        }
    }
    println!("------------------------------------------------------------");

    // 6. Enterprise Wallet Security Simulation
    println!("Initiating Enterprise Wallet Security Routing Checks...");
    let wallet_manager = EnterpriseWalletManager::new();

    // Case A: Hot Wallet Withdrawal ($500.00 USDT)
    let req_hot = WithdrawalRequest {
        request_id: 201,
        asset: "USDT".to_string(),
        amount: 500 * 100_000_000,
        destination_address: "0xAddressHotWalletBuyer".to_string(),
    };
    wallet_manager.route_withdrawal(&req_hot, &[], None).unwrap();
    println!("------------------------------------------------------------");

    // Case B: Warm Wallet Withdrawal ($45,000.00 USDT) - Requires Multi-sig
    let req_warm = WithdrawalRequest {
        request_id: 202,
        asset: "USDT".to_string(),
        amount: 45_000 * 100_000_000,
        destination_address: "0xAddressWarmWalletMerchant".to_string(),
    };
    let warm_signatures = vec![
        Signature {
            signer_id: "officer_compliance_1".to_string(),
            signature_hex: "sig_val_1".to_string(),
        },
        Signature {
            signer_id: "officer_operations_2".to_string(),
            signature_hex: "sig_val_2".to_string(),
        },
    ];
    wallet_manager.route_withdrawal(&req_warm, &warm_signatures, None).unwrap();
    println!("------------------------------------------------------------");

    // Case C: Cold Wallet Withdrawal ($250,000.00 USDT) - Requires HSM
    let req_cold = WithdrawalRequest {
        request_id: 203,
        asset: "USDT".to_string(),
        amount: 250_000 * 100_000_000,
        destination_address: "0xAddressColdWalletOfflineStorage".to_string(),
    };
    let hsm_signature = "hsm_sig_valid_9918231af8".to_string();
    wallet_manager.route_withdrawal(&req_cold, &[], Some(&hsm_signature)).unwrap();
    println!("------------------------------------------------------------");

    // Case D: Cold Wallet Fraud/Incorrect HSM Check
    let req_fraud = WithdrawalRequest {
        request_id: 204,
        asset: "USDT".to_string(),
        amount: 300_000 * 100_000_000,
        destination_address: "0xAddressAttacker".to_string(),
    };
    let invalid_hsm_signature = "hsm_sig_invalid_bad_data".to_string();
    match wallet_manager.route_withdrawal(&req_fraud, &[], Some(&invalid_hsm_signature)) {
        Ok(_) => panic!("Security Breach: Cold wallet unauthorized release!"),
        Err(e) => println!("  [SECURITY REJECTED SUCCESS] Verification failed as expected: {}", e),
    }

    println!("============================================================");
}
