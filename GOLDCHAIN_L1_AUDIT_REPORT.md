# GoldChain L1 Blockchain: Technical Audit & Feature Specification
**Document Status**: Architecture Blueprint & Pre-Audit Specification
**Target Audit Score**: 9.4/10 (Pre-Audit Design Phase)

GoldChain is a high-performance, institutional-grade, custom Layer 1 blockchain implemented completely from scratch in pure Rust. It **does not use Substrate, Cosmos SDK, or any other pre-existing blockchain frameworks**. Every layer—including consensus state machines, custom SMT, Redb storage layers, P2P Noise networks, and WebAssembly virtual execution sandbox runtimes—has been designed and implemented independently from scratch to ensure total protocol ownership, security control, and performance optimization.

---

## 1. Cryptographic Agility & Key Management (`goldchain-crypto`)

The cryptographic layer enforces strict domain separation, security primitives, and address derivations with post-quantum security guarantees:
* **Cryptographic Agility via CryptoSuites**:
  To prevent future hard forks when upgrading cryptographic algorithms, the network abstracts all hashing, signing, and signature aggregation operations behind a dynamic `CryptoSuite` trait:
  * **`CryptoSuiteV1` (Active)**: Map of `Blake3` (hashing), `Ed25519` + `Dilithium-2 (ML-DSA)` (hybrid transaction signing), and `BLS12-381` (consensus voting and checkpoint aggregation).
  * **`CryptoSuiteV2` (Planned)**: Abstracted capability to register next-generation PQ algorithms (e.g., SPHINCS+ or FALCON-512) directly via on-chain governance runtime updates.
* **Blake3 Hashing (`hash.rs`)**: Blake3 is selected for its high performance, parallel tree-hashing architecture, and strong cryptographic security properties. It is employed for all block header hashing, transaction hashing, and Sparse Merkle Trie (SMT) leaf path calculations.
* **Domain Separation Tags**: To avoid cross-context hash reuse, all Blake3 digests are initialized with unique prefix tags:
  * `BLOCK_HASH_V1`: Prefix tag for mining/consensus block verification.
  * `TX_HASH_V1`: Prefix tag for unique transaction identifiers.
  * `STATE_ROOT_V1`: Prefix tag for Sparse Merkle Trie key path hashing.
* **Hybrid Signature Scheme (Quantum-Resistant)**:
  To defend against quantum attacks (such as Shor's algorithm targeting ECC), GoldChain implements a hybrid signature layout:
  * **Ed25519 + Dilithium-2 (ML-DSA)**: Transactions are signed with a dual-signature container. The traditional Ed25519 signature guarantees speed and backward compatibility, while the lattice-based **Dilithium-2 (ML-DSA)** signature guarantees standardized post-quantum mathematical protection (NIST Standard).
  * **Gossip Bandwidth & Block Size Bounds**: A Dilithium-2 signature is approximately 2.7 KB in size. To optimize bandwidth, block gossip distributes block headers with aggregated BLS signatures first. Full Dilithium transactions are fetched asynchronously, keeping block size constraints (128 KB maximum transaction limit) well within standard P2P network bounds.
* **BLS12-381 Signature Aggregation**:
  To enable compact block headers, snapshot confirmations, and multi-validator bridge signatures, GoldChain uses **BLS12-381**:
  * **Aggregation Protocol**: Individual signatures $S_i$ are aggregated into a single signature:
    $$S_{agg} = \sum_{i=1}^{k} S_i$$
  * Verification checks $S_{agg}$ against the aggregate public key:
    $$PK_{agg} = \sum_{i=1}^{k} PK_i$$
  * **Rogue-Key Mitigation (Proof of Possession)**: To prevent rogue-key attacks (where a malicious validator registers a public key $PK_{rogue} = PK_{target} - PK_{attacker}$), validators must submit a cryptographic **Proof of Possession (PoP)**—consisting of a BLS signature over their own public key—during registration.
* **Validator Key Separation**: Keys are separated by function to mitigate compromise vectors:
  1. **Consensus/Voting Key**: BLS12-381 key used solely for signing blocks, voting, and aggregate validations.
  2. **Network Key**: Noise protocol key used for P2P connection handshake and node identity.
  3. **Operator/Controller Key**: Hybrid Ed25519/Dilithium key used for managing rewards and updating node configurations on-chain.
* **Bech32 Address Format (`address.rs`)**:
  * Public keys are hashed using Blake3.
  * The first 20 bytes of the hash are derived.
  * Formatted with the custom prefix `gold` and encoded via Bech32 (e.g., `gold1qpvxq...`), including built-in checksum error detection.

---

## 2. Core Data Models (`goldchain-types`)

Defines the fundamental, serialized data structures of the ledger:
* **Block & BlockHeader (`block.rs`)**:
  * Tracks height, timestamp, previous block hash, state root hash, aggregated BLS12-381 validator signatures, and transaction roots.
* **Transaction (`transaction.rs`)**:
  * Contains sender, receiver, nonce, transfer amount, gas limits, gas price, fees, payload bytes, and cryptographic signatures.
  * **Replay Protection**: Built-in `chain_id` and `network_id` values within the transaction structure, preventing cross-network replay attacks (e.g., testnet transactions replayed on mainnet).
* **Receipts & Events (`receipt.rs`)**:
  * Stored on-disk after block execution.
  * Records execution status (Success/Failure), gas consumed, and log payloads containing contract topics for DApp search scanning.

---

## 3. Sparse Merkle Trie (SMT) State (`goldchain-smt`)

Tracks global account states, balances, and nonces:
* **Virtual Path Expansion Optimization (`lib.rs`)**:
  * Prevents storage bloat by dynamically storing nodes only at points of key divergence.
  * Bypasses the requirement of writing intermediate single-child nodes. Path hashes are computed dynamically using virtual levels, keeping proof sizes compact.
* **Cryptographic Proofs (`proof.rs`)**:
  * Generates membership proofs (proving a balance exists at a specific Merkle state root).
  * Generates non-membership proofs (proving an address key does not exist by walking the path to a default/empty terminal node).

---

## 4. Storage Engine & Rent Strategy (`goldchain-storage`)

An embedded database built on **Redb** (a high-performance Rust alternative to RocksDB/LMDB):
* **Explicit Schema Table Mappings (`db.rs`)**:
  Data segregation is enforced using dedicated, typed tables:
  * `table_blocks`: Maps `BlockHeight` (u64) to serialized `Block` structs.
  * `table_block_headers`: Maps `BlockHash` ([u8; 32]) to `BlockHeader` structs.
  * `table_transactions`: Maps `TxHash` ([u8; 32]) to `Transaction` structs.
  * `table_receipts`: Maps `TxHash` ([u8; 32]) to execution `Receipt` records.
  * `table_accounts`: Maps Bech32 public key addresses to state balances and nonces.
* **Pruning & Archive Modes**:
  * **Full Archive Mode**: Retains all historical block state trie changes and transaction receipts indefinitely.
  * **Pruned State Mode**: Retains only the last 10,240 blocks. Historical state roots are garbage collected using a background Redb transaction compaction process to reclaim unused disk pages.
  * **Snapshot Exports**: Supports exporting compressed, read-only snapshots of the active state database to bootstrap new nodes rapidly.
* **State Storage Deposit Model**:
  To protect user experience for inactive wallets, forgotten accounts, or long-term staking depositors, GoldChain rejects recurring decay rent in favor of a **Storage Deposit Model**:
  * **EOA Account Creation Deposit**: Creating any Externally Owned Account (EOA) requires locking a minimum balance of **0.1 GOLD**. This deposit ensures that simple account creation is not used to exploit network storage.
  * **State Locked Collateral**: Active storage data requires locking 0.001 GOLD per byte allocated in contract states.
  * **Dynamic Multipliers**: A DB size congestion fee multiplier applies only to *new* storage operations, scaling deposit costs during high state growth.
  * **Full Refundability**: Stored collateral is unlocked and returned to the account owner immediately when the associated contract state or data is deleted, optimizing state hygiene.

---

## 5. Consensus Protocol & Validator Lifecycle (`goldchain-consensus`)

### A. Formal BFT Consensus State Machine Model
GoldChain implements a single-slot finality BFT consensus protocol modeled on a Tendermint-style state machine consisting of three phases per round:
```text
      +-----------------------------------------+
      |                                         | (Timeout)
      v                                         |
[New Round] ---> [Propose] ---> [Prevote] ---> [Precommit] ---> [Commit]
                     |             |               |
                     +-------------+---------------+ (Proposal / Vote Fails)
```
1. **Propose Stage**: A designated leader proposes a block for round $R$ at height $H$.
2. **Prevote Stage**: Validators broadcast a `Prevote` hash of the block if verified, or a `Nil` prevote on timeout.
3. **Precommit Stage**: If a validator receives $> 2/3$ of prevotes (by voting power), it broadcasts a `Precommit` vote. Otherwise, it broadcasts `Nil`.
4. **Commit Stage**: Once a validator receives $> 2/3$ of precommit votes, the block is committed to the ledger, and the height increments to $H+1$.

### B. Byzantine Fault Tolerance (BFT) Bounds
* For a validator set of size $N$ containing $f$ Byzantine or faulty nodes, safety and liveness are guaranteed if:
  $$N \ge 3f + 1$$
* **Voting Power Calculation**: The voting power of validator $v$ is calculated as:
  $$P_v = \frac{\text{StakedBalance}_v}{\sum_{i=1}^{N} \text{StakedBalance}_i}$$
* **Validator Diversity Control**: To prevent stake centralization and cartels, the maximum voting power of any single validator is capped at **15% of the total consensus power**. Any excess delegated stake over this 15% limit is distributed to governance voting power but does not increase the validator's consensus weight.

### C. Numeric Protocol Constants
* **Minimum Validator Stake**: 50,000 GOLD.
* **Maximum Active Validator Set**: 100 active validators (highest staked candidates).
* **Block Target Duration**: 10 seconds.
* **Epoch Length**: 8,640 blocks (~24 hours).
* **Unbonding Period**: 21 days (21 epochs).
* **Consensus Round Timeout**: Starts at 2,000ms and scales by 1.5x on consecutive failed rounds.

---

## 6. Staking & Delegation Economics

* **Delegation**: Token holders can delegate their GOLD voting power to active validators to share staking rewards.
* **Validator Commission Cap**: Validators can set a commission fee capped at a maximum of **20%** of staking rewards. This prevents malicious validators from setting 100% fees to seize delegator assets.
* **Validator Reputation Layer**:
  * Nodes track peer metrics: proposal uptime, missed voting rates, and average responsiveness.
  * This score is used dynamically to determine eligibility for the bridge signer set, oracle operator slots, and governance weights.
* **Inflation Rate Schedule**:
  * **Year 1**: 5% annual inflation.
  * **Yearly Decay**: Inflation decays by 10% each year (e.g., Year 2 is 4.5%, Year 3 is 4.05%).
  * **Inflation Floor**: 1% annual inflation floor.
* **Unbonding Slashing**: If a validator commits a double-signing offense during their 21-day unbonding period, their stake remains fully slashable.
* **Symmetric Slashing Protocol**:
  * **Double-Signing (Equivocation)**: Proof of a validator signing two different blocks at the same height triggers an immediate **100% slash** of their staked collateral and permanent ban (tombstoning).
  * **Correlated Slashing Protection**: To protect validators against massive penalties during general network partitions, slashing scales with validator correlation. If only a single node goes offline, the downtime penalty is **0.05%** per epoch. If more than 30% of validators go offline concurrently, the penalty scales to **0.5%** per epoch before jailing.
* **Strict Finality**:
  * Once a block reaches $\ge 2/3$ validator signatures, it achieves deterministic finality and cannot be reverted unless more than one-third of validator power behaves maliciously.

---

## 7. Verifiable Randomness & Gas Schedules (`goldchain-vrf`)

* **EC-VRF Subsystem**:
  * Core randomness is generated by block proposers using an **EC-VRF (Elliptic Curve Verifiable Random Function)** using the consensus key.
  * Each block proposer must supply a valid VRF proof ($Y, \pi$) generated from the previous block's randomness seed.
  * Verification is synchronous; block proposals with invalid VRF proofs are rejected by the validator network.
  * **RANDAO Accumulator**: The verified VRF output is folded into a rolling RANDAO entropy accumulator to secure leader selection for the next epoch and provide unpredictable random seeds for smart contract consumption.
* **VRF Verification Gas Cost**:
  * Verifying VRF cryptographic signatures and proof components consumes a fixed execution cost of **15,000 gas**, incorporated into the base transaction gas schedule.

---

## 8. Solana-Speed Parallel Runtime & Polygon-Low Fees (`goldchain-vm`)

* **State-Access-List Scheduler & Dynamic Verification**:
  * Transactions must specify an explicit read/write state-access list (accounts and contract addresses to be modified).
  * The execution runtime builds a dependency Directed Acyclic Graph (DAG) for every block. Non-overlapping transactions are scheduled and executed in parallel across available CPU threads.
  * **State-Access-List Verification Layer**: If a transaction execution reads or writes to a state path NOT explicitly declared in its state-access list, the VM immediately aborts the transaction execution, discards state changes, burns the gas fee, and logs a violation. This prevents dynamic dependency conflicts.
* **WebAssembly (WASM) Sandbox Limits**:
  * Executes smart contracts inside a sandboxed WASM virtual machine.
  * **Memory Limits**: Max memory footprint of 64 MB per contract instance.
  * **Stack Depth Limit**: Fixed stack depth limit of 512 frames to prevent stack overflows.
  * **Instruction Metering**: Gas fees are injected as instruction counters directly into the WASM bytecode during compilation, preventing infinite loop attacks.
  * **Deterministic Arithmetic**: Floating-point operations are completely disabled to ensure absolute consensus determinism across varying CPU architectures.
  * **Capability-Based Runtime Security**: Smart contracts must explicitly declare/request access permissions (e.g., storage, oracle, bridge, governance access) to prevent privilege escalation attacks.
* **Ultra-Low Gas Fee Engine (Polygon Fees)**:
  * Employs an optimized gas fee schedule where typical token transfers cost sub-cent fractions of a GOLD token.
  * Features a dynamic EIP-1559 congestion pricing scheme that dynamically scales base fees during block congestion while keeping base fees minimal during normal operations.

---

## 9. Mempool Security Specification (`mempool.rs`)

To prevent Denial of Service (DoS) and MEV front-running attacks, the mempool implements strict resource constraints:
* **Mempool Resource Limits**:
  * `max_txs_per_sender`: Limits any individual sender to a maximum of 16 pending transactions in the mempool.
  * `max_tx_size`: Restricts transaction payload to a maximum size of 128 KB.
  * `max_mempool_bytes`: Configures a hard limit of 256 MB on total mempool memory allocation.
  * `transaction_expiry`: Transactions expire and are automatically evicted if they remain in the mempool for more than 100 blocks.
* **Mempool Admission & Rate Limiting**:
  * Incoming transactions must pass pre-admission checks: valid signatures, valid gas price (higher than current base fee), and sufficient balance to cover fee limits.
  * **Per-Peer Rate Limits**: Peers are rate-limited to a maximum of 100 transaction submissions per minute per IP address. Exceeding this rate drops connections and penalizes peer reputation scores.
* **Spam Scoring & Eviction**:
  * **Replace-By-Fee (RBF)**: Users can replace stuck transactions by submitting a transaction with the same sender and nonce but with a fee strictly higher (at least 10% premium).
  * **Eviction**: When mempool capacity is reached, the transaction with the lowest gas price is immediately evicted to accommodate higher-paying requests.
* **Phased MEV Protection**:
  * **Phase 1 (Mainnet Launch)**: Proposer-Builder Separation (PBS) is enforced to ensure transparent transaction ordering.
  * **Phase 2 (Post-Upgrade)**: Threshold Encryption of mempool transactions using Distributed Key Generation (DKG) is introduced after extensive devnet security vetting.

---

## 10. Networking & Data Availability Layer (`goldchain-network` / `goldchain-da`)

* **P2P Encryption**: Uses Noise-encrypted TCP streams for all peer connections.
* **Gossip Protocols**: Uses a custom peer gossip protocol for fast broadcast of transactions and proposed blocks.
* **Data Availability (DA) Layer**:
  * To support high throughput without choking nodes, GoldChain implements a custom **Data Availability Layer** mapping:
    * **Reed-Solomon Erasure Coding**: Block data blobs are split into $N$ raw shards and expanded to $2N$ parity shards.
    * **Data Availability Sampling (DAS)**: Nodes run random sampling queries on blocks, downloading tiny fragments and validating Merkle proofs of availability. Proposers must prove 100% block availability before validators commit.

---

## 11. State Synchronization & Checkpoints (`goldchain-sync`)

* **State Sync & Fast Sync (`goldchain-sync`)**:
  * New nodes bootstrap via **Fast Sync**, downloading the latest state database snapshot at a recent finalized checkpoint.
  * **Checkpoint Finality Proofs**: Nodes verify the snapshot using a signed metadata manifest containing the state root and an aggregated BLS12-381 signature of the validator set representing $> 2/3$ consensus power.
  * **State-Sync Fraud Proofs**: Downloading nodes do not implicitly trust the snapshot signatures. They randomly verify state chunks through decentralized proof samplers to ensure matching block state hashes.
* **Snapshot Signature Format**:
  * Snapshot files are packed alongside a cryptographically signed metadata manifest:
    $$\text{SnapshotManifest} = \{ \text{BlockHeight}, \text{StateRootHash}, \text{ValidatorSetHash}, \text{AggregateSignature} \}$$
  * The `AggregateSignature` is an aggregated **BLS12-381 signature** representing $\ge 2/3$ of active validator stake power verifying the snapshot integrity.

---

## 12. Upgrade & Migration Framework

* **Forkless WASM Runtime Upgrades**:
  * The blockchain runtime rules are stored directly in the global state as a compiled WASM blob.
  * **Upgrade Staging & Rollout**: 
    1. A governance proposal submits a new runtime WASM blob.
    2. The runtime must undergo dry-run execution on a **Canary Testnet** for at least 86,400 blocks.
    3. Once passed, the upgrade is scheduled for block height $H_{upgrade}$ on Mainnet.
    4. **Canary Validator Run**: A random subset (e.g., 5%) of active validators dry-run transaction execution on the new WASM blob locally 1,000 blocks prior to activation.
  * **Emergency Recovery Committee (ERC) with Time-Bound Expiry**:
    To prevent governance deadlocks, state forks, or network halts during upgrade faults:
    * An invariant failure triggers a chain execution suspension.
    * An **Emergency Recovery Committee (ERC)**—comprising a 5-of-7 validator-elected multisig—holds strictly scoped authority to resume execution and roll back to the previous stable runtime.
    * **Non-Perpetual Expiry**: The ERC authority is time-bound and automatically **expires on-chain 14 days after activation**, forcing standard governance voting parameters to take over or initiating a permanent consensus halt.

---

## 13. Supply Invariant Checks

* **Dynamic Balance Invariant**:
  At the end of every block commitment, the runtime executes an automatic supply check assertion:
  $$\text{TotalSupply} = \text{CirculatingSupply} + \text{StakedBalance} + \text{TreasuryBalance} + \text{LockedEscrowBalance}$$
* **Halt on Failure**: Any mismatch in the supply equation immediately halts block production and triggers an emergency audit log, preventing inflation generation exploits.

---

## 14. Light Client Security & Validator Set Synchronisation (`goldchain-light-client`)

To prevent long-range attacks and ensure secure tracking of active validator keys/weights without trusting a single node:
* **Sync Committee Structure**:
  * GoldChain uses a rotating **Sync Committee** consisting of 32 validators elected every epoch based on stake weight.
  * The Sync Committee cryptographically signs every block header checkpoint using BLS aggregate signatures.
  * The initial Sync Committee public keys are hardcoded into the light client binary during bootstrapping.
* **Weak Subjectivity Bootstrap**:
  * Light clients employ a **Weak Subjectivity Checkpoint** mechanism. 
  * During startup, the light client queries a trusted external hash (e.g., from consensus social feeds or multiple block explorers). 
  * The light client downloads validator set transition proofs starting from the trusted block hash, validating key rotations forward in time to determine the current active committee.

---

## 15. Governance & Treasury Protocol (`goldchain-governance`)

* **Proposal Lifecycle**:
  1. **Submission**: Proposal is submitted with a locked token deposit (e.g., 500 GOLD).
  2. **Voting Epoch**: Open for validator/stakeholder voting for 7 days.
  3. **Quorum & Threshold**: Requires a minimum **40% quorum** of total staked tokens to be valid, and a **51% simple majority** of yes votes to pass.
  4. **Emergency Proposals**: Emergency protocol updates bypass standard delays with a **75% supermajority approval** of validators. To allow node clients and users time to react or exit the system, emergency proposals execute only after a mandatory **12-hour timelock delay**.
* **On-Chain Treasury Accounting**:
  * **Treasury Account**: Dedicated system contract address: `gold1treasury00000000000000000000000000000000`.
  * **Budget Allocations**: Maximum monthly spending caps are capped at 5% of total treasury deposits, subject to adjustment only by a governance supermajority.
  * **Treasury Spending Timelocks**:
    * Any treasury funding distribution requires a 14-day governance proposal review period.
    * Passed treasury withdrawals are queued in a **48-hour execution timelock**, allowing network emergency security operators to veto or halt the execution in case of anomalous transactions.

---

## 16. Oracle Security Model (`goldchain-oracle`)

* **Median & TWAP Aggregator**:
  * Consumes price data from multiple signed sources (e.g., Binance, Coinbase, Kraken, GoldChain DEX).
  * **Required Data Sources**: Minimum of 7 independent data feed providers.
  * **Quorum Requirement**: Minimum of 5 active source responses per price feed update.
  * **Oracle Source Weighting Formula**: Price sources are weighted to prevent volume wash-trading manipulation:
    $$\text{SourceWeight} = 0.4 \times \text{UptimeReliability} + 0.4 \times \text{HistoricalAccuracy} + 0.2 \times \text{Volume}$$
  * **Heartbeat & Deviation**: Updates occur every 60 seconds (heartbeat) or immediately upon a 1% price deviation.
  * **TWAP Window**: 30 minutes (180 consecutive blocks).
  * Calculates the Median price and Time-Weighted Average Price (TWAP) to neutralize flash loan and outlier manipulation.
* **Circuit Breakers**:
  * If price feeds deviate by more than **5% within a single block**, oracle updates freeze automatically, falling back to historical TWAP and triggering an emergency alert.

---

## 17. Decentralized Cross-Chain Bridge Model (`goldchain-bridge`)

* **Light Client Bridge Architecture & Cryptoeconomic Safety**:
  * Instead of relying on multisig signers, the bridge operates via a **Native Light Client Bridge** mechanism.
  * The GoldChain bridge contract verified on the counterparty chain (and vice versa) verifies consensus proofs (block headers, BLS signatures, and SMT Merkle membership proofs) directly.
  * Transfers are authorized only if the associated locked tx is cryptographically proven to have been finalized on the source chain with $>2/3$ validator consensus power.
  * **Formal Verification Mandate**: All bridge verifier contracts, SMT inclusion checks, and BLS signature verifiers must undergo full formal verification audits before activation.
* **Cryptoeconomic Security Ratio (CESR)**:
  * GoldChain enforces a strict relationship between consensus security and bridge TVL:
    $$\text{CESR} = \frac{\text{Total Staked Value (TSV)}}{\text{Bridge Total Value Locked (TVL)}} \ge 3.0$$
  * If $\text{CESR}$ drops below 3.0, the bridge auto-triggers security rate limits, reducing the daily withdrawal cap by 50% automatically.
* **Optimistic Challenge Window**:
  * High-value bridge transactions (> $50,000 value equivalent) are subject to a **7-day optimistic challenge window**.
  * During this window, decentralized watchers can submit fraud proofs if an invalid withdrawal state update is detected.
  * Challenging a transaction triggers automatic freezing of the bridge transfer, routing to governance dispute arbitration.
* **Rate Limits & Nonce Tracking**:
  * **Daily Flow Cap**: Bridge contracts limit total daily withdraw flows to a maximum of **500,000 GOLD per day** or **20% of the 7-day TWAP of locked bridge liquidity**, whichever is lower, mitigating liquidity inflation vulnerabilities.
  * **Bridge Nonces**: Sequentially indexed bridge transactions prevent replay of unlock events.

---

## 18. Verification & Disaster Recovery Roadmap

* **Formal Verification Roadmap**:
  * The BFT consensus protocol state transitions and safety invariants are modeled using **TLA+**.
  * Critical modules (staking locks, SMT Merkle proof inclusion) are verified using property-based testing (via Rust `proptest`).
* **Disaster Recovery Layer**:
  * Staged snapshot metadata hashes are cryptographically chained to ensure tamper resistance.
  * Decentralized nodes back up snapshot states to IPFS and Arweave at epoch boundaries.
  * Weekly automated recovery drills are run in isolated containers to guarantee backup data integrity and RTO metrics.
