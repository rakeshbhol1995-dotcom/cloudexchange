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
contract CloudExchangeEscrow {
    address public admin;
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
        EscrowStatus status;
    }

    mapping(uint256 => Escrow) public escrows;
    uint256 public escrowCounter;

    // Events
    event EscrowCreated(uint256 indexed escrowId, address indexed seller, address indexed buyer, address token, uint256 amount);
    event EscrowPaid(uint256 indexed escrowId);
    event EscrowReleased(uint256 indexed escrowId, address indexed buyer);
    event EscrowRefunded(uint256 indexed escrowId, address indexed seller);
    event EscrowDisputed(uint256 indexed escrowId, address indexed initiatedBy);
    event EscrowDisputedResolved(uint256 indexed escrowId, address indexed winner, address resolvedBy);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin allowed");
        _;
    }

    constructor(uint256 _feePercentage, address _feeRecipient) {
        admin = msg.sender;
        feePercentage = _feePercentage;
        feeRecipient = _feeRecipient;
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
    ) external returns (uint256) {
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
            status: EscrowStatus.CREATED
        });

        emit EscrowCreated(escrowId, msg.sender, _buyer, _token, _amount);
        return escrowId;
    }

    /**
     * @dev Buyer marks the escrow as paid before the window expires.
     */
    function markPaid(uint256 _escrowId) external {
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
    function releaseEscrow(uint256 _escrowId) external {
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
    function cancelAndRefund(uint256 _escrowId) external {
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
    function initiateDispute(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(msg.sender == escrow.buyer || msg.sender == escrow.seller, "Not a party to this escrow");
        require(escrow.status == EscrowStatus.PAID || escrow.status == EscrowStatus.CREATED, "Cannot dispute this escrow");

        escrow.status = EscrowStatus.DISPUTED;
        emit EscrowDisputed(_escrowId, msg.sender);
    }

    /**
     * @dev Admin resolves the dispute after verifying receipts/bank statements.
     */
    function resolveDispute(uint256 _escrowId, address _winner) external onlyAdmin {
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
     * @dev Admin utilities
     */
    function updateFee(uint256 _newFeePercentage, address _newFeeRecipient) external onlyAdmin {
        require(_newFeePercentage <= 500, "Fee cannot exceed 5%");
        feePercentage = _newFeePercentage;
        feeRecipient = _newFeeRecipient;
    }

    function updateAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin");
        admin = _newAdmin;
    }
}
