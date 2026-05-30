use serde::{Serialize, Deserialize};
use std::fs::OpenOptions;
use memmap2::MmapMut;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Side {
    Buy,
    Sell,
}

impl Default for Side {
    fn default() -> Self {
        Side::Buy
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[repr(align(64))]
pub struct Order {
    pub order_id: u64,
    pub user_id: u64,
    pub price: u64,       // Fixed-point (e.g., multiplied by 10^8)
    pub quantity: u64,    // Fixed-point
    pub side: Side,
    pub timestamp: u64,
}

impl Default for Order {
    fn default() -> Self {
        Self {
            order_id: 0,
            user_id: 0,
            price: 0,
            quantity: 0,
            side: Side::Buy,
            timestamp: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trade {
    pub trade_id: u64,
    pub taker_order_id: u64,
    pub maker_order_id: u64,
    pub price: u64,
    pub quantity: u64,
    pub taker_user_id: u64,
    pub maker_user_id: u64,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OrderEvent {
    Place(Order),
    Cancel { order_id: u64, side: Side, price: u64 },
}

impl Default for OrderEvent {
    fn default() -> Self {
        OrderEvent::Place(Order::default())
    }
}

/// Cache-line aligned Order Book.
pub struct OrderBook {
    pub symbol: String,
    pub bids: Vec<Order>, // Sorted descending by price
    pub asks: Vec<Order>, // Sorted ascending by price
    pub trade_counter: u64,
    pub running_state_hash: u64,
}

impl OrderBook {
    pub fn new(symbol: String) -> Self {
        Self {
            symbol,
            bids: Vec::with_capacity(10000),
            asks: Vec::with_capacity(10000),
            trade_counter: 0,
            running_state_hash: 0,
        }
    }

    /// Process an order event. Returns a list of generated trade reports.
    #[inline(always)]
    pub fn process_event(&mut self, event: OrderEvent) -> Vec<Trade> {
        let mut trades = Vec::new();
        match event {
            OrderEvent::Place(order) => {
                trades = self.match_order(order);
            }
            OrderEvent::Cancel { order_id, side, price } => {
                self.cancel_order(order_id, side, price);
            }
        }
        // Update running state hash after every event for shadow engine validation
        self.update_state_hash(&trades);
        trades
    }

    #[inline(always)]
    fn match_order(&mut self, mut taker_order: Order) -> Vec<Trade> {
        let mut trades = Vec::new();
        let timestamp = taker_order.timestamp;

        match taker_order.side {
            Side::Buy => {
                // Match with asks (asks sorted ascending, index 0 is lowest price ask)
                while taker_order.quantity > 0 && !self.asks.is_empty() {
                    let best_ask = &mut self.asks[0];
                    if taker_order.price < best_ask.price {
                        break; // No cross
                    }

                    let match_qty = std::cmp::min(taker_order.quantity, best_ask.quantity);
                    self.trade_counter += 1;
                    
                    trades.push(Trade {
                        trade_id: self.trade_counter,
                        taker_order_id: taker_order.order_id,
                        maker_order_id: best_ask.order_id,
                        price: best_ask.price, // Maker price determines transaction price
                        quantity: match_qty,
                        taker_user_id: taker_order.user_id,
                        maker_user_id: best_ask.user_id,
                        timestamp,
                    });

                    taker_order.quantity -= match_qty;
                    best_ask.quantity -= match_qty;

                    if best_ask.quantity == 0 {
                        self.asks.remove(0); // Remove fully filled ask
                    }
                }

                // If partially filled, insert into bids (sorted descending)
                if taker_order.quantity > 0 {
                    let insert_idx = match self.bids.binary_search_by(|probe| probe.price.cmp(&taker_order.price).reverse()) {
                        Ok(idx) => idx,
                        Err(idx) => idx,
                    };
                    self.bids.insert(insert_idx, taker_order);
                }
            }
            Side::Sell => {
                // Match with bids (bids sorted descending, index 0 is highest price bid)
                while taker_order.quantity > 0 && !self.bids.is_empty() {
                    let best_bid = &mut self.bids[0];
                    if taker_order.price > best_bid.price {
                        break; // No cross
                    }

                    let match_qty = std::cmp::min(taker_order.quantity, best_bid.quantity);
                    self.trade_counter += 1;

                    trades.push(Trade {
                        trade_id: self.trade_counter,
                        taker_order_id: taker_order.order_id,
                        maker_order_id: best_bid.order_id,
                        price: best_bid.price,
                        quantity: match_qty,
                        taker_user_id: taker_order.user_id,
                        maker_user_id: best_bid.user_id,
                        timestamp,
                    });

                    taker_order.quantity -= match_qty;
                    best_bid.quantity -= match_qty;

                    if best_bid.quantity == 0 {
                        self.bids.remove(0); // Remove fully filled bid
                    }
                }

                // If partially filled, insert into asks (sorted ascending)
                if taker_order.quantity > 0 {
                    let insert_idx = match self.asks.binary_search_by(|probe| probe.price.cmp(&taker_order.price)) {
                        Ok(idx) => idx,
                        Err(idx) => idx,
                    };
                    self.asks.insert(insert_idx, taker_order);
                }
            }
        }
        trades
    }

    #[inline(always)]
    fn cancel_order(&mut self, order_id: u64, side: Side, price: u64) -> bool {
        match side {
            Side::Buy => {
                if let Ok(idx) = self.bids.binary_search_by(|probe| probe.price.cmp(&price).reverse()) {
                    // Search locally around the price point for matching ID
                    let mut i = idx;
                    while i < self.bids.len() && self.bids[i].price == price {
                        if self.bids[i].order_id == order_id {
                            self.bids.remove(i);
                            return true;
                        }
                        i += 1;
                    }
                }
            }
            Side::Sell => {
                if let Ok(idx) = self.asks.binary_search_by(|probe| probe.price.cmp(&price)) {
                    let mut i = idx;
                    while i < self.asks.len() && self.asks[i].price == price {
                        if self.asks[i].order_id == order_id {
                            self.asks.remove(i);
                            return true;
                        }
                        i += 1;
                    }
                }
            }
        }
        false
    }

    /// Calculate deterministic state hash using SeaHash for parallel divergence detection.
    #[inline(always)]
    fn update_state_hash(&mut self, trades: &[Trade]) {
        let mut data = Vec::with_capacity(128);
        
        // Feed bids top price and size
        if let Some(bid) = self.bids.first() {
            data.extend_from_slice(&bid.price.to_le_bytes());
            data.extend_from_slice(&bid.quantity.to_le_bytes());
        }
        // Feed asks top price and size
        if let Some(ask) = self.asks.first() {
            data.extend_from_slice(&ask.price.to_le_bytes());
            data.extend_from_slice(&ask.quantity.to_le_bytes());
        }
        
        // Feed last trades
        for trade in trades {
            data.extend_from_slice(&trade.price.to_le_bytes());
            data.extend_from_slice(&trade.quantity.to_le_bytes());
        }

        // Combine hashes
        let delta = seahash::hash(&data);
        self.running_state_hash = self.running_state_hash.wrapping_add(delta);
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[repr(C)]
pub struct BinaryEvent {
    pub event_type: u8, // 1 = Place, 2 = Cancel
    pub order_id: u64,
    pub user_id: u64,
    pub price: u64,
    pub quantity: u64,
    pub side: u8, // 1 = Buy, 2 = Sell
    pub timestamp: u64,
}

impl BinaryEvent {
    pub fn from_event(event: &OrderEvent) -> Self {
        match event {
            OrderEvent::Place(order) => Self {
                event_type: 1,
                order_id: order.order_id,
                user_id: order.user_id,
                price: order.price,
                quantity: order.quantity,
                side: match order.side { Side::Buy => 1, Side::Sell => 2 },
                timestamp: order.timestamp,
            },
            OrderEvent::Cancel { order_id, side, price } => Self {
                event_type: 2,
                order_id: *order_id,
                user_id: 0,
                price: *price,
                quantity: 0,
                side: match side { Side::Buy => 1, Side::Sell => 2 },
                timestamp: 0,
            }
        }
    }

    pub fn to_event(&self) -> OrderEvent {
        match self.event_type {
            1 => OrderEvent::Place(Order {
                order_id: self.order_id,
                user_id: self.user_id,
                price: self.price,
                quantity: self.quantity,
                side: match self.side { 1 => Side::Buy, _ => Side::Sell },
                timestamp: self.timestamp,
            }),
            _ => OrderEvent::Cancel {
                order_id: self.order_id,
                side: match self.side { 1 => Side::Buy, _ => Side::Sell },
                price: self.price,
            }
        }
    }
}

/// A simple memory-mapped append-only Write-Ahead Log (WAL) writer/reader.
pub struct MemoryMappedWAL {
    mmap: MmapMut,
    write_offset: usize,
}

impl MemoryMappedWAL {
    pub fn new(path: &str, size_bytes: usize) -> Self {
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(path)
            .expect("Failed to open WAL file");
        
        file.set_len(size_bytes as u64).expect("Failed to resize WAL file");
        
        let mmap = unsafe { MmapMut::map_mut(&file).expect("Failed to map file") };
        Self {
            mmap,
            write_offset: 0,
        }
    }

    /// Append an event to the memory-mapped file
    pub fn append_event(&mut self, event: &OrderEvent) {
        let binary_event = BinaryEvent::from_event(event);
        let size = std::mem::size_of::<BinaryEvent>();
        
        if self.write_offset + size > self.mmap.len() {
            panic!("WAL file out of memory!");
        }

        // Safety: Casting a reference to a slice of bytes for copying is safe for Pod structs
        let bytes: &[u8] = unsafe {
            std::slice::from_raw_parts(
                &binary_event as *const BinaryEvent as *const u8,
                size,
            )
        };
        
        self.mmap[self.write_offset..self.write_offset + size].copy_from_slice(bytes);
        self.write_offset += size;
    }

    /// Flush pages to disk
    pub fn flush(&self) {
        self.mmap.flush().expect("Failed to flush mmap WAL to disk");
    }
}
