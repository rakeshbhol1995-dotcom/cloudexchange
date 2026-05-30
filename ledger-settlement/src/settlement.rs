use crate::ledger::{DoubleEntryLedger, AccountType, Currency};
use uuid::Uuid;

pub struct TradeEvent {
    pub trade_id: u64,
    pub buyer_user_id: String,
    pub seller_user_id: String,
    pub price: u64,       // Fixed point with 8 decimals (e.g., $65,000.00 is 6500000000000)
    pub quantity: u64,    // Fixed point with 8 decimals (e.g., 1 BTC is 100000000)
    pub symbol: String,
}

pub struct SettlementEngine {
    pub ledger: DoubleEntryLedger,
    // Cache map of user_id + currency to Account Uuid for fast lookup
    account_cache: std::collections::HashMap<(String, Currency), Uuid>,
    // Reserves
    treasury_usdt: Uuid,
    referral_usdt: Uuid,
    insurance_usdt: Uuid,
}

impl SettlementEngine {
    pub fn new() -> Self {
        let mut ledger = DoubleEntryLedger::new();
        
        // Initialize central exchange reserve accounts
        let treasury_usdt = ledger.create_account("EXCHANGE_TREASURY_SYSTEM".to_string(), AccountType::ExchangeTreasury, Currency::USDT);
        let referral_usdt = ledger.create_account("EXCHANGE_REFERRAL_SYSTEM".to_string(), AccountType::ReferralReserve, Currency::USDT);
        let insurance_usdt = ledger.create_account("EXCHANGE_INSURANCE_SYSTEM".to_string(), AccountType::InsuranceFund, Currency::USDT);

        Self {
            ledger,
            account_cache: std::collections::HashMap::new(),
            treasury_usdt,
            referral_usdt,
            insurance_usdt,
        }
    }

    /// Retrieve or create the account for a user and currency
    fn get_or_create_account(&mut self, user_id: String, currency: Currency) -> Uuid {
        let key = (user_id.clone(), currency);
        if let Some(&id) = self.account_cache.get(&key) {
            id
        } else {
            let id = self.ledger.create_account(user_id, AccountType::UserTrading, currency);
            self.account_cache.insert(key, id);
            id
        }
    }

    /// Settles a trade event.
    /// Performs the following double-entry transaction:
    ///   - Buyer pays USDT, receives BTC
    ///   - Seller delivers BTC, receives USDT
    ///   - Buyer pays trade fee (0.1% base, VIP adjustments) in USDT -> Treasury / Referrals
    pub fn settle_trade(&mut self, trade: TradeEvent) -> Result<Uuid, String> {
        let buyer_btc = self.get_or_create_account(trade.buyer_user_id.clone(), Currency::BTC);
        let buyer_usdt = self.get_or_create_account(trade.buyer_user_id.clone(), Currency::USDT);
        
        let seller_btc = self.get_or_create_account(trade.seller_user_id.clone(), Currency::BTC);
        let seller_usdt = self.get_or_create_account(trade.seller_user_id.clone(), Currency::USDT);

        // Convert u64 values to i128 representing the asset quantities
        // Trade Price & Quantity are stored with 10^8 scaling.
        // Amount USDT = (Price * Quantity) / 10^8
        let btc_amount = trade.quantity as i128;
        let usdt_amount = ((trade.price as i128) * (trade.quantity as i128)) / 100_000_000;

        // Apply 0.1% (10 basis points) transaction fee
        let fee_usdt = usdt_amount / 1000; // 0.1% fee
        let referral_share = fee_usdt * 20 / 100; // 20% of fee goes to referrals
        let exchange_share = fee_usdt - referral_share;

        let mut legs = Vec::new();

        // 1. Asset Transfers (Double-Entry: Sum = 0)
        // BTC Transfer: Buyer receives (+), Seller delivers (-)
        legs.push((buyer_btc, btc_amount, Currency::BTC));
        legs.push((seller_btc, -btc_amount, Currency::BTC));

        // USDT Transfer: Seller receives (+), Buyer pays (-)
        legs.push((seller_usdt, usdt_amount, Currency::USDT));
        legs.push((buyer_usdt, -usdt_amount, Currency::USDT));

        // 2. Fee Transfers (Double-Entry: Sum = 0)
        // Buyer pays Fee (-)
        legs.push((buyer_usdt, -fee_usdt, Currency::USDT));
        // Treasury receives exchange share (+)
        legs.push((self.treasury_usdt, exchange_share, Currency::USDT));
        // Referral program receives share (+)
        legs.push((self.referral_usdt, referral_share, Currency::USDT));

        // Record Transaction
        let tx_desc = format!("Settlement of {} trade #{}", trade.symbol, trade.trade_id);
        let tx_ref = format!("TRADE_{}", trade.trade_id);

        self.ledger.record_transaction(tx_desc, tx_ref, legs)
    }

    /// Direct deposit execution (credits user balance, debits treasury reserve)
    pub fn deposit(&mut self, user_id: String, currency: Currency, amount: u64) -> Result<Uuid, String> {
        let user_acct = self.get_or_create_account(user_id.clone(), currency);
        let treasury_acct = self.get_or_create_account("EXCHANGE_TREASURY_SYSTEM".to_string(), currency);
        
        let legs = vec![
            (user_acct, amount as i128, currency),
            (treasury_acct, -(amount as i128), currency) // Treasury records a liability (-)
        ];

        self.ledger.record_transaction(
            format!("External deposit of {:?}", currency),
            format!("DEP_{}", Uuid::new_v4()),
            legs
        )
    }
}
