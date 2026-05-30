use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventEnvelope {
    pub event_id: String,
    pub event_type: String,
    pub version: String,
    pub timestamp: String,
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeExecutedV1 {
    pub trade_id: String,
    pub symbol: String,
    pub price: f64,
    pub quantity: f64,
    pub buyer_id: String,
    pub seller_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeExecutedV2 {
    pub trade_id: String,
    pub symbol: String,
    pub price: f64,
    pub quantity: f64,
    pub buyer_id: String,
    pub seller_id: String,
    pub fee_maker: f64,
    pub fee_taker: f64,
    pub is_liquidation: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WithdrawalCompletedV1 {
    pub withdrawal_id: String,
    pub user_id: String,
    pub amount: f64,
    pub asset: String,
    pub destination_address: String,
    pub risk_score: f64,
}

pub struct SchemaRegistry {
    // Stores dynamic schema fields definition for validation
    schemas: HashMap<String, Vec<String>>,
}

impl SchemaRegistry {
    pub fn new() -> Self {
        let mut schemas = HashMap::new();
        schemas.insert(
            "trade.executed:v1".to_string(),
            vec!["trade_id".to_string(), "symbol".to_string(), "price".to_string(), "quantity".to_string(), "buyer_id".to_string(), "seller_id".to_string()],
        );
        schemas.insert(
            "trade.executed:v2".to_string(),
            vec![
                "trade_id".to_string(), "symbol".to_string(), "price".to_string(), "quantity".to_string(), 
                "buyer_id".to_string(), "seller_id".to_string(), "fee_maker".to_string(), "fee_taker".to_string(), "is_liquidation".to_string()
            ],
        );
        schemas.insert(
            "withdrawal.completed:v1".to_string(),
            vec!["withdrawal_id".to_string(), "user_id".to_string(), "amount".to_string(), "asset".to_string(), "destination_address".to_string(), "risk_score".to_string()],
        );
        Self { schemas }
    }

    pub fn validate(&self, envelope: &EventEnvelope) -> Result<(), String> {
        let key = format!("{}:{}", envelope.event_type, envelope.version);
        let fields = match self.schemas.get(&key) {
            Some(f) => f,
            None => return Err(format!("Unrecognized event type and version schema: {}", key)),
        };

        let payload_obj = match envelope.payload.as_object() {
            Some(obj) => obj,
            None => return Err("Payload is not a valid JSON object".to_string()),
        };

        for field in fields {
            if !payload_obj.contains_key(field) {
                return Err(format!("Missing required field '{}' for schema '{}'", field, key));
            }
        }
        Ok(())
    }
}

#[tokio::main]
async fn main() {
    println!("[SCHEMA-REGISTRY] Initializing schema validator...");
    let registry = SchemaRegistry::new();

    // Mock incoming event stream with v1 and v2 payloads
    let events = vec![
        EventEnvelope {
            event_id: "evt-001".to_string(),
            event_type: "trade.executed".to_string(),
            version: "v1".to_string(),
            timestamp: "2026-05-30T11:15:00Z".to_string(),
            payload: serde_json::json!({
                "trade_id": "T-100",
                "symbol": "BTC/USDT",
                "price": 68500.0,
                "quantity": 0.25,
                "buyer_id": "user-A",
                "seller_id": "user-B"
            }),
        },
        EventEnvelope {
            event_id: "evt-002".to_string(),
            event_type: "trade.executed".to_string(),
            version: "v2".to_string(),
            timestamp: "2026-05-30T11:15:05Z".to_string(),
            payload: serde_json::json!({
                "trade_id": "T-101",
                "symbol": "ETH/USDT",
                "price": 3800.0,
                "quantity": 1.5,
                "buyer_id": "user-C",
                "seller_id": "user-D",
                "fee_maker": 0.001,
                "fee_taker": 0.002,
                "is_liquidation": false
            }),
        },
        EventEnvelope {
            event_id: "evt-003".to_string(),
            event_type: "withdrawal.completed".to_string(),
            version: "v1".to_string(),
            timestamp: "2026-05-30T11:15:10Z".to_string(),
            payload: serde_json::json!({
                "withdrawal_id": "W-909",
                "user_id": "user-A",
                "amount": 2.5,
                "asset": "BTC",
                "destination_address": "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
                "risk_score": 0.02
            }),
        },
        // Poisoned Event (missing field) -> should trigger DLQ routing
        EventEnvelope {
            event_id: "evt-004".to_string(),
            event_type: "trade.executed".to_string(),
            version: "v2".to_string(),
            timestamp: "2026-05-30T11:15:15Z".to_string(),
            payload: serde_json::json!({
                "trade_id": "T-102",
                "symbol": "BTC/USDT",
                "price": 68500.0,
                // "quantity" and "is_liquidation" missing
                "buyer_id": "user-A",
                "seller_id": "user-B"
            }),
        },
    ];

    for env in events {
        match registry.validate(&env) {
            Ok(_) => {
                println!("[SUCCESS] Validated event {} ({}:{}) successfully.", env.event_id, env.event_type, env.version);
            }
            Err(e) => {
                println!("[DLQ TRIGGERED] Event {} validation failed: {}. Routing to Dead Letter Queue: {}.dlq", env.event_id, e, env.event_type);
            }
        }
    }
}
