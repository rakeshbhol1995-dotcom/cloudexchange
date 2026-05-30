use std::collections::HashMap;
use std::time::{Instant, Duration};

pub struct TokenBucket {
    pub max_tokens: f64,
    pub refill_rate: f64, // Tokens replenished per second
    pub tokens: f64,
    pub last_refill: Instant,
}

impl TokenBucket {
    pub fn new(max_tokens: f64, refill_rate: f64) -> Self {
        Self {
            max_tokens,
            refill_rate,
            tokens: max_tokens,
            last_refill: Instant::now(),
        }
    }

    /// Attempts to consume 1 token. Returns true if request is allowed.
    pub fn consume(&mut self) -> bool {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        self.last_refill = now;

        // Replenish tokens based on elapsed time
        self.tokens = (self.tokens + elapsed * self.refill_rate).min(self.max_tokens);

        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true // Allow request
        } else {
            false // Rate limit exceeded!
        }
    }
}

pub struct RedisRateLimiter {
    buckets: HashMap<String, TokenBucket>,
}

impl RedisRateLimiter {
    pub fn new() -> Self {
        Self {
            buckets: HashMap::new(),
        }
    }

    /// Check if user request is within rate limit (100 req/sec limit, 120 burst capacity)
    pub fn is_allowed(&mut self, user_id: &str) -> bool {
        let bucket = self.buckets.entry(user_id.to_string()).or_insert_with(|| {
            TokenBucket::new(120.0, 100.0) // 120 max burst capacity, 100 tokens refilled per second
        });
        bucket.consume()
    }
}
