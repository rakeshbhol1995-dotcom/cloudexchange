use crate::error::CoreError;
use goldchain_crypto::keys::PublicKey;
use goldchain_crypto::hash::Hash;
use std::collections::HashMap;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum GossipMessage {
    BlockProposal { height: u64, round: u32, block_hash: Hash },
    Prevote { height: u64, round: u32, block_hash: Option<Hash>, validator: PublicKey },
    Precommit { height: u64, round: u32, block_hash: Option<Hash>, validator: PublicKey },
}

pub struct P2PNode {
    pub address: String,
    pub peers: Vec<String>,
    pub received_messages: Vec<GossipMessage>,
    pub message_routes: HashMap<Hash, Vec<String>>, // Keeps track of peers routed to prevent infinite gossip loops
}

impl P2PNode {
    pub fn new(address: String) -> Self {
        P2PNode {
            address,
            peers: Vec::new(),
            received_messages: Vec::new(),
            message_routes: HashMap::new(),
        }
    }

    pub fn connect_peer(&mut self, peer_address: String) {
        if !self.peers.contains(&peer_address) {
            self.peers.push(peer_address);
        }
    }

    /// Simulates receiving a gossiped message over the network mesh, deduplicating and generating forwarding steps.
    pub fn receive_gossip(
        &mut self,
        sender: &str,
        msg: GossipMessage,
    ) -> Result<Vec<(String, GossipMessage)>, CoreError> {
        // Compute deterministic hash of the message contents for tracking routes
        let serialized = format!("{:?}", msg);
        let msg_hash = Hash::digest(serialized.as_bytes());

        // 1. Deduplicate: if already received, drop/discard immediately to prevent loops
        if self.received_messages.contains(&msg) {
            return Ok(Vec::new());
        }

        self.received_messages.push(msg.clone());

        // 2. Track route: mark sender as already possessing the message
        let routed = self.message_routes.entry(msg_hash).or_insert_with(Vec::new);
        if !routed.contains(&sender.to_string()) {
            routed.push(sender.to_string());
        }

        // 3. Prepare forwarding packets to all active unrouted connected peers
        let mut forwards = Vec::new();
        for peer in &self.peers {
            if peer != sender && !routed.contains(peer) {
                routed.push(peer.clone());
                forwards.push((peer.clone(), msg.clone()));
            }
        }

        Ok(forwards)
    }

    /// Initiates a gossip broadcast starting from this node as the origin source
    pub fn initiate_broadcast(&mut self, msg: GossipMessage) -> Vec<(String, GossipMessage)> {
        let serialized = format!("{:?}", msg);
        let msg_hash = Hash::digest(serialized.as_bytes());

        self.received_messages.push(msg.clone());
        
        let routed = self.message_routes.entry(msg_hash).or_insert_with(Vec::new);
        routed.push(self.address.clone());

        let mut forwards = Vec::new();
        for peer in &self.peers {
            routed.push(peer.clone());
            forwards.push((peer.clone(), msg.clone()));
        }
        forwards
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_p2p_gossip_mesh_propagation() {
        // Create 3 interconnected nodes: Node A <-> Node B <-> Node C
        let mut node_a = P2PNode::new("127.0.0.1:8000".to_string());
        let mut node_b = P2PNode::new("127.0.0.1:8001".to_string());
        let mut node_c = P2PNode::new("127.0.0.1:8002".to_string());

        node_a.connect_peer("127.0.0.1:8001".to_string());
        node_b.connect_peer("127.0.0.1:8000".to_string());
        node_b.connect_peer("127.0.0.1:8002".to_string());
        node_c.connect_peer("127.0.0.1:8001".to_string());

        let block_hash = Hash::digest(b"p2p-block");
        let proposal = GossipMessage::BlockProposal {
            height: 1,
            round: 0,
            block_hash,
        };

        // 1. Node A initiates proposal broadcast
        let forwards_from_a = node_a.initiate_broadcast(proposal.clone());
        assert_eq!(forwards_from_a.len(), 1);
        assert_eq!(forwards_from_a[0].0, "127.0.0.1:8001");

        // 2. Node B receives gossip packet from Node A
        let forwards_from_b = node_b.receive_gossip("127.0.0.1:8000", forwards_from_a[0].1.clone()).unwrap();
        assert_eq!(forwards_from_b.len(), 1);
        assert_eq!(forwards_from_b[0].0, "127.0.0.1:8002");

        // 3. Node C receives gossip packet from Node B
        let forwards_from_c = node_c.receive_gossip("127.0.0.1:8001", forwards_from_b[0].1.clone()).unwrap();
        assert_eq!(forwards_from_c.len(), 0); // Terminated (Node C has no other peers)

        // 4. Double receive loop protection check
        let forwards_b_loop = node_b.receive_gossip("127.0.0.1:8000", proposal).unwrap();
        assert_eq!(forwards_b_loop.len(), 0); // Drop duplicate packet silently
    }
}
