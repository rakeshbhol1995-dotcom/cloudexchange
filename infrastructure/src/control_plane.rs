use std::time::{Instant, Duration};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitState {
    Closed,   // Normal operation
    Open,     // Tripped, rejecting all transactions
    HalfOpen, // Testing service recovery
}

pub struct CircuitBreaker {
    pub state: CircuitState,
    pub failure_count: u32,
    pub failure_threshold: u32,
    pub cooldown_period: Duration,
    pub last_state_change: Instant,
}

impl CircuitBreaker {
    pub fn new(threshold: u32, cooldown: Duration) -> Self {
        Self {
            state: CircuitState::Closed,
            failure_count: 0,
            failure_threshold: threshold,
            cooldown_period: cooldown,
            last_state_change: Instant::now(),
        }
    }

    /// Record a successful transaction. Resolves HalfOpen state back to Closed.
    pub fn record_success(&mut self) {
        self.failure_count = 0;
        if self.state == CircuitState::HalfOpen {
            println!("[Control Plane] Circuit breaker returned to CLOSED state. Service recovered.");
            self.state = CircuitState::Closed;
            self.last_state_change = Instant::now();
        }
    }

    /// Record a failure. Trips circuit to Open if threshold is reached or if currently HalfOpen.
    pub fn record_failure(&mut self) {
        self.failure_count += 1;
        println!("[Control Plane] Recorded failure count: {}/{}", self.failure_count, self.failure_threshold);
        
        if self.state == CircuitState::HalfOpen {
            println!("[Control Plane WARNING] Circuit breaker TRIPPED from HALF-OPEN back to OPEN! Service recovery failed.");
            self.state = CircuitState::Open;
            self.last_state_change = Instant::now();
        } else if self.state == CircuitState::Closed && self.failure_count >= self.failure_threshold {
            println!("[Control Plane WARNING] Circuit breaker TRIPPED to OPEN! System is halting operations.");
            self.state = CircuitState::Open;
            self.last_state_change = Instant::now();
        }
    }

    /// Check if transaction is allowed. Handles cooldown transitions to HalfOpen.
    pub fn check_allowed(&mut self) -> bool {
        match self.state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                let now = Instant::now();
                if now.duration_since(self.last_state_change) > self.cooldown_period {
                    println!("[Control Plane] Cooldown elapsed. Circuit breaker transitioning to HALF-OPEN.");
                    self.state = CircuitState::HalfOpen;
                    self.last_state_change = now;
                    true
                } else {
                    false // Blocked!
                }
            }
            CircuitState::HalfOpen => true,
        }
    }
}

pub struct ExchangeControlPlane {
    pub order_matching_halted: bool,
    pub ledger_settlement_breaker: CircuitBreaker,
}

impl ExchangeControlPlane {
    pub fn new() -> Self {
        Self {
            order_matching_halted: false,
            ledger_settlement_breaker: CircuitBreaker::new(3, Duration::from_millis(500)),
        }
    }

    /// Emergency halt switch
    pub fn trigger_emergency_halt(&mut self) {
        println!("[Control Plane CRITICAL] GLOBAL EMERGENCY HALT TRIGGERED!");
        self.order_matching_halted = true;
    }

    /// Resume exchange operation
    pub fn clear_halt(&mut self) {
        println!("[Control Plane] Clearing emergency halt. Resuming matching.");
        self.order_matching_halted = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn test_circuit_breaker_transitions() {
        let mut breaker = CircuitBreaker::new(3, Duration::from_millis(100));

        // 1. Initially Closed
        assert_eq!(breaker.state, CircuitState::Closed);
        assert!(breaker.check_allowed());

        // 2. First failure
        breaker.record_failure();
        assert_eq!(breaker.state, CircuitState::Closed);
        assert!(breaker.check_allowed());

        // 3. Second failure
        breaker.record_failure();
        assert_eq!(breaker.state, CircuitState::Closed);
        assert!(breaker.check_allowed());

        // 4. Third failure (threshold met) -> should trip to Open
        breaker.record_failure();
        assert_eq!(breaker.state, CircuitState::Open);
        assert!(!breaker.check_allowed()); // Blocked

        // 5. Cooldown period check
        thread::sleep(Duration::from_millis(110));

        // 6. check_allowed() triggers transition to HalfOpen
        assert!(breaker.check_allowed());
        assert_eq!(breaker.state, CircuitState::HalfOpen);

        // 7. Failure in HalfOpen state -> should immediately trip back to Open
        breaker.record_failure();
        assert_eq!(breaker.state, CircuitState::Open);
        assert!(!breaker.check_allowed());

        // 8. Cooldown again
        thread::sleep(Duration::from_millis(110));
        assert!(breaker.check_allowed());
        assert_eq!(breaker.state, CircuitState::HalfOpen);

        // 9. Success in HalfOpen state -> should transition to Closed
        breaker.record_success();
        assert_eq!(breaker.state, CircuitState::Closed);
        assert!(breaker.check_allowed());
    }
}
