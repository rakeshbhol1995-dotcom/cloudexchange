use goldchain_crypto::keys::PublicKey;
use goldchain_crypto::hash::Hash;
use goldchain_crypto::signature::Signature;
use crate::error::CoreError;
use goldchain_types::Transaction;
use goldchain_crypto::address::Address;
use goldchain_storage::Storage;
use borsh::{BorshSerialize, BorshDeserialize};
use serde::{Serialize, Deserialize};

pub fn governance_wasm_bytecode() -> Vec<u8> {
    vec![0, 97, 115, 109, 1, 0, 0, 0, 1, 17, 3, 96, 4, 127, 127, 127, 127, 0, 96, 2, 127, 127, 0, 96, 1, 127, 0, 3, 4, 3, 0, 1, 2, 5, 3, 1, 0, 1, 7, 63, 4, 6, 109, 101, 109, 111, 114, 121, 2, 0, 15, 112, 114, 111, 112, 111, 115, 97, 108, 95, 99, 114, 101, 97, 116, 101, 0, 0, 13, 112, 114, 111, 112, 111, 115, 97, 108, 95, 118, 111, 116, 101, 0, 1, 16, 112, 114, 111, 112, 111, 115, 97, 108, 95, 101, 120, 101, 99, 117, 116, 101, 0, 2, 10, 10, 3, 2, 0, 11, 2, 0, 11, 2, 0, 11]
}

pub fn governance_address() -> Address {
    Address::from_bytecode(&governance_wasm_bytecode())
}

#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone, Debug)]
pub struct GovProposal {
    pub id: u64,
    pub proposer: Address,
    pub recipient: Address,
    pub amount: u64,
    pub title: String,
    pub votes_for: u64,
    pub votes_against: u64,
    pub created_height: u64,
    pub executed: bool,
    pub voted_addresses: Vec<Address>,
    pub new_block_reward: Option<u64>,
    pub new_burn_percentage: Option<u8>,
}

pub fn process_governance_call(
    tx: &Transaction,
    current_height: u64,
    storage: &Storage,
) -> Result<(), CoreError> {
    let payload = String::from_utf8(tx.data.clone())
        .map_err(|_| CoreError::StateError("Governance data payload is not valid UTF-8".to_string()))?;
    
    // Load existing proposals
    let mut proposals: Vec<GovProposal> = match storage.get_contract_state_raw("gov_proposals")? {
        Some(bytes) => borsh::from_slice::<Vec<GovProposal>>(&bytes)
            .map_err(|e| CoreError::StateError(e.to_string()))?,
        None => Vec::new(),
    };

    let parts: Vec<&str> = payload.split(':').collect();
    if parts.is_empty() {
        return Err(CoreError::StateError("Empty governance payload".to_string()));
    }

    match parts[0] {
        "proposal_create" => {
            if parts.len() < 4 {
                return Err(CoreError::StateError("Invalid proposal_create payload".to_string()));
            }
            let recipient = Address(parts[1].to_string());
            let amount = parts[2].parse::<u64>()
                .map_err(|_| CoreError::StateError("Invalid proposal amount".to_string()))?;
            let title = parts[3].to_string();

            // Verify proposer is a staker
            let proposer_acct = storage.get_account(&tx.from)?
                .ok_or_else(|| CoreError::StateError("Proposer account not found".to_string()))?;
            if proposer_acct.staked == 0 {
                return Err(CoreError::StateError("Only stakers can propose".to_string()));
            }

            let proposal_id = proposals.len() as u64 + 1;
            let proposal = GovProposal {
                id: proposal_id,
                proposer: tx.from.clone(),
                recipient,
                amount,
                title,
                votes_for: proposer_acct.staked, // Auto-vote FOR with proposer's stake
                votes_against: 0,
                created_height: current_height,
                executed: false,
                voted_addresses: vec![tx.from.clone()],
                new_block_reward: None,
                new_burn_percentage: None,
            };

            proposals.push(proposal);
            println!("💡 Governance Proposal #{} Created: Transfer {} GRM", proposal_id, amount);
        }
        "proposal_create_econ" => {
            if parts.len() < 4 {
                return Err(CoreError::StateError("Invalid proposal_create_econ payload".to_string()));
            }
            let block_reward = parts[1].parse::<u64>()
                .map_err(|_| CoreError::StateError("Invalid reward parameter".to_string()))?;
            let burn_pct = parts[2].parse::<u8>()
                .map_err(|_| CoreError::StateError("Invalid burn percentage parameter".to_string()))?;
            let title = parts[3].to_string();

            // Verify proposer is a staker
            let proposer_acct = storage.get_account(&tx.from)?
                .ok_or_else(|| CoreError::StateError("Proposer account not found".to_string()))?;
            if proposer_acct.staked == 0 {
                return Err(CoreError::StateError("Only stakers can propose".to_string()));
            }

            let proposal_id = proposals.len() as u64 + 1;
            let proposal = GovProposal {
                id: proposal_id,
                proposer: tx.from.clone(),
                recipient: governance_address(),
                amount: 0,
                title,
                votes_for: proposer_acct.staked,
                votes_against: 0,
                created_height: current_height,
                executed: false,
                voted_addresses: vec![tx.from.clone()],
                new_block_reward: Some(block_reward),
                new_burn_percentage: Some(burn_pct),
            };

            proposals.push(proposal);
            println!("💡 Governance Proposal #{} Created: Update Economic Config", proposal_id);
        }
        "proposal_vote" => {
            if parts.len() < 3 {
                return Err(CoreError::StateError("Invalid proposal_vote payload".to_string()));
            }
            let proposal_id = parts[1].parse::<u64>()
                .map_err(|_| CoreError::StateError("Invalid proposal ID".to_string()))?;
            let vote_type = parts[2];

            let proposal = proposals.iter_mut().find(|p| p.id == proposal_id)
                .ok_or_else(|| CoreError::StateError(format!("Proposal #{} not found", proposal_id)))?;
            
            if proposal.executed {
                return Err(CoreError::StateError("Proposal already executed".to_string()));
            }

            if proposal.voted_addresses.contains(&tx.from) {
                return Err(CoreError::StateError("Account has already voted on this proposal".to_string()));
            }

            let voter_acct = storage.get_account(&tx.from)?
                .ok_or_else(|| CoreError::StateError("Voter account not found".to_string()))?;
            if voter_acct.staked == 0 {
                return Err(CoreError::StateError("Voter must have staked balance to vote".to_string()));
            }

            if vote_type == "approve" || vote_type == "yes" {
                proposal.votes_for = proposal.votes_for.saturating_add(voter_acct.staked);
            } else {
                proposal.votes_against = proposal.votes_against.saturating_add(voter_acct.staked);
            }

            proposal.voted_addresses.push(tx.from.clone());
            println!("🗳️ Vote counted on Proposal #{}: voter={}, staked={}", proposal_id, tx.from.as_str(), voter_acct.staked);
        }
        "proposal_execute" => {
            if parts.len() < 2 {
                return Err(CoreError::StateError("Invalid proposal_execute payload".to_string()));
            }
            let proposal_id = parts[1].parse::<u64>()
                .map_err(|_| CoreError::StateError("Invalid proposal ID".to_string()))?;

            let proposal = proposals.iter_mut().find(|p| p.id == proposal_id)
                .ok_or_else(|| CoreError::StateError(format!("Proposal #{} not found", proposal_id)))?;

            if proposal.executed {
                return Err(CoreError::StateError("Proposal already executed".to_string()));
            }

            // Calculate total staked supply
            let staked_accts = storage.get_staked_accounts()
                .map_err(|e| CoreError::StateError(e.to_string()))?;
            let total_staked_supply: u64 = staked_accts.iter().map(|(_, a)| a.staked).sum();

            // Execution conditions: simple majority and either quorum reached or voting period passed (3 blocks)
            let voting_period_passed = current_height >= proposal.created_height + 3;
            let absolute_majority = proposal.votes_for * 2 > total_staked_supply;
            let simple_majority = proposal.votes_for > proposal.votes_against;

            if absolute_majority || (voting_period_passed && simple_majority) {
                proposal.executed = true;

                // Perform the proposed action
                if let Some(reward) = proposal.new_block_reward {
                    // Update Economics Config
                    let mut econ_config = crate::economics::EconomicsConfig::load_from_db(storage);
                    econ_config.initial_block_reward = reward;
                    if let Some(burn) = proposal.new_burn_percentage {
                        econ_config.burn_percentage = burn;
                    }
                    econ_config.save_to_db(storage)
                        .map_err(|e| CoreError::StateError(format!("Failed to save economic config: {}", e)))?;
                    println!("🚀 Executed Proposal #{}: Updated block reward to {} GRM, burn percentage to {}%", proposal_id, reward, proposal.new_burn_percentage.unwrap_or(0));
                } else {
                    // Funding proposal
                    let gov_addr = governance_address();
                    let mut gov_acct = storage.get_account(&gov_addr)?
                        .ok_or_else(|| CoreError::StateError("Governance account not found".to_string()))?;
                    
                    if gov_acct.balance < proposal.amount {
                        return Err(CoreError::StateError("Insufficient governance contract balance".to_string()));
                    }

                    let mut recipient_acct = storage.get_account(&proposal.recipient)?.unwrap_or_default();
                    
                    gov_acct.balance = gov_acct.balance.saturating_sub(proposal.amount);
                    recipient_acct.balance = recipient_acct.balance.saturating_add(proposal.amount);
                    
                    storage.put_account(&gov_addr, &gov_acct)?;
                    storage.put_account(&proposal.recipient, &recipient_acct)?;
                    println!("🚀 Executed Proposal #{}: Transferred {} GRM from Governance to {}", proposal_id, proposal.amount, proposal.recipient.as_str());
                }
            } else {
                return Err(CoreError::StateError(format!(
                    "Proposal #{} does not satisfy execution requirements (Votes: {} For / {} Against, Height: {}, Created: {})",
                    proposal_id, proposal.votes_for, proposal.votes_against, current_height, proposal.created_height
                )));
            }
        }
        _ => {
            return Err(CoreError::StateError(format!("Unknown governance method: {}", parts[0])));
        }
    }

    // Save proposals back to storage
    let serialized_proposals = borsh::to_vec(&proposals)
        .map_err(|e| CoreError::StateError(e.to_string()))?;
    storage.put_contract_state_raw("gov_proposals", &serialized_proposals)?;

    Ok(())
}


pub struct EmergencyRecoveryCommittee {
    pub members: Vec<PublicKey>,
    pub required_signatures: usize,
}

pub struct EmergencyProposal {
    pub proposal_id: Hash,
    pub created_timestamp: u64,
    pub executed: bool,
}

impl EmergencyRecoveryCommittee {
    pub fn new(members: Vec<PublicKey>) -> Self {
        EmergencyRecoveryCommittee {
            members,
            required_signatures: 5, // Enforce 5-of-7 rule
        }
    }

    /// Verifies 5-of-7 signatures from committee members on the target proposal hash
    pub fn verify_signatures(
        &self,
        proposal_hash: &Hash,
        signatures: &[(PublicKey, Signature)],
    ) -> Result<(), CoreError> {
        if signatures.len() < self.required_signatures {
            return Err(CoreError::InvalidTransaction(format!(
                "Insufficient emergency signatures: expected {}, got {}",
                self.required_signatures,
                signatures.len()
            )));
        }

        use std::collections::HashSet;
        let mut seen_members = HashSet::new();
        let mut verified_count = 0;

        for (pubkey, sig) in signatures {
            if self.members.contains(pubkey) && !seen_members.contains(pubkey) {
                if sig.verify(pubkey, proposal_hash.as_ref()).is_ok() {
                    seen_members.insert(*pubkey);
                    verified_count += 1;
                }
            }
        }

        if verified_count < self.required_signatures {
            return Err(CoreError::InvalidTransaction("Signature validation failed for emergency committee".to_string()));
        }

        Ok(())
    }

    /// Enforces that the ERC authority window is active (max 14 days from activation block time)
    pub fn verify_authority_expiry(&self, activation_time: u64, current_time: u64) -> Result<(), CoreError> {
        let active_duration = current_time.saturating_sub(activation_time);
        let fourteen_days_in_seconds = 14 * 24 * 60 * 60; // 1,209,600 seconds
        if active_duration > fourteen_days_in_seconds {
            return Err(CoreError::InvalidTransaction(
                "ERC authority window expired (exceeded 14-day emergency window limit)".to_string(),
            ));
        }
        Ok(())
    }

    /// Verifies that the emergency proposal execution satisfies the 12-hour timelock delay requirement
    pub fn verify_timelock_delay(&self, proposal: &EmergencyProposal, current_time: u64) -> Result<(), CoreError> {
        let delay = current_time.saturating_sub(proposal.created_timestamp);
        let twelve_hours_in_seconds = 12 * 60 * 60; // 43,200 seconds
        if delay < twelve_hours_in_seconds {
            return Err(CoreError::InvalidTransaction(format!(
                "Emergency proposal timelock active: remaining delay {} seconds",
                twelve_hours_in_seconds - delay
            )));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use goldchain_crypto::keys::PrivateKey;

    #[test]
    fn test_erc_multisig_verification() {
        let mut members = Vec::new();
        let mut priv_keys = Vec::new();
        for _ in 0..7 {
            let priv_k = PrivateKey::generate();
            members.push(priv_k.public_key());
            priv_keys.push(priv_k);
        }

        let committee = EmergencyRecoveryCommittee::new(members);
        let proposal_hash = Hash::digest(b"emergency-upgrade-runtime");

        // Generate 5 signatures
        let mut signatures = Vec::new();
        for priv_k in &priv_keys[0..5] {
            let sig = Signature::sign(priv_k, proposal_hash.as_ref());
            signatures.push((priv_k.public_key(), sig));
        }

        assert!(committee.verify_signatures(&proposal_hash, &signatures).is_ok());

        // Generate 4 signatures (insufficient quorum)
        assert!(committee.verify_signatures(&proposal_hash, &signatures[0..4]).is_err());
    }

    #[test]
    fn test_erc_multisig_deduplication() {
        let mut members = Vec::new();
        let mut priv_keys = Vec::new();
        for _ in 0..7 {
            let priv_k = PrivateKey::generate();
            members.push(priv_k.public_key());
            priv_keys.push(priv_k);
        }

        let committee = EmergencyRecoveryCommittee::new(members);
        let proposal_hash = Hash::digest(b"emergency-upgrade-runtime");

        // Generate 1 signature, repeat it 5 times
        let priv_k = &priv_keys[0];
        let sig = Signature::sign(priv_k, proposal_hash.as_ref());
        let mut signatures = Vec::new();
        for _ in 0..5 {
            signatures.push((priv_k.public_key(), sig.clone()));
        }

        // Must fail because public keys are not unique (only 1 unique verified signature)
        assert!(committee.verify_signatures(&proposal_hash, &signatures).is_err());
    }

    #[test]
    fn test_erc_authority_expiry() {
        let committee = EmergencyRecoveryCommittee::new(vec![]);
        // Active for 5 days => OK
        assert!(committee.verify_authority_expiry(1000, 1000 + 5 * 24 * 3600).is_ok());
        // Active for 15 days => Err
        assert!(committee.verify_authority_expiry(1000, 1000 + 15 * 24 * 3600).is_err());
    }

    #[test]
    fn test_proposal_timelock_delay() {
        let committee = EmergencyRecoveryCommittee::new(vec![]);
        let proposal = EmergencyProposal {
            proposal_id: Hash::digest(b"p1"),
            created_timestamp: 100000,
            executed: false,
        };

        // Try executing after 5 hours (18000 seconds) => Err
        assert!(committee.verify_timelock_delay(&proposal, 100000 + 18000).is_err());
        // Try executing after 13 hours (46800 seconds) => OK
        assert!(committee.verify_timelock_delay(&proposal, 100000 + 46800).is_ok());
    }
}
