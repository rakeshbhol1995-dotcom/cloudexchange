------------------ MODULE tla_consensus_spec ------------------
EXTENDS Naturals, FiniteSets

CONSTANTS Validators, MaxFaulty

VARIABLES 
  validator_state,     \* Maps validator -> [step, round, locked_block, locked_round]
  broadcast_msg,       \* Set of all messages currently broadcast in the network
  committed_block      \* Set of blocks successfully committed to the ledger

(* Step Types *)
STEPS == {"PROPOSE", "PREVOTE", "PRECOMMIT", "COMMIT"}

(* Invariant: BFT bounds N >= 3f + 1 *)
ASSUME CardValidators == Cardinality(Validators) >= 3 * MaxFaulty + 1

(* Initial State Configuration *)
Init == 
  /\ validator_state = [v in Validators |-> [step |-> "PROPOSE", round |-> 0, locked_block |-> "NONE", locked_round |-> -1]]
  /\ broadcast_msg = {}
  /\ committed_block = {}

(* Propose Phase Actions *)
ProposeBlock(v, r, b) == 
  /\ validator_state[v].round = r
  /\ validator_state[v].step = "PROPOSE"
  /\ broadcast_msg' = broadcast_msg \cup {[type |-> "PROPOSAL", round |-> r, block |-> b, sender |-> v]}
  /\ validator_state' = [validator_state EXCEPT ![v].step = "PREVOTE"]
  /\ UNCHANGED <<committed_block>>

(* Prevote Phase Actions *)
Prevote(v, r, b) == 
  /\ validator_state[v].round = r
  /\ validator_state[v].step = "PREVOTE"
  /\ \exists msg \in broadcast_msg : msg.type = "PROPOSAL" /\ msg.round = r /\ msg.block = b
  /\ broadcast_msg' = broadcast_msg \cup {[type |-> "PREVOTE", round |-> r, block |-> b, sender |-> v]}
  /\ validator_state' = [validator_state EXCEPT ![v].step = "PRECOMMIT"]
  /\ UNCHANGED <<committed_block>>

(* Precommit Phase Actions *)
Precommit(v, r, b) == 
  /\ validator_state[v].round = r
  /\ validator_state[v].step = "PRECOMMIT"
  \* Count prevotes matching > 2/3 total consensus power
  /\ Cardinality({msg \in broadcast_msg : msg.type = "PREVOTE" /\ msg.round = r /\ msg.block = b}) >= (2 * Cardinality(Validators) \div 3) + 1
  /\ broadcast_msg' = broadcast_msg \cup {[type |-> "PRECOMMIT", round |-> r, block |-> b, sender |-> v]}
  /\ validator_state' = [validator_state EXCEPT ![v].step = "COMMIT", ![v].locked_block = b, ![v].locked_round = r]
  /\ UNCHANGED <<committed_block>>

(* Commit Phase Actions *)
Commit(v, r, b) == 
  /\ validator_state[v].round = r
  /\ validator_state[v].step = "COMMIT"
  \* Count precommits matching > 2/3 total consensus power
  /\ Cardinality({msg \in broadcast_msg : msg.type = "PRECOMMIT" /\ msg.round = r /\ msg.block = b}) >= (2 * Cardinality(Validators) \div 3) + 1
  /\ committed_block' = committed_block \cup {b}
  /\ validator_state' = [validator_state EXCEPT ![v].step = "PROPOSE", ![v].round = r + 1]
  /\ UNCHANGED <<broadcast_msg>>

(* Safety Invariant: Absolute Consensus Single-Slot Finality *)
ConsensusSafety == 
  \forall b1, b2 \in committed_block : b1 = b2

================================================================
