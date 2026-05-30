mod rate_limiter;
mod control_plane;
mod observability;

use rate_limiter::RedisRateLimiter;
use control_plane::ExchangeControlPlane;
use observability::ObservabilityExporter;

use std::thread;
use std::time::Duration;

fn print_kafka_architecture_blueprint() {
    println!("============================================================");
    println!("CloudExchange — Kafka Cross-Region Sequence Topology Blueprint");
    println!("============================================================");
    println!("1. Ingress Layer:");
    println!("   - Raw order payloads land on regional Kafka topics (e.g., 'raw-orders-us', 'raw-orders-eu').");
    println!("2. Global Sequencing Engine (Sequencer):");
    println!("   - A single-partition Kafka topic 'sequenced-orders-global' is used.");
    println!("   - The Sequencer consumes from regional topics, validates timestamps/signatures, and assigns a strict monotonically increasing Sequence ID.");
    println!("3. Deterministic State Machine Replay:");
    println!("   - Matching engines subscribe to the 'sequenced-orders-global' topic.");
    println!("   - Because Kafka preserves offset order, all matching engine replicas across regions execute the exact same sequence of events, achieving deterministic mirror states.");
    println!("4. Multi-Region Replication & Fault Tolerance:");
    println!("   - MirrorMaker 2 / Confluent Replicator maintains synchronization.");
    println!("   - In the event of primary sequencer failure, a Raft-based consensus group elects a new sequencer node that resumes assignment from the last committed offset.");
    println!("============================================================\n");
}

fn main() {
    print_kafka_architecture_blueprint();

    // Initialize components
    let mut rate_limiter = RedisRateLimiter::new();
    let mut control_plane = ExchangeControlPlane::new();
    let metrics = ObservabilityExporter::new();

    println!("Testing Redis Token-Bucket Rate Limiter (Capacity: 120, Rate: 100/s)...");
    let user_id = "user_api_client_999";
    
    // Simulate rapid request bursts
    let mut allowed_count = 0;
    let mut blocked_count = 0;
    for _ in 0..150 {
        if rate_limiter.is_allowed(user_id) {
            allowed_count += 1;
            metrics.increment_counter("api_requests_allowed_total");
        } else {
            blocked_count += 1;
            metrics.increment_counter("api_requests_blocked_total");
        }
    }
    println!("  Burst Simulation: Allowed = {}, Blocked = {}", allowed_count, blocked_count);
    metrics.set_gauge("api_rate_limit_saturation_pct", (blocked_count as f64 / 150.0) * 100.0);
    println!("------------------------------------------------------------");

    println!("Testing Control Plane Circuit Breaker & Operations Halts...");
    metrics.record_histogram("ledger_settlement_latency_seconds", 0.012);
    metrics.record_histogram("ledger_settlement_latency_seconds", 0.015);

    // Simulate 3 ledger settlement database failures to trip circuit
    for failure in 1..=3 {
        if control_plane.ledger_settlement_breaker.check_allowed() {
            println!("  [Ledger Engine] Attempting settlement database transaction...");
            println!("  [Ledger Engine] Database timeout error occurred!");
            control_plane.ledger_settlement_breaker.record_failure();
            metrics.increment_counter("ledger_settlement_failures_total");
        } else {
            println!("  [Ledger Engine] Transaction blocked by active Circuit Breaker.");
        }
    }

    // Check if subsequent transaction is blocked
    println!("Checking transaction status after breaker trip:");
    if !control_plane.ledger_settlement_breaker.check_allowed() {
        println!("  STATUS: Transaction BLOCKED (Circuit is OPEN)");
    }

    // Cooldown test
    println!("Waiting for cooldown period (500ms)...");
    thread::sleep(Duration::from_millis(510));
    
    if control_plane.ledger_settlement_breaker.check_allowed() {
        println!("  STATUS: Transaction ALLOWED (Circuit is HALF-OPEN). Executing test transaction...");
        // Record recovery success
        control_plane.ledger_settlement_breaker.record_success();
    }
    println!("------------------------------------------------------------");

    // Print final dashboard statistics
    metrics.print_metrics_snapshot();
}
