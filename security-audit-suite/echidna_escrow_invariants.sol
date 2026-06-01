// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../contracts/CloudExchangeEscrow.sol";

contract MockTokenFuzz is IERC20 {
    mapping(address => uint256) public override balanceOf;
    uint256 public totalMinted;

    function transfer(address to, uint256 value) external override returns (bool) {
        if (balanceOf[msg.sender] >= value) {
            balanceOf[msg.sender] -= value;
            balanceOf[to] += value;
            return true;
        }
        return false;
    }

    function transferFrom(address from, address to, uint256 value) external override returns (bool) {
        if (balanceOf[from] >= value) {
            balanceOf[from] -= value;
            balanceOf[to] += value;
            return true;
        }
        return false;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalMinted += amount;
    }
}

/**
 * @title EchidnaEscrowInvariants
 * @dev Fuzzing harness contract for verifying CloudExchangeEscrow invariants using Echidna.
 */
contract EchidnaEscrowInvariants is CloudExchangeEscrow {
    MockTokenFuzz public fuzzToken;
    
    address public constant buyerUser = address(0x1111);
    address public constant sellerUser = address(0x2222);
    address public constant feeRecipientUser = address(0x3333);

    constructor() CloudExchangeEscrow(10, feeRecipientUser) {
        fuzzToken = new MockTokenFuzz();
        fuzzToken.mint(sellerUser, 1_000_000);
    }

    /// INVARIANT 1: Total contract balance must ALWAYS equal sum of all locked active escrows
    function echidna_invariant_conservation_of_assets() public view returns (bool) {
        uint256 totalEscrowed = 0;
        for (uint256 i = 0; i < escrowCounter; i++) {
            (,,,,,,, , CloudExchangeEscrow.EscrowStatus status) = escrows(i);
            if (status == EscrowStatus.CREATED || status == EscrowStatus.PAID || status == EscrowStatus.DISPUTED) {
                (,,, uint256 amount,,,,,) = escrows(i);
                totalEscrowed += amount;
            }
        }
        return fuzzToken.balanceOf(address(this)) == totalEscrowed;
    }

    /// INVARIANT 2: Fee recipient address can never be address zero
    function echidna_invariant_fee_recipient_valid() public view returns (bool) {
        return feeRecipient != address(0);
    }

    /// INVARIANT 3: Fee percentage must be strictly bounded below 5%
    function echidna_invariant_fee_percentage_bound() public view returns (bool) {
        return feePercentage <= 500;
    }
}
