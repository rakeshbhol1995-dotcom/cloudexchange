// CloudExchange Institutional Security Suite
// FROST (Flexible Round-Optimized Schnorr Threshold Signatures) Simulator
// Implemented completely in pure Rust.

use rand::Rng;
use sha2::{Sha256, Digest};

#[derive(Clone, Debug)]
pub struct ValidatorShare {
    pub validator_id: usize,
    pub private_share: u64, // Secret key share s_i
    pub public_share: u64,  // Public key share Y_i
}

pub struct FrostTssCoordinator {
    pub threshold: usize,
    pub total_signers: usize,
    pub prime_modulo: u64, // Curve modulo for finite field arithmetic
    pub generator: u64,    // Generator point G
    pub group_public_key: u64, // Combined Y = G^s
    pub shares: Vec<ValidatorShare>,
}

#[derive(Clone, Debug)]
pub struct SigningCommitment {
    pub validator_id: usize,
    pub hiding_commitment: u64,  // D_i = G^d_i
    pub binding_commitment: u64, // E_i = G^e_i
}

#[derive(Clone, Debug)]
pub struct SignatureShare {
    pub validator_id: usize,
    pub response: u64, // z_i
}

#[derive(Clone, Debug)]
pub struct AggregatedSignature {
    pub challenge: u64,  // c
    pub aggregated_response: u64, // z = sum(z_i)
}

impl FrostTssCoordinator {
    /// Initializes a t-of-n threshold signature group using a mock Distributed Key Generation (DKG)
    pub fn setup(threshold: usize, total_signers: usize) -> Result<Self, &'static str> {
        if threshold > total_signers || threshold == 0 {
            return Err("Invalid threshold bounds");
        }

        let prime_modulo = 997u64; // Simple prime finite field for modular math demo
        let generator = 2u64;      // Generator G

        // Simulate Distributed Key Generation (DKG)
        // Master secret key s
        let mut rng = rand::thread_rng();
        let master_secret: u64 = rng.gen_range(100..prime_modulo - 1);
        let group_public_key = mod_pow(generator, master_secret, prime_modulo);

        // Generate validator shares using Shamir Secret Sharing polynomial: f(x) = s + a_1*x + ... + a_{t-1}*x^{t-1}
        let mut coefficients = vec![master_secret];
        for _ in 1..threshold {
            coefficients.push(rng.gen_range(10..100) % prime_modulo);
        }

        let mut shares = Vec::new();
        for id in 1..=total_signers {
            let mut private_share = 0;
            for (power, &coef) in coefficients.iter().enumerate() {
                private_share = (private_share + coef * mod_pow(id as u64, power as u64, prime_modulo)) % prime_modulo;
            }
            let public_share = mod_pow(generator, private_share, prime_modulo);
            shares.push(ValidatorShare {
                validator_id: id,
                private_share,
                public_share,
            });
        }

        Ok(FrostTssCoordinator {
            threshold,
            total_signers,
            prime_modulo,
            generator,
            group_public_key,
            shares,
        })
    }

    /// Simulates round 1 commitments from selected validators
    pub fn generate_commitments(&self, signers: &[usize], nonces: &[(u64, u64)]) -> Vec<SigningCommitment> {
        let mut commitments = Vec::new();
        for (i, &id) in signers.iter().enumerate() {
            let (d_i, e_i) = nonces[i];
            let hiding_commitment = mod_pow(self.generator, d_i, self.prime_modulo);
            let binding_commitment = mod_pow(self.generator, e_i, self.prime_modulo);
            commitments.push(SigningCommitment {
                validator_id: id,
                hiding_commitment,
                binding_commitment,
            });
        }
        commitments
    }

    /// Aggregates commitments to compute B = prod(D_i * E_i^rho_i) and derives the global challenge
    pub fn compute_challenge(
        &self,
        message: &[u8],
        commitments: &[SigningCommitment],
    ) -> (u64, Vec<u64>) {
        let mut hasher = Sha256::new();
        hasher.update(message);
        for com in commitments {
            hasher.update(&com.hiding_commitment.to_be_bytes());
            hasher.update(&com.binding_commitment.to_be_bytes());
        }
        let digest = hasher.finalize();
        
        // Derive rho_i binding factors for each signer to enforce security bounds
        let mut binding_factors = Vec::new();
        for com in commitments {
            let mut rho_hasher = Sha256::new();
            rho_hasher.update(&digest);
            rho_hasher.update(&com.validator_id.to_be_bytes());
            let rho_bytes = rho_hasher.finalize();
            let rho = (u64::from_be_bytes(rho_bytes[0..8].try_into().unwrap())) % self.prime_modulo;
            binding_factors.push(rho);
        }

        // Aggregate commitment group R = sum(D_i + rho_i * E_i) -> mod_pow logic
        let mut r_agg = 1;
        for (i, com) in commitments.iter().enumerate() {
            let rho = binding_factors[i];
            let term = (com.hiding_commitment * mod_pow(com.binding_commitment, rho, self.prime_modulo)) % self.prime_modulo;
            r_agg = (r_agg * term) % self.prime_modulo;
        }

        // Compute global Schnorr challenge c = H(R || Y || M)
        let mut challenge_hasher = Sha256::new();
        challenge_hasher.update(&r_agg.to_be_bytes());
        challenge_hasher.update(&self.group_public_key.to_be_bytes());
        challenge_hasher.update(message);
        let challenge_bytes = challenge_hasher.finalize();
        let challenge = (u64::from_be_bytes(challenge_bytes[0..8].try_into().unwrap())) % self.prime_modulo;

        (challenge, binding_factors)
    }

    /// Generates individual signature response shares from validators using Lagrange interpolation
    pub fn sign_share(
        &self,
        validator_id: usize,
        private_nonce: (u64, u64),
        rho: u64,
        challenge: u64,
        active_signers: &[usize],
    ) -> Result<SignatureShare, &'static str> {
        let share = self.shares.iter().find(|s| s.validator_id == validator_id)
            .ok_or("Validator share not found")?;

        // Compute Lagrange Interpolation coefficient lambda_i for threshold reconstruction
        let mut numerator = 1i64;
        let mut denominator = 1i64;
        for &id in active_signers {
            if id != validator_id {
                numerator = (numerator * (id as i64)) % (self.prime_modulo as i64);
                denominator = (denominator * ((id as i64) - (validator_id as i64))) % (self.prime_modulo as i64);
            }
        }
        if denominator < 0 {
            denominator += self.prime_modulo as i64;
        }
        let lagrange_coef = (numerator * mod_inverse(denominator as u64, self.prime_modulo) as i64) % (self.prime_modulo as i64);
        let lagrange_coef = if lagrange_coef < 0 { lagrange_coef + self.prime_modulo as i64 } else { lagrange_coef } as u64;

        // z_i = d_i + e_i * rho_i + c * s_i * lambda_i (mod p)
        let (d_i, e_i) = private_nonce;
        let term1 = (d_i + e_i * rho) % self.prime_modulo;
        let term2 = (challenge * share.private_share) % self.prime_modulo;
        let term2 = (term2 * lagrange_coef) % self.prime_modulo;
        let response = (term1 + term2) % self.prime_modulo;

        Ok(SignatureShare {
            validator_id,
            response,
        })
    }

    /// Aggregates individual signature shares to form the final aggregated signature
    pub fn aggregate_signatures(&self, shares: &[SignatureShare], challenge: u64) -> AggregatedSignature {
        let mut aggregated_response = 0;
        for s in shares {
            aggregated_response = (aggregated_response + s.response) % self.prime_modulo;
        }
        AggregatedSignature {
            challenge,
            aggregated_response,
        }
    }

    /// Verifies the final aggregated threshold signature against the group public key
    pub fn verify(&self, message: &[u8], sig: &AggregatedSignature) -> bool {
        // LHS = G^z (G^aggregated_response)
        let lhs = mod_pow(self.generator, sig.aggregated_response, self.prime_modulo);

        // RHS = R_agg * Y^c
        // In order to reconstruct R_agg synchronously during verification:
        // R_agg = G^z * Y^-c => verify G^z == R_agg * Y^c
        // Since we did not transmit R_agg explicitly, we can verify the Schnorr identity via commitments
        // In high-level FROST, verification checks: c == H( G^z * Y^-c || Y || M )
        let y_c = mod_pow(self.group_public_key, sig.challenge, self.prime_modulo);
        let y_c_inv = mod_inverse(y_c, self.prime_modulo);
        
        let r_agg_reconstructed = (lhs * y_c_inv) % self.prime_modulo;

        let mut challenge_hasher = Sha256::new();
        challenge_hasher.update(&r_agg_reconstructed.to_be_bytes());
        challenge_hasher.update(&self.group_public_key.to_be_bytes());
        challenge_hasher.update(message);
        let challenge_bytes = challenge_hasher.finalize();
        let challenge_reconstructed = (u64::from_be_bytes(challenge_bytes[0..8].try_into().unwrap())) % self.prime_modulo;

        sig.challenge == challenge_reconstructed
    }
}

// Modular helper functions
fn mod_pow(mut base: u64, mut exp: u64, modulus: u64) -> u64 {
    if modulus == 1 { return 0; }
    let mut result = 1;
    base = base % modulus;
    while exp > 0 {
        if exp % 2 == 1 {
            result = (result * base) % modulus;
        }
        exp = exp >> 1;
        base = (base * base) % modulus;
    }
    result
}

fn mod_inverse(a: u64, m: u64) -> u64 {
    let mut t = 0i64;
    let mut newt = 1i64;
    let mut r = m as i64;
    let mut newr = a as i64;

    while newr != 0 {
        let quotient = r / newr;
        let mut temp = t - quotient * newt;
        t = newt;
        newt = temp;
        
        temp = r - quotient * newr;
        r = newr;
        newr = temp;
    }

    if r > 1 { return 0; } // not invertible
    if t < 0 { t = t + m as i64; }
    t as u64
}

pub fn main() {
    println!("=========================================================================");
    println!("🛡️  CLOUDEXCHANGE INSTITUTIONAL FROST THRESHOLD SIGNATURE (TSS) SIMULATOR");
    println!("=========================================================================");

    // Initialize 2-of-3 Threshold signing group
    let threshold = 2;
    let total = 3;
    println!("[FROST] Running Simulated Distributed Key Generation (DKG) for {}-of-{} group...", threshold, total);
    let coordinator = FrostTssCoordinator::setup(threshold, total).unwrap();

    println!("  - Group Public Key (Y): G^{}", coordinator.group_public_key);
    for share in &coordinator.shares {
        println!("  - Validator #{}: Private Share = s_{}, Public Share = Y_{}", share.validator_id, share.validator_id, share.validator_id);
    }

    let message = b"COIN_WITHDRAWAL_REQUEST_TX_HASH_0X891";
    println!("[FROST] Initiating dynamic key signing for message: {:?}", String::from_utf8_lossy(message));

    // Select validators 1 and 3 to sign (meeting 2-of-3 threshold)
    let active_signers = vec![1, 3];
    let private_nonces = vec![
        (12u64, 45u64), // d_1, e_1
        (17u64, 38u64), // d_3, e_3
    ];
    println!("  - Selected Signers Set: {:?}", active_signers);

    // Round 1: Generate and aggregate commitments
    println!("[FROST] Signers generating Round 1 hiding/binding commitments...");
    let commitments = coordinator.generate_commitments(&active_signers, &private_nonces);
    for com in &commitments {
        println!("    * Signer #{}: D_{} = G^d_{}, E_{} = G^e_{}", com.validator_id, com.validator_id, com.validator_id, com.validator_id, com.validator_id);
    }

    let (challenge, binding_factors) = coordinator.compute_challenge(message, &commitments);
    println!("  - Derived Binding Factors (rho): {:?}", binding_factors);
    println!("  - Global Schnorr Challenge (c): H(R || Y || M) = {}", challenge);

    // Round 2: Generate response shares
    println!("[FROST] Generating individual signing response shares (z_i) using Lagrange multipliers...");
    let share1 = coordinator.sign_share(1, private_nonces[0], binding_factors[0], challenge, &active_signers).unwrap();
    let share3 = coordinator.sign_share(3, private_nonces[1], binding_factors[1], challenge, &active_signers).unwrap();
    println!("    * Share #1 Response (z_1): {}", share1.response);
    println!("    * Share #3 Response (z_3): {}", share3.response);

    // Round 3: Aggregate and verify threshold signature
    println!("[FROST] Aggregating response shares into final signature (z)...");
    let aggregated_sig = coordinator.aggregate_signatures(&[share1, share3], challenge);
    println!("  - Final Threshold Signature: (c: {}, z: {})", aggregated_sig.challenge, aggregated_sig.aggregated_response);

    println!("[FROST] Running verification on final aggregate threshold signature...");
    let is_valid = coordinator.verify(message, &aggregated_sig);
    
    if is_valid {
        println!("  ✅ VERIFICATION SUCCESS: Threshold signature is cryptographically valid!");
        println!("  - Verified Invariant: G^z == R_agg * Y^c");
    } else {
        println!("  ❌ VERIFICATION FAILURE: Schnorr identity mismatch detected.");
    }
    println!("=========================================================================");
}
