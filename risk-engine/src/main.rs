mod risk;
mod market_surveillance;

use risk::{RiskEngine, MarginAccount, Position};
use market_surveillance::MarketSurveillance;
use std::collections::HashMap;

fn main() {
    println!("============================================================");
    println!("CloudExchange — Risk, Liquidation & Market Surveillance Engine");
    println!("============================================================");

    // 1. Initialize Risk Engine (5% MMR, 10% IMR)
    let mut risk_engine = RiskEngine::new(0.05, 0.10);
    let mut insurance_fund = 50_000 * 100_000_000; // $50,000 USDT in Insurance Fund

    // 2. Create Margin Account
    let user_id = "user_trader_777".to_string();
    let mut account = MarginAccount {
        user_id: user_id.clone(),
        collateral: 10_000 * 100_000_000, // $10,000 USDT collateral
        positions: HashMap::new(),
    };

    // Open a Long Position: 2.0 BTC @ $65,000.00 (2x leverage, Position Value = $130,000)
    let btc_long = Position {
        symbol: "BTC_USDT".to_string(),
        size: 2 * 100_000_000, // 2.0 BTC
        entry_price: 65_000 * 100_000_000,
        leverage: 10,
    };
    account.positions.insert("BTC_USDT".to_string(), btc_long);

    println!("Margin Account Opened:");
    println!("  User ID   : {}", account.user_id);
    println!("  Collateral: $10,000.00 USDT");
    println!("  Position  : Long 2.0 BTC @ $65,000.00");
    println!("------------------------------------------------------------");

    // 3. Volatility feed simulation: BTC experiences a flash crash
    let mut prev_price = 65_000 * 100_000_000;
    println!("Simulating dynamic price feed volatility escalation:");
    for &next_price in &[64_500, 63_200, 61_000, 58_000, 55_000] {
        let np = next_price * 100_000_000;
        risk_engine.update_volatility(np, prev_price);
        prev_price = np;
    }

    let mut mark_prices = HashMap::new();
    mark_prices.insert("BTC_USDT".to_string(), 55_000 * 100_000_000);

    println!("\nMarket Shock: BTC price finalized at $55,000.00 under high volatility!");
    let equity = risk_engine.calculate_equity(&account, &mark_prices);
    let mmr_req = risk_engine.calculate_maintenance_margin_required(&account, &mark_prices);
    
    println!("  Account Equity: ${:.2} USDT", equity as f64 / 100_000_000.0);
    println!("  Maint. Margin Required: ${:.2} USDT", mmr_req as f64 / 100_000_000.0);

    // 4. Run Liquidation trigger check
    if risk_engine.is_liquidation_triggered(&account, &mark_prices) {
        println!("  STATUS: LIQUIDATION TRIGGERED!");
        
        let report = risk_engine.execute_liquidation(&mut account, &mark_prices, &mut insurance_fund);
        println!("  Liquidation Report: {}", report);
        println!("  Insurance Fund Remaining: ${:.2} USDT", insurance_fund as f64 / 100_000_000.0);
    } else {
        println!("  STATUS: ACCOUNT SAFE");
    }

    println!("------------------------------------------------------------");
    println!("Testing Market Surveillance Engine...");

    // 5. Initialize Surveillance Engine
    let mut surveillance = MarketSurveillance::new();

    // Check Wash Trading
    let taker = "user_A".to_string();
    let maker = "user_A".to_string();
    let _is_wash = surveillance.check_wash_trading(&taker, &maker);

    // Simulate Spoofing Test: Place and cancel 12 orders in rapid succession
    let spoof_user = "user_spoof_999".to_string();
    println!("Simulating rapid order placements and cancellations for user: {}...", spoof_user);
    
    for order_id in 1..=12 {
        surveillance.track_placement(&spoof_user, order_id);
        // Cancel immediately
        let flagged = surveillance.track_cancellation(&spoof_user, order_id);
        if flagged {
            println!("  STATUS: Spoofing check triggered for order #{}", order_id);
        }
    }
    println!("============================================================");
}
