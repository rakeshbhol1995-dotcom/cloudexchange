import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment of CloudExchangeEscrow contract...");

  const feePercentage = 10; // 0.1% protocol fee
  const feeRecipient = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat test account #0 / Admin multi-sig placeholder

  const EscrowContract = await ethers.getContractFactory("CloudExchangeEscrow");
  const escrow = await EscrowContract.deploy(feePercentage, feeRecipient);

  await escrow.waitForDeployment();
  const address = await escrow.getAddress();

  console.log(`CloudExchangeEscrow deployed successfully!`);
  console.log(`Contract Address: ${address}`);
  console.log(`Initial Fee: 0.1%`);
  console.log(`Fee Recipient: ${feeRecipient}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
