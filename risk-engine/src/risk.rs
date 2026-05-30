use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct Position {
    pub symbol: String,
    pub size: i64,          // Positive for Long, Negative for Short
    pub entry_price: u64,   // Scale: 10^8
    pub leverage: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RiskState {
    Normal,
    Tier1Alert,        // price deviation > 1%
    Tier2MarginAdjust, // price deviation > 3%
    Tier3Halt,         // price deviation > 5%
    KillSwitchActive,  // Admin emergency stop
}

#[derive(Debug, Clone)]
pub struct MarginAccount {
    pub user_id: String,
    pub collateral: u64,    // USDT balance. Scale: 10^8
    pub positions: HashMap<String, Position>,
}

pub struct RiskEngine {
    pub base_maintenance_margin_rate: f64, // e.g., 0.05 (5%)
    pub initial_margin_rate: f64,          // e.g., 0.10 (10%)
    pub ewma_variance: f64,                // Running variance parameter
    pub lambda: f64,                       // Decaying factor (typically 0.94)
    pub vol_scaling_factor: f64,           // Multiplier to scale MMR with volatility
    pub risk_state: RiskState,             // Gradual risk tier tracking
}

impl RiskEngine {
    pub fn new(mmr: f64, imr: f64) -> Self {
        Self {
            base_maintenance_margin_rate: mmr,
            initial_margin_rate: imr,
            ewma_variance: 0.0004,         // Initialized to 2% standard deviation (0.02^2)
            lambda: 0.94,
            vol_scaling_factor: 2.5,
            risk_state: RiskState::Normal,
        }
    }

    pub fn trigger_kill_switch(&mut self) {
        println!("[RISK ENGINE] CRITICAL: Dynamic Administrative Kill Switch Activated! halting matching.");
        self.risk_state = RiskState::KillSwitchActive;
    }

    pub fn evaluate_market_deviation(&mut self, mark_price: u64, index_price: u64) {
        if self.risk_state == RiskState::KillSwitchActive {
            return; // Kill switch has precedence
        }
        if index_price == 0 {
            return;
        }

        let deviation = (mark_price as f64 - index_price as f64).abs() / index_price as f64;
        let old_state = self.risk_state;

        if deviation > 0.05 {
            self.risk_state = RiskState::Tier3Halt;
        } else if deviation > 0.03 {
            self.risk_state = RiskState::Tier2MarginAdjust;
        } else if deviation > 0.01 {
            self.risk_state = RiskState::Tier1Alert;
        } else {
            self.risk_state = RiskState::Normal;
        }

        if old_state != self.risk_state {
            println!(
                "[RISK ENGINE] State transitioned from {:?} to {:?} due to market deviation of {:.2}%",
                old_state, self.risk_state, deviation * 100.0
            );
        }
    }

    /// Update running EWMA variance based on new mark price return
    pub fn update_volatility(&mut self, next_price: u64, prev_price: u64) {
        if prev_price == 0 || next_price == 0 {
            return;
        }
        let price_return = (next_price as f64 - prev_price as f64) / prev_price as f64;
        // EWMA update: var_t = lambda * var_{t-1} + (1 - lambda) * return^2
        self.ewma_variance = self.lambda * self.ewma_variance + (1.0 - self.lambda) * price_return * price_return;
        
        let current_vol = self.get_current_volatility();
        let dynamic_mmr = self.get_dynamic_maintenance_margin_rate();
        println!(
            "  [Risk Volatility Update] Price: {} -> {}, Return: {:.4}%, EWMA Volatility: {:.4}%, Dynamic MMR: {:.2}%",
            prev_price, next_price, price_return * 100.0, current_vol * 100.0, dynamic_mmr * 100.0
        );
    }

    pub fn get_current_volatility(&self) -> f64 {
        self.ewma_variance.sqrt()
    }

    pub fn get_dynamic_maintenance_margin_rate(&self) -> f64 {
        let vol = self.get_current_volatility();
        // Dynamic MMR = Base MMR + Volatility Scale. Capped between 5% and 25%.
        let dynamic = self.base_maintenance_margin_rate + self.vol_scaling_factor * vol;
        dynamic.clamp(self.base_maintenance_margin_rate, 0.25)
    }

    /// Calculate unrealized PnL for a position based on current mark price
    pub fn calculate_unrealized_pnl(&self, position: &Position, mark_price: u64) -> i64 {
        let entry = position.entry_price as f64;
        let mark = mark_price as f64;
        let size = position.size as f64;

        // PnL Long = Size * (Mark - Entry) / 10^8
        // PnL Short = Size * (Entry - Mark) / 10^8
        let pnl = if position.size >= 0 {
            size * (mark - entry) / 100_000_000.0
        } else {
            // size is negative, so size * (entry - mark) is equivalent to:
            // |size| * (entry - mark)
            size.abs() * (entry - mark) / 100_000_000.0
        };
        pnl as i64
    }

    /// Compute total account equity: Collateral + Sum(Unrealized PnL)
    pub fn calculate_equity(&self, account: &MarginAccount, mark_prices: &HashMap<String, u64>) -> i64 {
        let mut equity = account.collateral as i64;
        
        for (symbol, position) in &account.positions {
            if let Some(&mark_price) = mark_prices.get(symbol) {
                let pnl = self.calculate_unrealized_pnl(position, mark_price);
                equity += pnl;
            }
        }
        equity
    }

    /// Calculate Maintenance Margin Required (MMR): Sum(|Position Size| * Mark Price * MMR)
    pub fn calculate_maintenance_margin_required(
        &self,
        account: &MarginAccount,
        mark_prices: &HashMap<String, u64>,
    ) -> u64 {
        let mut total_mmr = 0.0;
        let mm_rate = self.get_dynamic_maintenance_margin_rate();

        for (symbol, position) in &account.positions {
            if let Some(&mark_price) = mark_prices.get(symbol) {
                let pos_value = (position.size.abs() as f64 * mark_price as f64) / 100_000_000.0;
                total_mmr += pos_value * mm_rate;
            }
        }
        total_mmr as u64
    }

    /// Check if account is in liquidation threshold: Equity < Maintenance Margin Required
    pub fn is_liquidation_triggered(
        &self,
        account: &MarginAccount,
        mark_prices: &HashMap<String, u64>,
    ) -> bool {
        let equity = self.calculate_equity(account, mark_prices);
        let mm_required = self.calculate_maintenance_margin_required(account, mark_prices) as i64;
        
        equity < mm_required
    }

    /// Performs a partial liquidation to reduce position sizes and restore safety margin.
    /// If partial liquidation cannot save the account, it performs a full liquidation.
    pub fn execute_liquidation(
        &self,
        account: &mut MarginAccount,
        mark_prices: &HashMap<String, u64>,
        insurance_fund: &mut u64,
    ) -> String {
        let equity = self.calculate_equity(account, mark_prices);
        let mm_required = self.calculate_maintenance_margin_required(account, mark_prices) as i64;

        if equity >= mm_required {
            return "Account is safe. No liquidation required.".to_string();
        }

        println!("[Liquidation Engine] Executing liquidation sequence for user: {}...", account.user_id);
        println!("  Current Equity: {:.4}, Maintenance Margin Required: {:.4}", equity as f64 / 100_000_000.0, mm_required as f64 / 100_000_000.0);

        let mut actions = Vec::new();

        // 1. Partial Liquidation: Attempt to reduce positions by 50%
        for (symbol, position) in account.positions.iter_mut() {
            if position.size == 0 {
                continue;
            }
            let reduction = position.size / 2;
            println!("  [Step 1 - Partial Liquidation] Reducing position for {} by 50%: size from {} to {}", symbol, position.size, position.size - reduction);
            position.size -= reduction;
            actions.push(format!("Reduced position {} size by 50%", symbol));
        }

        // Re-evaluate account safety after partial reduction
        let new_equity = self.calculate_equity(account, mark_prices);
        let new_mm_required = self.calculate_maintenance_margin_required(account, mark_prices) as i64;

        if new_equity >= new_mm_required {
            return format!("Partial liquidation completed successfully: {}", actions.join("; "));
        }

        // 2. Full Liquidation & Insurance Fund Absorption
        // If equity is negative, the insurance fund absorbs the bankrupt balance deficit
        println!("  [Step 2 - Full Liquidation] Account remains unsafe. Closing all positions.");
        account.positions.clear();
        
        let final_equity = account.collateral as i64; // No positions left, equity is just collateral
        if final_equity < 0 {
            let deficit = final_equity.abs() as u64;
            if *insurance_fund >= deficit {
                *insurance_fund -= deficit;
                account.collateral = 0;
                return "Full liquidation executed. Deficit absorbed by Exchange Insurance Fund.".to_string();
            } else {
                let absorbed = *insurance_fund;
                *insurance_fund = 0;
                account.collateral = 0;
                // Auto-Deleveraging (ADL) trigger: system bankrupt deficit exceeded insurance capacity
                return format!(
                    "Full liquidation executed. Deficit exceeded insurance capacity. ADL Triggered! (System deficit: {} USDT)",
                    deficit - absorbed
                );
            }
        }

        account.collateral = final_equity as u64;
        "Full liquidation executed successfully. Remaining collateral saved.".to_string()
    }
}
