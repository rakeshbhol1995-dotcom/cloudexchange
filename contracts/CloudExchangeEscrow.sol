// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title CloudExchangeEscrow
 * @dev Secure P2P Escrow contract with built-in multi-token support, time-locks, and admin arbitration.
 */
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;
    constructor() { _status = _NOT_ENTERED; }
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

abstract contract Pausable {
    event Paused(address account);
    event Unpaused(address account);
    bool private _paused;
    constructor() { _paused = false; }
    modifier whenNotPaused() {
        require(!paused(), "Pausable: paused");
        _;
    }
    modifier whenPaused() {
        require(paused(), "Pausable: not paused");
        _;
    }
    function paused() public view virtual returns (bool) { return _paused; }
    function _pause() internal virtual whenNotPaused { _paused = true; emit Paused(msg.sender); }
    function _unpause() internal virtual whenPaused { _paused = false; emit Unpaused(msg.sender); }
}

abstract contract AccessControl {
    mapping(bytes32 => mapping(address => bool)) private _roles;
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "AccessControl: account is missing role");
        _;
    }
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account];
    }
    function _grantRole(bytes32 role, address account) internal {
        if (!_roles[role][account]) {
            _roles[role][account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }
    function _revokeRole(bytes32 role, address account) internal {
        if (_roles[role][account]) {
            _roles[role][account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }
}

/**
 * @title CloudExchangeEscrow
 * @dev Secure P2P Escrow contract with built-in multi-token support, time-locks, and admin arbitration.
 */
contract CloudExchangeEscrow is ReentrancyGuard, Pausable, AccessControl {
    uint256 public feePercentage; // Base 10000 (e.g. 10 = 0.1%)
    address public feeRecipient;

    enum EscrowStatus { CREATED, PAID, RELEASED, REFUNDED, DISPUTED }

    struct Escrow {
        address seller;
        address buyer;
        address token;
        uint256 amount;
        uint256 fiatAmount;
        uint256 createdAt;
        uint256 paymentWindow;
        uint256 disputeTime;
        EscrowStatus status;
    }

    struct EmergencyWithdrawProposal {
        address token;
        uint256 amount;
        uint256 proposedAt;
        uint256 approvalCount;
        bool executed;
    }

    mapping(uint256 => Escrow) public escrows;
    uint256 public escrowCounter;

    mapping(uint256 => EmergencyWithdrawProposal) public emergencyProposals;
    mapping(uint256 => mapping(address => bool)) public emergencyApprovals;
    uint256 public emergencyProposalCounter;

    uint256 public constant TIMELOCK_DELAY = 48 hours;
    uint256 public constant REQUIRED_ADMIN_APPROVALS = 2;

    // Events
    event EscrowCreated(uint256 indexed escrowId, address indexed seller, address indexed buyer, address token, uint256 amount);
    event EscrowPaid(uint256 indexed escrowId);
    event EscrowReleased(uint256 indexed escrowId, address indexed buyer);
    event EscrowRefunded(uint256 indexed escrowId, address indexed seller);
    event EscrowDisputed(uint256 indexed escrowId, address indexed initiatedBy);
    event EscrowDisputedResolved(uint256 indexed escrowId, address indexed winner, address resolvedBy);
    event EmergencyWithdrawProposed(uint256 indexed proposalId, address indexed token, uint256 amount);
    event EmergencyWithdrawApproved(uint256 indexed proposalId, address indexed admin);
    event EmergencyWithdrawExecuted(uint256 indexed proposalId, address indexed token, uint256 amount);

    constructor(uint256 _feePercentage, address _feeRecipient) {
        feePercentage = _feePercentage;
        feeRecipient = _feeRecipient;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ARBITRATOR_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @dev Create an escrow. Seller locks up the token amount.
     */
    function createEscrow(
        address _buyer,
        address _token,
        uint256 _amount,
        uint256 _fiatAmount,
        uint256 _paymentWindow
    ) external whenNotPaused nonReentrant returns (uint256) {
        require(_buyer != address(0) && _buyer != msg.sender, "Invalid buyer address");
        require(_amount > 0, "Amount must be greater than zero");
        require(_paymentWindow >= 15 minutes && _paymentWindow <= 24 hours, "Invalid payment window");

        IERC20 token = IERC20(_token);
        require(token.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");

        uint256 escrowId = escrowCounter++;
        escrows[escrowId] = Escrow({
            seller: msg.sender,
            buyer: _buyer,
            token: _token,
            amount: _amount,
            fiatAmount: _fiatAmount,
            createdAt: block.timestamp,
            paymentWindow: _paymentWindow,
            disputeTime: 0,
            status: EscrowStatus.CREATED
        });

        emit EscrowCreated(escrowId, msg.sender, _buyer, _token, _amount);
        return escrowId;
    }

    /**
     * @dev Buyer marks the escrow as paid before the window expires.
     */
    function markPaid(uint256 _escrowId) external whenNotPaused {
        Escrow storage escrow = escrows[_escrowId];
        require(msg.sender == escrow.buyer, "Only buyer can mark paid");
        require(escrow.status == EscrowStatus.CREATED, "Escrow status must be CREATED");
        require(block.timestamp <= escrow.createdAt + escrow.paymentWindow, "Payment window expired");

        escrow.status = EscrowStatus.PAID;
        emit EscrowPaid(_escrowId);
    }

    /**
     * @dev Seller releases the locked tokens to the buyer (fee is deducted).
     */
    function releaseEscrow(uint256 _escrowId) external whenNotPaused nonReentrant {
        Escrow storage escrow = escrows[_escrowId];
        require(msg.sender == escrow.seller, "Only seller can release");
        require(escrow.status == EscrowStatus.PAID || escrow.status == EscrowStatus.CREATED, "Invalid status");

        _completeTransfer(_escrowId, escrow.buyer);
        escrow.status = EscrowStatus.RELEASED;

        emit EscrowReleased(_escrowId, escrow.buyer);
    }

    /**
     * @dev Seller refunds if payment was not received and window expired.
     */
    function cancelAndRefund(uint256 _escrowId) external whenNotPaused nonReentrant {
        Escrow storage escrow = escrows[_escrowId];
        require(msg.sender == escrow.seller, "Only seller can cancel");
        require(escrow.status == EscrowStatus.CREATED, "Cannot cancel if buyer marked paid");
        require(block.timestamp > escrow.createdAt + escrow.paymentWindow, "Payment window not expired yet");

        IERC20(escrow.token).transfer(escrow.seller, escrow.amount);
        escrow.status = EscrowStatus.REFUNDED;

        emit EscrowRefunded(_escrowId, escrow.seller);
    }

    /**
     * @dev Initiate a dispute if there is an issue with payment verification.
     */
    function initiateDispute(uint256 _escrowId) external whenNotPaused {
        Escrow storage escrow = escrows[_escrowId];
        require(msg.sender == escrow.buyer || msg.sender == escrow.seller, "Not a party to this escrow");
        require(escrow.status == EscrowStatus.PAID || escrow.status == EscrowStatus.CREATED, "Cannot dispute this escrow");

        escrow.status = EscrowStatus.DISPUTED;
        escrow.disputeTime = block.timestamp;
        emit EscrowDisputed(_escrowId, msg.sender);
    }

    /**
     * @dev Admin/Arbitrator resolves the dispute.
     */
    function resolveDispute(uint256 _escrowId, address _winner) external onlyRole(ARBITRATOR_ROLE) nonReentrant {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.DISPUTED, "Escrow is not in dispute");
        require(_winner == escrow.buyer || _winner == escrow.seller, "Winner must be buyer or seller");

        if (_winner == escrow.buyer) {
            _completeTransfer(_escrowId, escrow.buyer);
            escrow.status = EscrowStatus.RELEASED;
        } else {
            IERC20(escrow.token).transfer(escrow.seller, escrow.amount);
            escrow.status = EscrowStatus.REFUNDED;
        }

        emit EscrowDisputedResolved(_escrowId, _winner, msg.sender);
    }

    /**
     * @dev Symmetric Dispute Timeout Resolution.
     * If 24 hours pass and a party goes unresponsive, the opposing party can claim victory.
     */
    function claimDisputeTimeout(uint256 _escrowId) external whenNotPaused nonReentrant {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.status == EscrowStatus.DISPUTED, "Escrow not disputed");
        require(block.timestamp > escrow.disputeTime + 24 hours, "Dispute timeout window not passed yet");

        if (msg.sender == escrow.buyer) {
            // Seller is unresponsive to dispute -> Buyer wins
            _completeTransfer(_escrowId, escrow.buyer);
            escrow.status = EscrowStatus.RELEASED;
            emit EscrowDisputedResolved(_escrowId, escrow.buyer, msg.sender);
        } else if (msg.sender == escrow.seller) {
            // Buyer is unresponsive to dispute -> Seller wins
            IERC20(escrow.token).transfer(escrow.seller, escrow.amount);
            escrow.status = EscrowStatus.REFUNDED;
            emit EscrowDisputedResolved(_escrowId, escrow.seller, msg.sender);
        } else {
            revert("Not a party to this escrow");
        }
    }

    function _completeTransfer(uint256 _escrowId, address _recipient) internal {
        Escrow memory escrow = escrows[_escrowId];
        uint256 fee = (escrow.amount * feePercentage) / 10000;
        uint256 transferAmount = escrow.amount - fee;

        if (fee > 0 && feeRecipient != address(0)) {
            IERC20(escrow.token).transfer(feeRecipient, fee);
        }
        IERC20(escrow.token).transfer(_recipient, transferAmount);
    }

    /**
     * @dev Pauser utilities
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Admin utilities & Emergency Timelocked Withdrawals
     */
    function updateFee(uint256 _newFeePercentage, address _newFeeRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newFeePercentage <= 500, "Fee cannot exceed 5%");
        feePercentage = _newFeePercentage;
        feeRecipient = _newFeeRecipient;
    }

    function proposeEmergencyWithdraw(address _token, uint256 _amount) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        uint256 proposalId = emergencyProposalCounter++;
        emergencyProposals[proposalId] = EmergencyWithdrawProposal({
            token: _token,
            amount: _amount,
            proposedAt: block.timestamp,
            approvalCount: 1,
            executed: false
        });
        emergencyApprovals[proposalId][msg.sender] = true;

        emit EmergencyWithdrawProposed(proposalId, _token, _amount);
        return proposalId;
    }

    function approveEmergencyWithdraw(uint256 _proposalId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        EmergencyWithdrawProposal storage prop = emergencyProposals[_proposalId];
        require(!prop.executed, "Already executed");
        require(!emergencyApprovals[_proposalId][msg.sender], "Already approved by this admin");

        emergencyApprovals[_proposalId][msg.sender] = true;
        prop.approvalCount++;

        emit EmergencyWithdrawApproved(_proposalId, msg.sender);
    }

    function executeEmergencyWithdraw(uint256 _proposalId) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        EmergencyWithdrawProposal storage prop = emergencyProposals[_proposalId];
        require(!prop.executed, "Already executed");
        require(prop.approvalCount >= REQUIRED_ADMIN_APPROVALS, "Insufficient admin approvals");
        require(block.timestamp >= prop.proposedAt + TIMELOCK_DELAY, "Timelock delay window not expired");

        prop.executed = true;
        IERC20(prop.token).transfer(msg.sender, prop.amount);

        emit EmergencyWithdrawExecuted(_proposalId, prop.token, prop.amount);
    }

    function grantArbitrator(address _arbitrator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ARBITRATOR_ROLE, _arbitrator);
    }

    function revokeArbitrator(address _arbitrator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(ARBITRATOR_ROLE, _arbitrator);
    }
}
