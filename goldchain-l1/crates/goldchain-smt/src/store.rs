use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use borsh::{BorshSerialize, BorshDeserialize};

#[derive(Clone, Debug, Serialize, Deserialize, BorshSerialize, BorshDeserialize, PartialEq, Eq)]
pub enum Node {
    Leaf {
        key: [u8; 32],
        value_hash: [u8; 32],
    },
    Branch {
        left: [u8; 32],
        right: [u8; 32],
    },
}

pub trait NodeStore {
    fn get(&self, hash: &[u8; 32]) -> Option<Node>;
    fn put(&mut self, hash: [u8; 32], node: Node);
}

#[derive(Default, Clone)]
pub struct MemoryNodeStore {
    nodes: HashMap<[u8; 32], Node>,
}

impl MemoryNodeStore {
    pub fn new() -> Self {
        MemoryNodeStore {
            nodes: HashMap::new(),
        }
    }
}

impl NodeStore for MemoryNodeStore {
    fn get(&self, hash: &[u8; 32]) -> Option<Node> {
        self.nodes.get(hash).cloned()
    }

    fn put(&mut self, hash: [u8; 32], node: Node) {
        self.nodes.insert(hash, node);
    }
}
