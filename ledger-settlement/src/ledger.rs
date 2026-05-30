use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum AccountType {
    UserTrading,
    ExchangeTreasury,
    InsuranceFund,
    LiquidationReserve,
    ReferralReserve,
    P2PEscrow,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Currency {
    USDT,
    BTC,
    ETH,
    SOL,
    GLD,
}

#[derive(Debug, Clone)]
pub struct Account {
    pub account_id: Uuid,
    pub user_id: String,
    pub account_type: AccountType,
    pub currency: Currency,
}

#[derive(Debug, Clone)]
pub struct LedgerEntry {
    pub entry_id: Uuid,
    pub transaction_id: Uuid,
    pub account_id: Uuid,
    pub amount: i128, // Using i128 to represent high precision integers (e.g., fixed-point with 18 decimals)
    pub currency: Currency,
}

#[derive(Debug, Clone)]
pub struct Transaction {
    pub transaction_id: Uuid,
    pub description: String,
    pub reference_id: String,
    pub entries: Vec<LedgerEntry>,
}

/// Thread-safe double-entry ledger state.
pub struct DoubleEntryLedger {
    pub accounts: HashMap<Uuid, Account>,
    pub balances: HashMap<Uuid, i128>, // Account ID -> Balance
    pub transaction_log: Vec<Transaction>,
}

impl DoubleEntryLedger {
    pub fn new() -> Self {
        Self {
            accounts: HashMap::new(),
            balances: HashMap::new(),
            transaction_log: Vec::new(),
        }
    }

    /// Registers a new account.
    pub fn create_account(&mut self, user_id: String, account_type: AccountType, currency: Currency) -> Uuid {
        let account_id = Uuid::new_v4();
        let account = Account {
            account_id,
            user_id,
            account_type,
            currency,
        };
        self.accounts.insert(account_id, account);
        self.balances.insert(account_id, 0);
        account_id
    }

    /// Records a multi-leg double-entry transaction.
    /// Ensures that Sum(Leg Amounts) == 0 (Conservation of assets/liabilities).
    pub fn record_transaction(
        &mut self,
        description: String,
        reference_id: String,
        legs: Vec<(Uuid, i128, Currency)>,
    ) -> Result<Uuid, String> {
        let transaction_id = Uuid::new_v4();
        let mut sum: i128 = 0;
        let mut entries = Vec::new();

        // 1. Verify currency matches account, and accumulate amounts to assert double-entry balance
        for &(account_id, amount, currency) in &legs {
            let account = self.accounts.get(&account_id).ok_or("Account does not exist")?;
            if account.currency != currency {
                return Err(format!("Currency mismatch for account {:?}", account_id));
            }
            sum += amount;

            entries.push(LedgerEntry {
                entry_id: Uuid::new_v4(),
                transaction_id,
                account_id,
                amount,
                currency,
            });
        }

        // 2. Double-Entry Rule check: Sum of debits and credits MUST equal zero.
        if sum != 0 {
            return Err("Transaction imbalance! Total debits must equal total credits.".to_string());
        }

        // 3. Apply balance updates
        for entry in &entries {
            let balance = self.balances.get_mut(&entry.account_id).unwrap();
            *balance += entry.amount;
        }

        // 4. Save transaction to log
        let tx = Transaction {
            transaction_id,
            description,
            reference_id,
            entries,
        };
        self.transaction_log.push(tx);

        Ok(transaction_id)
    }

    /// Run real-time reconciliation audits.
    /// Check 1: Verify the double-entry invariant holds for the entire database.
    /// Check 2: Verify total liabilities (User balances) + reserves == total treasury holdings.
    pub fn audit_reconciliation(&self) -> Result<(), String> {
        // Check 1: Global Sum of all entries must be exactly 0
        let mut global_sum: HashMap<Currency, i128> = HashMap::new();
        
        for tx in &self.transaction_log {
            for entry in &tx.entries {
                let entry_sum = global_sum.entry(entry.currency).or_insert(0);
                *entry_sum += entry.amount;
            }
        }

        for (currency, sum) in global_sum {
            if sum != 0 {
                return Err(format!("Global reconciliation failed for {:?}! Sum is {}", currency, sum));
            }
        }

        // Check 2: Liabilities vs Reserves check.
        // Sum(UserTrading) + Sum(P2PEscrow) + Sum(InsuranceFund) + Sum(LiquidationReserve) + Sum(ReferralReserve) + Sum(ExchangeTreasury) == 0
        let mut type_sums: HashMap<AccountType, i128> = HashMap::new();
        for (account_id, balance) in &self.balances {
            let account = &self.accounts[account_id];
            let sum = type_sums.entry(account.account_type).or_insert(0);
            *sum += *balance;
        }

        println!("--- Reconciliation Audit ---");
        for (acct_type, sum) in &type_sums {
            println!("  {:?}: {}", acct_type, sum);
        }
        
        let total: i128 = type_sums.values().sum();
        if total != 0 {
            return Err(format!("Treasury imbalance! Total sum of balances is {}", total));
        }

        println!("Audit status: OK");
        Ok(())
    }
}
