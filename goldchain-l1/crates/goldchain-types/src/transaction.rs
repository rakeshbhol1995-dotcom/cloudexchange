use serde::{Serialize, Deserialize};
use borsh::{BorshSerialize, BorshDeserialize};
use goldchain_crypto::address::Address;
use goldchain_crypto::signature::{Signature, CryptoSuiteId};
use goldchain_crypto::keys::PrivateKey;
use goldchain_crypto::hash::Hash;

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum TxType {
    Transfer,
    Stake,
    Unstake,
    ContractDeploy,
    ContractCall,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct Transaction {
    pub from: Address,
    pub to: Address,
    pub amount: u64,
    pub nonce: u64,
    pub fee: u64,
    pub tx_type: TxType,
    pub data: Vec<u8>,
    pub signature: Option<Signature>,
    pub crypto_suite: CryptoSuiteId,
}

impl Transaction {
    /// Creates a new unsigned transaction
    pub fn new(
        from: Address,
        to: Address,
        amount: u64,
        nonce: u64,
        fee: u64,
        tx_type: TxType,
        data: Vec<u8>,
    ) -> Self {
        Transaction {
            from,
            to,
            amount,
            nonce,
            fee,
            tx_type,
            data,
            signature: None,
            crypto_suite: CryptoSuiteId::V1,
        }
    }

    /// Computes the transaction hash (excluding signature) using BLAKE3
    pub fn hash(&self) -> Hash {
        let unsigned = Transaction {
            from: self.from.clone(),
            to: self.to.clone(),
            amount: self.amount,
            nonce: self.nonce,
            fee: self.fee,
            tx_type: self.tx_type.clone(),
            data: self.data.clone(),
            signature: None,
            crypto_suite: self.crypto_suite,
        };

        let bytes = borsh::to_vec(&unsigned).expect("Borsh serialization of transaction should succeed");
        Hash::digest(&bytes)
    }

    /// Signs the transaction using a private key and sets its signature field
    pub fn sign(&mut self, private_key: &PrivateKey) {
        let tx_hash = self.hash();
        let signature = Signature::sign(private_key, tx_hash.as_ref());
        self.signature = Some(signature);
    }

    /// Verifies the signature of the transaction
    pub fn verify_signature(&self) -> Result<(), String> {
        let signature = self.signature.as_ref().ok_or_else(|| "Missing signature".to_string())?;
        let pub_key = self.from.to_public_key().map_err(|e| e.to_string())?;
        let tx_hash = self.hash();
        signature.verify(&pub_key, tx_hash.as_ref())
            .map_err(|e| e.to_string())
    }
}
