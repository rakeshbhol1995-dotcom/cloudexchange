use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderEvent {
    pub order_id: String,
    pub user_id: String,
    pub symbol: String,
    pub side: String, // "BUY" or "SELL"
    pub price: f64,
    pub quantity: f64,
    pub timestamp_ms: i64,
    pub status: String, // "NEW", "CANCELLED", "FILLED"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeEvent {
    pub trade_id: String,
    pub symbol: String,
    pub price: f64,
    pub quantity: f64,
    pub buyer_id: String,
    pub seller_id: String,
    pub timestamp_ms: i64,
}

pub struct MarketSurveillance {
    // Tracks cancel history for spoofing checks: user_id -> cancel timestamps
    cancel_history: HashMap<String, Vec<i64>>,
}

impl MarketSurveillance {
    pub fn new() -> Self {
        Self {
            cancel_history: HashMap::new(),
        }
    }

    /// Detect wash trading (matching buy and sell orders between identical/linked users)
    pub fn inspect_trade(&self, trade: &TradeEvent) -> bool {
        if trade.buyer_id == trade.seller_id {
            println!(
                "[SURVEILLANCE ALERT] WASH TRADING DETECTED: Trade {} on {} is self-matched by user '{}'. Volume: {:.4} @ ${:.2}",
                trade.trade_id, trade.symbol, trade.buyer_id, trade.quantity, trade.price
            );
            true
        } else {
            false
        }
    }

    /// Detect spoofing (canceling large orders within <500ms of placement to fake depth)
    pub fn inspect_order_flow(&mut self, order: &OrderEvent) -> bool {
        if order.status == "CANCELLED" {
            let user_cancels = self.cancel_history.entry(order.user_id.clone()).or_insert_with(Vec::new);
            user_cancels.push(order.timestamp_ms);

            // Keep only cancels within last 1 second (1000ms)
            user_cancels.retain(|&ts| order.timestamp_ms - ts <= 1000);

            if user_cancels.len() > 10 {
                println!(
                    "[SURVEILLANCE ALERT] SPOOFING/LAYERING BLOCKED: User '{}' cancelled {} orders in the last 1s. Last cancelled order ID: {}.",
                    order.user_id, user_cancels.len(), order.order_id
                );
                return true;
            }
        }
        false
    }
}

#[tokio::main]
async fn main() {
    println!("[SURVEILLANCE] Starting Real-time Market Surveillance Engine...");
    let mut monitor = MarketSurveillance::new();

    // 1. Simulate Wash Trading
    let wash_trade = TradeEvent {
        trade_id: "T-808".to_string(),
        symbol: "BTC/USDT".to_string(),
        price: 68500.0,
        quantity: 0.5,
        buyer_id: "manipulator_acc_1".to_string(),
        seller_id: "manipulator_acc_1".to_string(),
        timestamp_ms: Utc::now().timestamp_millis(),
    };
    monitor.inspect_trade(&wash_trade);

    // 2. Simulate Spoofing (Rapid cancel loop)
    let start_ts = Utc::now().timestamp_millis();
    for i in 0..12 {
        let cancel_event = OrderEvent {
            order_id: format!("O-10{}", i),
            user_id: "spoofing_market_maker".to_string(),
            symbol: "ETH/USDT".to_string(),
            side: "BUY".to_string(),
            price: 3790.0,
            quantity: 50.0,
            timestamp_ms: start_ts + (i * 50), // Cancel every 50ms
            status: "CANCELLED".to_string(),
        };
        monitor.inspect_order_flow(&cancel_event);
    }
}
