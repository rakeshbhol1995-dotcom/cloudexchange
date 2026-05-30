import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { CloudExchangeEscrow, MockUSDT } from "../typechain-types";

describe("CloudExchangeEscrow", function () {
  let escrow: CloudExchangeEscrow;
  let token: MockUSDT;
  let admin: SignerWithAddress;
  let feeRecipient: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let stranger: SignerWithAddress;

  const initialSupply = ethers.parseUnits("1000000", 6); // 1,000,000 USDT
  const amountToEscrow = ethers.parseUnits("1000", 6);   // 1,000 USDT
  const fiatAmount = 85000;                              // ₹85,000 INR
  const paymentWindow = 30 * 60;                         // 30 minutes (in seconds)
  const feePercentage = 10;                              // 0.1% (base 10000)

  beforeEach(async function () {
    [admin, feeRecipient, seller, buyer, stranger] = await ethers.getSigners();

    // 1. Deploy Mock USDT
    const MockUSDTFactory = await ethers.getContractFactory("MockUSDT");
    token = (await MockUSDTFactory.deploy(initialSupply)) as MockUSDT;
    await token.waitForDeployment();

    // Transfer some USDT to seller
    await token.transfer(seller.address, ethers.parseUnits("10000", 6));

    // 2. Deploy CloudExchangeEscrow
    const EscrowFactory = await ethers.getContractFactory("CloudExchangeEscrow");
    escrow = (await EscrowFactory.deploy(feePercentage, feeRecipient.address)) as CloudExchangeEscrow;
    await escrow.waitForDeployment();

    // Approve escrow contract to pull seller tokens
    await token.connect(seller).approve(await escrow.getAddress(), ethers.MaxUint256);
  });

  describe("Deployment", function () {
    it("should set the correct admin and fee structures", async function () {
      expect(await escrow.hasRole("0x0000000000000000000000000000000000000000000000000000000000000000", admin.address)).to.be.true;
      expect(await escrow.feePercentage()).to.equal(feePercentage);
      expect(await escrow.feeRecipient()).to.equal(feeRecipient.address);
    });
  });

  describe("Escrow Creation", function () {
    it("should allow a seller to lock tokens into a new escrow", async function () {
      const sellerBalanceBefore = await token.balanceOf(seller.address);
      const contractBalanceBefore = await token.balanceOf(await escrow.getAddress());

      // Create escrow
      const tx = await escrow.connect(seller).createEscrow(
        buyer.address,
        await token.getAddress(),
        amountToEscrow,
        fiatAmount,
        paymentWindow
      );

      await expect(tx)
        .to.emit(escrow, "EscrowCreated")
        .withArgs(0, seller.address, buyer.address, await token.getAddress(), amountToEscrow);

      const savedEscrow = await escrows(0);
      expect(savedEscrow.seller).to.equal(seller.address);
      expect(savedEscrow.buyer).to.equal(buyer.address);
      expect(savedEscrow.amount).to.equal(amountToEscrow);
      expect(savedEscrow.fiatAmount).to.equal(fiatAmount);
      expect(savedEscrow.status).to.equal(0); // CREATED

      // Tokens should be pulled into the escrow contract
      expect(await token.balanceOf(seller.address)).to.equal(sellerBalanceBefore - amountToEscrow);
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(contractBalanceBefore + amountToEscrow);
    });

    it("should fail if amount is zero or buyer is invalid", async function () {
      await expect(
        escrow.connect(seller).createEscrow(
          buyer.address,
          await token.getAddress(),
          0,
          fiatAmount,
          paymentWindow
        )
      ).to.be.revertedWith("Amount must be greater than zero");

      await expect(
        escrow.connect(seller).createEscrow(
          seller.address,
          await token.getAddress(),
          amountToEscrow,
          fiatAmount,
          paymentWindow
        )
      ).to.be.revertedWith("Invalid buyer address");
    });
  });

  describe("Payment State Transitions", function () {
    beforeEach(async function () {
      await escrow.connect(seller).createEscrow(
        buyer.address,
        await token.getAddress(),
        amountToEscrow,
        fiatAmount,
        paymentWindow
      );
    });

    it("should allow a buyer to mark the escrow as paid", async function () {
      const tx = await escrow.connect(buyer).markPaid(0);
      await expect(tx).to.emit(escrow, "EscrowPaid").withArgs(0);

      const savedEscrow = await escrows(0);
      expect(savedEscrow.status).to.equal(1); // PAID
    });

    it("should not allow anyone other than the buyer to mark as paid", async function () {
      await expect(
        escrow.connect(stranger).markPaid(0)
      ).to.be.revertedWith("Only buyer can mark paid");
    });
  });

  describe("Releases and Refunds", function () {
    beforeEach(async function () {
      await escrow.connect(seller).createEscrow(
        buyer.address,
        await token.getAddress(),
        amountToEscrow,
        fiatAmount,
        paymentWindow
      );
    });

    it("should transfer tokens to buyer minus fee when released", async function () {
      // Mark as paid first
      await escrow.connect(buyer).markPaid(0);

      const buyerBalanceBefore = await token.balanceOf(buyer.address);
      const recipientBalanceBefore = await token.balanceOf(feeRecipient.address);

      const fee = (amountToEscrow * BigInt(feePercentage)) / 10000n; // 1 USDT fee
      const transferAmount = amountToEscrow - fee;

      const tx = await escrow.connect(seller).releaseEscrow(0);
      await expect(tx).to.emit(escrow, "EscrowReleased").withArgs(0, buyer.address);

      expect(await token.balanceOf(buyer.address)).to.equal(buyerBalanceBefore + transferAmount);
      expect(await token.balanceOf(feeRecipient.address)).to.equal(recipientBalanceBefore + fee);

      const savedEscrow = await escrows(0);
      expect(savedEscrow.status).to.equal(2); // RELEASED
    });

    it("should allow seller to cancel and refund only after window expires without payment mark", async function () {
      // Try cancelling early
      await expect(
        escrow.connect(seller).cancelAndRefund(0)
      ).to.be.revertedWith("Payment window not expired yet");

      // Speed up time beyond window
      await ethers.provider.send("evm_increaseTime", [paymentWindow + 1]);
      await ethers.provider.send("evm_mine", []);

      const sellerBalanceBefore = await token.balanceOf(seller.address);
      const tx = await escrow.connect(seller).cancelAndRefund(0);

      await expect(tx).to.emit(escrow, "EscrowRefunded").withArgs(0, seller.address);
      expect(await token.balanceOf(seller.address)).to.equal(sellerBalanceBefore + amountToEscrow);

      const savedEscrow = await escrows(0);
      expect(savedEscrow.status).to.equal(3); // REFUNDED
    });
  });

  describe("Disputes and Resolution", function () {
    beforeEach(async function () {
      await escrow.connect(seller).createEscrow(
        buyer.address,
        await token.getAddress(),
        amountToEscrow,
        fiatAmount,
        paymentWindow
      );
    });

    it("should allow either buyer or seller to dispute a paid transaction", async function () {
      await escrow.connect(buyer).markPaid(0);

      const tx = await escrow.connect(buyer).initiateDispute(0);
      await expect(tx).to.emit(escrow, "EscrowDisputed").withArgs(0, buyer.address);

      const savedEscrow = await escrows(0);
      expect(savedEscrow.status).to.equal(4); // DISPUTED
    });

    it("should allow admin to resolve in favor of buyer", async function () {
      await escrow.connect(buyer).markPaid(0);
      await escrow.connect(seller).initiateDispute(0);

      const buyerBalanceBefore = await token.balanceOf(buyer.address);
      const fee = (amountToEscrow * BigInt(feePercentage)) / 10000n;

      const tx = await escrow.connect(admin).resolveDispute(0, buyer.address);
      await expect(tx)
        .to.emit(escrow, "EscrowDisputedResolved")
        .withArgs(0, buyer.address, admin.address);

      expect(await token.balanceOf(buyer.address)).to.equal(buyerBalanceBefore + (amountToEscrow - fee));
    });

    it("should allow admin to resolve in favor of seller (refund)", async function () {
      await escrow.connect(buyer).markPaid(0);
      await escrow.connect(seller).initiateDispute(0);

      const sellerBalanceBefore = await token.balanceOf(seller.address);

      const tx = await escrow.connect(admin).resolveDispute(0, seller.address);
      await expect(tx)
        .to.emit(escrow, "EscrowDisputedResolved")
        .withArgs(0, seller.address, admin.address);

      expect(await token.balanceOf(seller.address)).to.equal(sellerBalanceBefore + amountToEscrow);
    });
  });

  // Helper helper
  async function escrows(id: number) {
    const raw = await escrow.escrows(id);
    return {
      seller: raw[0],
      buyer: raw[1],
      token: raw[2],
      amount: raw[3],
      fiatAmount: raw[4],
      createdAt: raw[5],
      paymentWindow: raw[6],
      disputeTime: raw[7],
      status: Number(raw[8]),
    };
  }
});
