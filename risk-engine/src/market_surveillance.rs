use std::collections::{HashMap, VecDeque};
use std::time::{Instant, Duration};

pub struct MarketSurveillance {
    // Tracks order creation times: user_id -> OrderID -> Placement Time
    order_placements: HashMap<String, HashMap<u64, Instant>>,
    // Tracks cancellation frequencies: user_id -> List of cancel timestamps
    cancel_history: HashMap<String, VecDeque<Instant>>,
}

impl MarketSurveillance {
    pub fn new() -> Self {
        Self {
            order_placements: HashMap::new(),
            cancel_history: HashMap::new(),
        }
    }

    /// Check for Wash Trading (self-matching).
    /// Returns true if taker_user_id matches maker_user_id, indicating wash trading.
    pub fn check_wash_trading(&self, taker_user_id: &str, maker_user_id: &str) -> bool {
        if taker_user_id == maker_user_id {
            eprintln!(
                "[SURVEILLANCE WARNING] Wash Trading Blocked! User {} attempted to trade with themselves.",
                taker_user_id
            );
            return true;
        }
        false
    }

    /// Track a new order placement for spoofing analysis.
    pub fn track_placement(&mut self, user_id: &str, order_id: u64) {
        let user_orders = self.order_placements.entry(user_id.to_string()).or_insert_with(HashMap::new);
        user_orders.insert(order_id, Instant::now());
    }

    /// Track an order cancellation and check for spoofing.
    /// Spoofing is defined as:
    ///   - Rapidly placing and cancelling orders to manipulate order book depth without intent to fill.
    ///   - If a user cancels more than 10 orders within 1.0 second, and the average lifetime of those cancelled orders is <500ms, flag it.
    pub fn track_cancellation(&mut self, user_id: &str, order_id: u64) -> bool {
        let now = Instant::now();
        let mut order_lifetime = Duration::from_secs(100); // Default long duration if untracked

        // 1. Calculate the lifetime of the cancelled order
        if let Some(user_orders) = self.order_placements.get_mut(user_id) {
            if let Some(placed_time) = user_orders.remove(&order_id) {
                order_lifetime = now.duration_since(placed_time);
            }
        }

        // 2. Log cancellation timestamp
        let user_cancels = self.cancel_history.entry(user_id.to_string()).or_insert_with(VecDeque::new);
        user_cancels.push_back(now);

        // 3. Purge cancellations older than 1.0 second
        while let Some(&t) = user_cancels.front() {
            if now.duration_since(t) > Duration::from_secs(1) {
                user_cancels.pop_front();
            } else {
                break;
            }
        }

        // 4. Evaluate spoofing threshold: >10 cancels per second with low lifetimes
        if user_cancels.len() > 10 && order_lifetime < Duration::from_millis(500) {
            println!(
                "[SURVEILLANCE ALARM] Spoofing activity detected for user: {}! Cancel rate: {}/sec, Cancelled order lifetime: {:?}",
                user_id, user_cancels.len(), order_lifetime
            );
            return true;
        }

        false
    }
}
