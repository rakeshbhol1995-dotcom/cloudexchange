use crate::orderbook::{OrderBook, OrderEvent, Trade};
use std::sync::mpsc::{Receiver, Sender};

pub struct DivergenceAlert {
    pub event: OrderEvent,
    pub expected_hash: u64,
    pub actual_hash: u64,
}

/// The Shadow Replay Engine.
/// Replays the same input sequence in parallel to verify deterministic execution.
pub struct ShadowEngine {
    pub orderbook: OrderBook,
    event_receiver: Receiver<(OrderEvent, u64)>, // (Event, PrimaryEngineStateHash)
    alert_sender: Sender<DivergenceAlert>,
}

impl ShadowEngine {
    pub fn new(
        symbol: String,
        event_receiver: Receiver<(OrderEvent, u64)>,
        alert_sender: Sender<DivergenceAlert>,
    ) -> Self {
        Self {
            orderbook: OrderBook::new(symbol),
            event_receiver,
            alert_sender,
        }
    }

    /// Start the replay validation loop.
    pub fn run(&mut self) {
        println!("[Shadow Engine] Starting parallel verification loop...");
        while let Ok((event, primary_hash)) = self.event_receiver.recv() {
            // Replay the order event on the shadow order book
            self.orderbook.process_event(event.clone());

            let shadow_hash = self.orderbook.running_state_hash;
            if shadow_hash != primary_hash {
                eprintln!(
                    "[CRITICAL ALARM] Shadow Engine divergence detected! Event: {:?}, Primary Hash: {}, Shadow Hash: {}",
                    event, primary_hash, shadow_hash
                );
                
                let _ = self.alert_sender.send(DivergenceAlert {
                    event,
                    expected_hash: primary_hash,
                    actual_hash: shadow_hash,
                });
            }
        }
    }
}
