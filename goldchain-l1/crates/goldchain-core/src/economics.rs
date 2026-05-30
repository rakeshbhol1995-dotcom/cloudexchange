#[derive(Clone, Debug)]
pub struct EconomicsConfig {
    pub initial_block_reward: u64,
    pub halving_interval: u64,
    pub burn_percentage: u8,
}

impl Default for EconomicsConfig {
    fn default() -> Self {
        EconomicsConfig {
            initial_block_reward: 2_000_000_000, // 2 GOLD with 9 decimals (2,000,000,000)
            halving_interval: 210_000,
            burn_percentage: 50, // 50% fee burn (EIP-1559 style)
        }
    }
}

pub struct EconomicsModule {
    pub config: EconomicsConfig,
}

impl EconomicsModule {
    pub fn new(config: EconomicsConfig) -> Self {
        EconomicsModule { config }
    }

    /// Calculates block reward with halving logic based on block height
    pub fn calculate_block_reward(&self, height: u64) -> u64 {
        let halvings = height / self.config.halving_interval;
        if halvings >= 64 {
            0
        } else {
            self.config.initial_block_reward >> halvings
        }
    }

    /// Splits transaction fee into (burned_amount, validator_reward_amount)
    pub fn process_fee(&self, total_fee: u64) -> (u64, u64) {
        let burned = (total_fee * self.config.burn_percentage as u64) / 100;
        let validator_reward = total_fee.saturating_sub(burned);
        (burned, validator_reward)
    }

    /// Verifies the Cryptoeconomic Security Ratio (CESR)
    pub fn verify_economic_security_ratio(&self, total_staked_value: u64, bridge_tvl: u64) -> Result<(), String> {
        if bridge_tvl == 0 {
            return Ok(());
        }
        let ratio = total_staked_value as f64 / bridge_tvl as f64;
        if ratio < 3.0 {
            return Err(format!(
                "Security breach: CESR ratio is {:.2}, must be at least 3.0",
                ratio
            ));
        }
        Ok(())
    }

    /// Validates validator commission percentage matches the 20% cap rule
    pub fn validate_validator_commission(&self, commission_percentage: u8) -> Result<(), String> {
        if commission_percentage > 20 {
            return Err("Validator commission exceeds the maximum allowed cap of 20%".to_string());
        }
        Ok(())
    }

    /// Asserts supply invariant (Total = Circulating + Staked + Treasury + Locked)
    pub fn verify_supply_invariant(
        &self,
        circulating: u64,
        staked: u64,
        treasury: u64,
        locked: u64,
        expected_total: u64,
    ) -> Result<(), String> {
        let actual_total = circulating
            .saturating_add(staked)
            .saturating_add(treasury)
            .saturating_add(locked);
        if actual_total != expected_total {
            return Err(format!(
                "Supply invariant violated! Expected {}, got {}",
                expected_total, actual_total
            ));
        }
        Ok(())
    }

    /// Calculates correlated slashing percentage based on offline ratio
    pub fn calculate_slash_percentage(&self, correlated_offline: usize, total_validators: usize) -> u64 {
        if total_validators == 0 {
            return 0;
        }
        let ratio = correlated_offline as f64 / total_validators as f64;
        if ratio > 0.3 {
            50 // 0.5% (scaled as 50 basis points)
        } else {
            5 // 0.05% (scaled as 5 basis points)
        }
    }

    /// Returns the bridge daily cap dynamically using TWAP locked bridge liquidity
    pub fn calculate_bridge_daily_cap(&self, twap_locked_liquidity: u64) -> u64 {
        let pct_cap = (twap_locked_liquidity * 20) / 100;
        let abs_cap = 500_000_000_000_000; // 500k GOLD (with 9 decimals)
        std::cmp::min(pct_cap, abs_cap)
    }
}

// Gas schedules and deposits constants
pub const GAS_VRF_VERIFY: u64 = 15_000;
pub const EOA_CREATION_DEPOSIT: u64 = 100_000_000; // 0.1 GOLD (9 decimals)
pub const STATE_DEPOSIT_PER_BYTE: u64 = 1_000_000; // 0.001 GOLD (9 decimals)
pub const EMERGENCY_PROPOSAL_TIMELOCK_SECONDS: u64 = 43_200; // 12 hours timelock

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_block_reward_halvings() {
        let config = EconomicsConfig {
            initial_block_reward: 1000,
            halving_interval: 100,
            burn_percentage: 50,
        };
        let economics = EconomicsModule::new(config);

        assert_eq!(economics.calculate_block_reward(0), 1000);
        assert_eq!(economics.calculate_block_reward(99), 1000);
        assert_eq!(economics.calculate_block_reward(100), 500);
        assert_eq!(economics.calculate_block_reward(200), 250);
        assert_eq!(economics.calculate_block_reward(1000), 0);
    }

    #[test]
    fn test_fee_burn_splitting() {
        let config = EconomicsConfig {
            initial_block_reward: 1000,
            halving_interval: 100,
            burn_percentage: 30,
        };
        let economics = EconomicsModule::new(config);

        let (burned, validator) = economics.process_fee(100);
        assert_eq!(burned, 30);
        assert_eq!(validator, 70);
    }

    #[test]
    fn test_cesr_and_commission_validation() {
        let economics = EconomicsModule::new(EconomicsConfig::default());
        assert!(economics.verify_economic_security_ratio(300, 100).is_ok());
        assert!(economics.verify_economic_security_ratio(250, 100).is_err());

        assert!(economics.validate_validator_commission(15).is_ok());
        assert!(economics.validate_validator_commission(25).is_err());
    }

    #[test]
    fn test_supply_invariant_verification() {
        let economics = EconomicsModule::new(EconomicsConfig::default());
        assert!(economics.verify_supply_invariant(1000, 500, 200, 300, 2000).is_ok());
        assert!(economics.verify_supply_invariant(1000, 500, 200, 300, 2500).is_err());
    }

    #[test]
    fn test_correlated_slashing() {
        let economics = EconomicsModule::new(EconomicsConfig::default());
        // 4 out of 10 offline (40% > 30% offline) => 50 bp
        assert_eq!(economics.calculate_slash_percentage(4, 10), 50);
        // 2 out of 10 offline (20% <= 30% offline) => 5 bp
        assert_eq!(economics.calculate_slash_percentage(2, 10), 5);
    }
}
