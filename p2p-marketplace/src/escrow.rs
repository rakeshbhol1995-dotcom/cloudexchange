use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EscrowState {
    Created,   // USDT locked from seller
    Paid,      // Buyer claimed payment completed
    Released,  // Seller confirmed payment, USDT released to buyer
    Disputed,  // Under arbitration review
}

#[derive(Debug, Clone)]
pub struct P2POrder {
    pub order_id: u64,
    pub ad_id: u64,
    pub buyer_id: String,
    pub seller_id: String,
    pub asset_amount: u64,    // Locked amount in USDT (Scale: 10^8)
    pub fiat_amount: f64,     // e.g. INR or USD
    pub payment_reference: Option<String>,
    pub state: EscrowState,
}

pub struct P2PEscrowEngine {
    orders: HashMap<u64, P2POrder>,
    next_order_id: u64,
}

impl P2PEscrowEngine {
    pub fn new() -> Self {
        Self {
            orders: HashMap::new(),
            next_order_id: 1000,
        }
    }

    /// Create and lock a new P2P order escrow
    pub fn lock_escrow(
        &mut self,
        ad_id: u64,
        buyer_id: String,
        seller_id: String,
        amount_usdt: u64,
        fiat_value: f64,
    ) -> u64 {
        let order_id = self.next_order_id;
        self.next_order_id += 1;

        let order = P2POrder {
            order_id,
            ad_id,
            buyer_id,
            seller_id: seller_id.clone(),
            asset_amount: amount_usdt,
            fiat_amount: fiat_value,
            payment_reference: None,
            state: EscrowState::Created,
        };

        self.orders.insert(order_id, order);
        println!(
            "[P2P Escrow] Locked {:.2} USDT from seller '{}' for order #{}",
            amount_usdt as f64 / 100_000_000.0,
            seller_id,
            order_id
        );
        order_id
    }

    /// Buyer marks order as Paid and provides proof reference
    pub fn mark_paid(&mut self, order_id: u64, reference_id: String) -> Result<(), String> {
        let order = self.orders.get_mut(&order_id).ok_or("Order not found")?;
        
        if order.state != EscrowState::Created {
            return Err(format!("Cannot mark paid in state {:?}", order.state));
        }

        order.state = EscrowState::Paid;
        order.payment_reference = Some(reference_id.clone());
        println!(
            "[P2P Escrow] Buyer '{}' marked order #{} as PAID. Ref: {}",
            order.buyer_id, order_id, reference_id
        );
        Ok(())
    }

    /// Seller releases the locked escrow to buyer
    pub fn release_escrow(&mut self, order_id: u64) -> Result<(), String> {
        let order = self.orders.get_mut(&order_id).ok_or("Order not found")?;

        if order.state != EscrowState::Paid {
            return Err(format!("Cannot release escrow in state {:?}", order.state));
        }

        order.state = EscrowState::Released;
        println!(
            "[P2P Escrow] Seller '{}' released order #{} escrow! {:.2} USDT transferred to buyer '{}'.",
            order.seller_id,
            order_id,
            order.asset_amount as f64 / 100_000_000.0,
            order.buyer_id
        );
        Ok(())
    }

    /// Raise a dispute on the order
    pub fn dispute_order(&mut self, order_id: u64) -> Result<(), String> {
        let order = self.orders.get_mut(&order_id).ok_or("Order not found")?;
        order.state = EscrowState::Disputed;
        println!(
            "[P2P Escrow WARNING] Dispute raised on order #{}! Funds are locked in escrow.",
            order_id
        );
        Ok(())
    }
}
