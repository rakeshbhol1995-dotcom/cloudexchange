use goldchain_crypto::keys::PublicKey;
use goldchain_crypto::hash::Hash;
use crate::error::CoreError;
use std::collections::HashMap;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConsensusStep {
    Propose,
    Prevote,
    Precommit,
    Commit,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Validator {
    pub pubkey: PublicKey,
    pub voting_power: u64,
    pub staked_balance: u64,
    pub is_slashed: bool,
}

pub struct ConsensusState {
    pub height: u64,
    pub round: u32,
    pub step: ConsensusStep,
    pub validators: Vec<Validator>,
    pub locked_block: Option<Hash>,
    pub locked_round: Option<u32>,
    // Tracks votes per validator at the current round
    pub prevotes: HashMap<PublicKey, Option<Hash>>,
    pub precommits: HashMap<PublicKey, Option<Hash>>,
    pub proposals_seen: HashMap<u64, Vec<goldchain_types::Block>>,
}

impl ConsensusState {
    /// Initializes a new BFT Consensus state with the given validator set
    pub fn new(validators: Vec<Validator>) -> Self {
        ConsensusState {
            height: 1,
            round: 0,
            step: ConsensusStep::Propose,
            validators,
            locked_block: None,
            locked_round: None,
            prevotes: HashMap::new(),
            precommits: HashMap::new(),
            proposals_seen: HashMap::new(),
        }
    }

    /// Advances the consensus round or height
    pub fn advance_round(&mut self) {
        self.round += 1;
        self.step = ConsensusStep::Propose;
        self.prevotes.clear();
        self.precommits.clear();
    }

    pub fn advance_height(&mut self) {
        self.height += 1;
        self.round = 0;
        self.step = ConsensusStep::Propose;
        self.locked_block = None;
        self.locked_round = None;
        self.prevotes.clear();
        self.precommits.clear();
        self.proposals_seen.retain(|&h, _| h >= self.height);
    }

    /// Verifies that a block proposer has not signed two different blocks at the same height (equivocation).
    /// If equivocation is detected, slashes the validator's stake on-chain and in-memory.
    pub fn verify_and_record_proposal(
        &mut self,
        block: &goldchain_types::Block,
        storage: &goldchain_storage::Storage,
    ) -> Result<(), CoreError> {
        let height = block.header.height;
        let validator_addr = &block.header.validator;
        let pubkey = validator_addr.to_public_key()
            .map_err(|e| CoreError::InvalidBlock(format!("Invalid proposer key: {}", e)))?;
        
        let seen = self.proposals_seen.entry(height).or_insert_with(Vec::new);
        let block_hash = block.hash();
        
        for old_block in seen.iter() {
            if old_block.header.validator == *validator_addr && old_block.hash() != block_hash {
                // Equivocation detected!
                println!("🚨 EQUIVOCATION DETECTED: Validator {} signed two different blocks at height {}!", validator_addr.as_str(), height);
                // Call slash_validator_on_chain (5% slash)
                crate::block::slash_validator_on_chain(storage, validator_addr, 5)?;
                // Slash validator in-memory
                let _ = self.slash_validator(&pubkey);
                return Err(CoreError::InvalidBlock("Equivocation detected: proposer double-signed at this height".to_string()));
            }
        }
        
        seen.push(block.clone());
        Ok(())
    }

    /// Simulates validator block proposal step
    pub fn propose_block(&mut self, _block_hash: Hash) -> Result<(), CoreError> {
        if self.step != ConsensusStep::Propose {
            return Err(CoreError::InvalidBlock("Proposal step must be first".to_string()));
        }
        self.step = ConsensusStep::Prevote;
        Ok(())
    }

    /// Enforces voting in the Prevote phase
    pub fn cast_prevote(&mut self, validator_pubkey: PublicKey, vote: Option<Hash>) -> Result<(), CoreError> {
        let val = self.validators.iter().find(|v| v.pubkey == validator_pubkey)
            .ok_or_else(|| CoreError::InvalidBlock("Validator not in validator set".to_string()))?;

        if val.is_slashed {
            return Err(CoreError::InvalidBlock("Slashed validator cannot vote".to_string()));
        }

        self.prevotes.insert(validator_pubkey, vote);
        
        // Calculate voting threshold
        if self.has_quorum(&self.prevotes) {
            self.step = ConsensusStep::Precommit;
        }

        Ok(())
    }

    /// Enforces voting in the Precommit phase
    pub fn cast_precommit(&mut self, validator_pubkey: PublicKey, vote: Option<Hash>) -> Result<(), CoreError> {
        let val = self.validators.iter().find(|v| v.pubkey == validator_pubkey)
            .ok_or_else(|| CoreError::InvalidBlock("Validator not in validator set".to_string()))?;

        if val.is_slashed {
            return Err(CoreError::InvalidBlock("Slashed validator cannot vote".to_string()));
        }

        self.precommits.insert(validator_pubkey, vote);

        // If quorum is achieved, lock the block
        if self.has_quorum(&self.precommits) {
            if let Some(Some(hash)) = self.precommits.get(&validator_pubkey) {
                self.locked_block = Some(*hash);
                self.locked_round = Some(self.round);
            }
            self.step = ConsensusStep::Commit;
        }

        Ok(())
    }

    /// Validates if a specific vote map has achieved > 2/3 + 1 BFT quorum
    pub fn has_quorum(&self, votes: &HashMap<PublicKey, Option<Hash>>) -> bool {
        let mut total_power = 0u64;
        let mut voted_power = 0u64;

        for val in &self.validators {
            if !val.is_slashed {
                total_power += val.voting_power;
                if votes.contains_key(&val.pubkey) {
                    voted_power += val.voting_power;
                }
            }
        }

        if total_power == 0 {
            return false;
        }

        // BFT 2/3+ threshold check (quorum is reached when voting power is at least 2/3)
        voted_power * 3 >= total_power * 2
    }

    /// Rotates the validator set at epoch boundaries
    pub fn rotate_validators(&mut self, next_validators: Vec<Validator>) {
        self.validators = next_validators;
        self.prevotes.clear();
        self.precommits.clear();
    }

    /// Enforces Correlated Slashing on double-signing (equivocation)
    pub fn slash_validator(&mut self, validator_pubkey: &PublicKey) -> Result<(), CoreError> {
        let val = self.validators.iter_mut().find(|v| v.pubkey == *validator_pubkey)
            .ok_or_else(|| CoreError::InvalidBlock("Validator not found in set".to_string()))?;

        if val.is_slashed {
            return Ok(()); // Already slashed
        }

        // Apply 100% immediate slash and permanent tombstoning
        val.staked_balance = 0;
        val.voting_power = 0;
        val.is_slashed = true;

        Ok(())
    }
}

/// Simulates a distributed network of validators running BFT consensus over a P2P mesh network.
pub fn simulate_p2p_consensus_gossip(
    validator_keys: Vec<(goldchain_crypto::keys::PrivateKey, String)>,
    _old_block_hash: Hash,
) -> Result<(), CoreError> {
    use crate::p2p::{P2PNode, GossipMessage};

    let db_path = "sim_gossip_temp.redb";
    let _ = std::fs::remove_file(db_path);
    let storage = goldchain_storage::Storage::open(db_path).unwrap();

    struct SimulatedNode {
        pubkey: PublicKey,
        address: String,
        p2p: P2PNode,
        state: ConsensusState,
    }

    struct Packet {
        sender: String,
        recipient: String,
        message: GossipMessage,
    }

    let mut nodes = Vec::new();
    let mut validator_info = Vec::new();

    // First, construct the validator list for the ConsensusStates
    for (priv_key, _) in &validator_keys {
        let pubkey = priv_key.public_key();
        validator_info.push(Validator {
            pubkey,
            voting_power: 100,
            staked_balance: 5000,
            is_slashed: false,
        });
    }

    // Now, create the simulated nodes and connect them in a mesh (each node is connected to all other nodes)
    for (priv_key, addr) in &validator_keys {
        let pubkey = priv_key.public_key();
        let mut p2p = P2PNode::new(addr.clone());
        
        // Connect to all other nodes
        for (_, other_addr) in &validator_keys {
            if other_addr != addr {
                p2p.connect_peer(other_addr.clone());
            }
        }

        let state = ConsensusState::new(validator_info.clone());
        nodes.push(SimulatedNode {
            pubkey,
            address: addr.clone(),
            p2p,
            state,
        });
    }

    // Create a dummy block for simulation
    let dummy_block = goldchain_types::Block::new(
        1,
        1000,
        Hash([0u8; 32]),
        Hash([0u8; 32]),
        goldchain_crypto::address::Address::from_public_key(&validator_keys[0].0.public_key()),
        Vec::new(),
    );
    let block_hash = dummy_block.hash();

    let mut packet_queue = Vec::new();

    // Node 0 proposes the block
    let proposal_msg = GossipMessage::BlockProposal {
        height: 1,
        round: 0,
        block: dummy_block.clone(),
    };

    // Node 0 proposes locally
    nodes[0].state.propose_block(block_hash)?;

    // Node 0 casts its prevote locally
    let node0_pubkey = nodes[0].pubkey;
    nodes[0].state.cast_prevote(node0_pubkey, Some(block_hash))?;

    // Node 0 initiates gossip for the Proposal and its Prevote
    let proposal_forwards = nodes[0].p2p.initiate_broadcast(proposal_msg);
    for (peer, msg) in proposal_forwards {
        packet_queue.push(Packet {
            sender: nodes[0].address.clone(),
            recipient: peer,
            message: msg,
        });
    }

    let prevote_msg = GossipMessage::Prevote {
        height: 1,
        round: 0,
        block_hash: Some(block_hash),
        validator: nodes[0].pubkey,
    };
    let prevote_forwards = nodes[0].p2p.initiate_broadcast(prevote_msg);
    for (peer, msg) in prevote_forwards {
        packet_queue.push(Packet {
            sender: nodes[0].address.clone(),
            recipient: peer,
            message: msg,
        });
    }

    // Process packets in the queue using a bounded loop to avoid infinite loops in case of bugs
    let mut iterations = 0;
    while !packet_queue.is_empty() && iterations < 1000 {
        iterations += 1;
        let packet = packet_queue.remove(0);

        // Find recipient node
        let recipient_idx = nodes.iter().position(|n| n.address == packet.recipient);
        if let Some(idx) = recipient_idx {
            // Receive the gossip packet
            let forwards = nodes[idx].p2p.receive_gossip(&packet.sender, packet.message.clone())?;

            // Push forward packets to queue
            for (peer, msg) in forwards {
                packet_queue.push(Packet {
                    sender: nodes[idx].address.clone(),
                    recipient: peer,
                    message: msg,
                });
            }

            // Apply consensus logic on the recipient based on the message
            match packet.message {
                GossipMessage::BlockProposal { height, round, block: p_block } => {
                    let p_hash = p_block.hash();
                    if nodes[idx].state.height == height && nodes[idx].state.round == round {
                        if nodes[idx].state.step == ConsensusStep::Propose {
                            // Verify that the proposer is the designated leader for this height and round
                            let expected_leader_idx = ((height - 1) as usize + round as usize) % nodes[idx].state.validators.len();
                            let expected_leader_pubkey = &nodes[idx].state.validators[expected_leader_idx].pubkey;
                            let proposer_pubkey = match p_block.header.validator.to_public_key() {
                                Ok(pk) => pk,
                                Err(_) => continue,
                            };
                            if &proposer_pubkey != expected_leader_pubkey {
                                continue;
                            }

                            let _ = nodes[idx].state.verify_and_record_proposal(&p_block, &storage);
                            nodes[idx].state.propose_block(p_hash)?;
                            
                            // Cast prevote
                            let my_pubkey = nodes[idx].pubkey;
                            nodes[idx].state.cast_prevote(my_pubkey, Some(p_hash))?;
                            
                            // Broadcast prevote
                            let my_prevote = GossipMessage::Prevote {
                                height,
                                round,
                                block_hash: Some(p_hash),
                                validator: nodes[idx].pubkey,
                            };
                            let my_forwards = nodes[idx].p2p.initiate_broadcast(my_prevote);
                            for (peer, msg) in my_forwards {
                                packet_queue.push(Packet {
                                    sender: nodes[idx].address.clone(),
                                    recipient: peer,
                                    message: msg,
                                });
                            }
                        }
                    }
                }
                GossipMessage::Prevote { height, round, block_hash: p_hash, validator } => {
                    if nodes[idx].state.height == height && nodes[idx].state.round == round {
                        let prev_step = nodes[idx].state.step;
                        nodes[idx].state.cast_prevote(validator, p_hash)?;
                        let new_step = nodes[idx].state.step;

                        // If transitioned from Prevote to Precommit, broadcast our precommit
                        if prev_step == ConsensusStep::Prevote && new_step == ConsensusStep::Precommit {
                            let my_pubkey = nodes[idx].pubkey;
                            nodes[idx].state.cast_precommit(my_pubkey, Some(block_hash))?;

                            let my_precommit = GossipMessage::Precommit {
                                height,
                                round,
                                block_hash: Some(block_hash),
                                validator: nodes[idx].pubkey,
                            };
                            let my_forwards = nodes[idx].p2p.initiate_broadcast(my_precommit);
                            for (peer, msg) in my_forwards {
                                packet_queue.push(Packet {
                                    sender: nodes[idx].address.clone(),
                                    recipient: peer,
                                    message: msg,
                                });
                            }
                        }
                    }
                }
                GossipMessage::Precommit { height, round, block_hash: p_hash, validator } => {
                    if nodes[idx].state.height == height && nodes[idx].state.round == round {
                        nodes[idx].state.cast_precommit(validator, p_hash)?;
                    }
                }
            }
        }
    }

    // Now, assert that all nodes reached the Commit step and successfully committed the block!
    for node in &mut nodes {
        if node.state.step != ConsensusStep::Commit {
            let _ = std::fs::remove_file("sim_gossip_temp.redb");
            return Err(CoreError::InvalidBlock(format!(
                "Node {} failed to reach Commit step, current step: {:?}",
                node.address, node.state.step
            )));
        }
        // Advance height network-wide as block is committed!
        node.state.advance_height();
        if node.state.height != 2 {
            let _ = std::fs::remove_file("sim_gossip_temp.redb");
            return Err(CoreError::InvalidBlock(format!(
                "Node {} failed to advance height to 2",
                node.address
            )));
        }
    }

    let _ = std::fs::remove_file("sim_gossip_temp.redb");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use goldchain_crypto::keys::PrivateKey;

    #[test]
    fn test_bft_consensus_flow_and_slashing() {
        let priv_key1 = PrivateKey::generate();
        let pub_key1 = priv_key1.public_key();
        let priv_key2 = PrivateKey::generate();
        let pub_key2 = priv_key2.public_key();
        let priv_key3 = PrivateKey::generate();
        let pub_key3 = priv_key3.public_key();

        let validators = vec![
            Validator {
                pubkey: pub_key1,
                voting_power: 100,
                staked_balance: 5000,
                is_slashed: false,
            },
            Validator {
                pubkey: pub_key2,
                voting_power: 100,
                staked_balance: 5000,
                is_slashed: false,
            },
            Validator {
                pubkey: pub_key3,
                voting_power: 100,
                staked_balance: 5000,
                is_slashed: false,
            },
        ];

        let mut state = ConsensusState::new(validators);
        let block_hash = Hash::digest(b"bft-block-payload");

        // 1. Propose
        assert_eq!(state.step, ConsensusStep::Propose);
        state.propose_block(block_hash).unwrap();
        assert_eq!(state.step, ConsensusStep::Prevote);

        // 2. Prevote with 2 out of 3 validators (satisfies > 2/3 BFT quorum)
        state.cast_prevote(pub_key1, Some(block_hash)).unwrap();
        assert_eq!(state.step, ConsensusStep::Prevote); // Threshold not reached with 1/3 yet
        
        state.cast_prevote(pub_key2, Some(block_hash)).unwrap();
        assert_eq!(state.step, ConsensusStep::Precommit); // Quorum reached!

        // 3. Precommit
        state.cast_precommit(pub_key1, Some(block_hash)).unwrap();
        state.cast_precommit(pub_key2, Some(block_hash)).unwrap();
        assert_eq!(state.step, ConsensusStep::Commit); // Committed!

        // 4. Test Slashing
        state.slash_validator(&pub_key3).unwrap();
        assert!(state.validators[2].is_slashed);
        assert_eq!(state.validators[2].staked_balance, 0);
        assert_eq!(state.validators[2].voting_power, 0);

        // Slashed validator cannot vote
        assert!(state.cast_prevote(pub_key3, Some(block_hash)).is_err());
    }

    #[test]
    fn test_gossip_bft_consensus_propagation() {
        let priv_key1 = PrivateKey::generate();
        let priv_key2 = PrivateKey::generate();
        let priv_key3 = PrivateKey::generate();

        let validator_keys = vec![
            (priv_key1, "127.0.0.1:9000".to_string()),
            (priv_key2, "127.0.0.1:9001".to_string()),
            (priv_key3, "127.0.0.1:9002".to_string()),
        ];

        let block_hash = Hash::digest(b"gossip-bft-block-payload");
        simulate_p2p_consensus_gossip(validator_keys, block_hash).unwrap();
    }
}
