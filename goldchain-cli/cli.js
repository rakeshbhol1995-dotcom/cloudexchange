#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { Command } = require("commander");
const { ethers } = require("ethers");
const chalk = require("chalk");

const DEFAULT_RPC = "https://cloudexchange.in/rpc/";
const DEFAULT_KEYPAIR_FILE = "goldchain-keypair.json";

const program = new Command();

program
  .name("goldchain-cli")
  .description("Solana-like CLI tool for GoldChain L1 Blockchain network")
  .version("1.0.0");

// Global Options
program.option("-r, --rpc <url>", "RPC URL to connect to", DEFAULT_RPC);
program.option("-k, --keypair <filepath>", "Path to keypair JSON file", DEFAULT_KEYPAIR_FILE);

// 1. KEYGEN Command
program
  .command("keygen")
  .description("Generate a new GoldChain L1 keypair and mnemonic seed phrase")
  .action((options) => {
    const parentOpts = program.opts();
    const filepath = path.resolve(parentOpts.keypair);

    console.log(chalk.cyan("Generating a new random cryptographically secure keypair..."));

    try {
      const wallet = ethers.Wallet.createRandom();
      
      const keypairData = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase
      };

      fs.writeFileSync(filepath, JSON.stringify(keypairData, null, 2), "utf8");

      console.log("\n" + chalk.green("✔ Successfully generated new keypair!"));
      console.log(chalk.yellow("====================================================================="));
      console.log(chalk.bold("Public Address : ") + chalk.cyan(wallet.address));
      console.log(chalk.bold("Mnemonic Seed  : ") + chalk.magenta(wallet.mnemonic.phrase));
      console.log(chalk.yellow("====================================================================="));
      console.log(chalk.gray(`Keypair credentials securely saved to: ${filepath}`));
      console.log(chalk.red.bold("WARNING: Never share your mnemonic or private key with anyone!"));
    } catch (err) {
      console.error(chalk.red("Error generating keypair:"), err.message);
    }
  });

// 2. STATUS Command
program
  .command("status")
  .description("Check status of the GoldChain L1 validator node")
  .action(async () => {
    const parentOpts = program.opts();
    const rpcUrl = parentOpts.rpc;

    console.log(chalk.cyan(`Connecting to GoldChain L1 validator RPC at: ${rpcUrl}...`));

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Fetch details in parallel
      const [blockNumber, network, feeData] = await Promise.all([
        provider.getBlockNumber(),
        provider.getNetwork(),
        provider.getFeeData()
      ]);

      console.log("\n" + chalk.green("✔ Validator Node is Online!"));
      console.log(chalk.yellow("====================================================================="));
      console.log(chalk.bold("Chain Name     : ") + chalk.cyan("GoldChain L1 Validator Network"));
      console.log(chalk.bold("Chain ID       : ") + chalk.cyan(network.chainId.toString()));
      console.log(chalk.bold("Block Height   : ") + chalk.cyan(blockNumber.toLocaleString()));
      console.log(chalk.bold("Gas Price      : ") + chalk.cyan(`${ethers.formatUnits(feeData.gasPrice || 0n, "gwei")} Gwei`));
      console.log(chalk.yellow("====================================================================="));
    } catch (err) {
      console.error(chalk.red("\n✖ Error connecting to Validator Node:"), err.message);
      console.log(chalk.yellow("Make sure the RPC URL is correct and your internet connection is active."));
    }
  });

// 3. BALANCE Command
program
  .command("balance")
  .description("Query the balance of a GoldChain L1 address")
  .argument("[address]", "Address to query. If omitted, reads from the local keypair JSON file")
  .action(async (addressArg) => {
    const parentOpts = program.opts();
    const rpcUrl = parentOpts.rpc;
    const keypairPath = path.resolve(parentOpts.keypair);

    let queryAddress = addressArg;

    // If address not provided, check local keypair file
    if (!queryAddress) {
      if (fs.existsSync(keypairPath)) {
        try {
          const raw = fs.readFileSync(keypairPath, "utf8");
          const parsed = JSON.parse(raw);
          queryAddress = parsed.address;
          console.log(chalk.gray(`Using local keypair address: ${queryAddress}`));
        } catch (err) {
          console.error(chalk.red(`Error reading keypair file from ${keypairPath}:`), err.message);
          return;
        }
      } else {
        console.error(chalk.red("✖ No address provided and no local keypair file found."));
        console.log("Run " + chalk.yellow("goldchain keygen") + " to generate a new keypair first, or provide an address argument.");
        return;
      }
    }

    console.log(chalk.cyan(`Querying validator node at ${rpcUrl}...`));

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const balance = await provider.getBalance(queryAddress);

      console.log("\n" + chalk.green("✔ Balance Queried Successfully!"));
      console.log(chalk.yellow("====================================================================="));
      console.log(chalk.bold("Address : ") + chalk.cyan(queryAddress));
      console.log(chalk.bold("Balance : ") + chalk.green.bold(`${ethers.formatEther(balance)} GOLD`));
      console.log(chalk.yellow("====================================================================="));
    } catch (err) {
      console.error(chalk.red("\n✖ Failed to fetch balance:"), err.message);
    }
  });

// 4. TRANSFER Command
program
  .command("transfer")
  .description("Transfer GOLD tokens to another address")
  .argument("<to>", "Recipient wallet address")
  .argument("<amount>", "Amount of GOLD to send")
  .action(async (toAddress, amountStr) => {
    const parentOpts = program.opts();
    const rpcUrl = parentOpts.rpc;
    const keypairPath = path.resolve(parentOpts.keypair);

    if (!fs.existsSync(keypairPath)) {
      console.error(chalk.red(`✖ Keypair file not found at: ${keypairPath}`));
      console.log("Please run " + chalk.yellow("goldchain keygen") + " or configure the keypair path using " + chalk.cyan("--keypair"));
      return;
    }

    let privateKey = "";
    try {
      const raw = fs.readFileSync(keypairPath, "utf8");
      const parsed = JSON.parse(raw);
      privateKey = parsed.privateKey;
    } catch (err) {
      console.error(chalk.red("✖ Failed to parse keypair file:"), err.message);
      return;
    }

    if (!privateKey) {
      console.error(chalk.red("✖ Private key not found in keypair file."));
      return;
    }

    console.log(chalk.cyan(`Preparing transfer of ${amountStr} GOLD to ${toAddress}...`));

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      console.log(chalk.gray(`Sender address: ${wallet.address}`));
      console.log(chalk.cyan("Broadcasting signed transaction to GoldChain L1 validators..."));

      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amountStr)
      });

      console.log(chalk.yellow(`Transaction Hash: ${tx.hash}`));
      console.log(chalk.gray("Waiting for transaction confirmation on L1 block..."));

      const receipt = await tx.wait();

      console.log("\n" + chalk.green("✔ Transaction Succeeded and Confirmed on L1 Network!"));
      console.log(chalk.yellow("====================================================================="));
      console.log(chalk.bold("Sender Address    : ") + chalk.cyan(wallet.address));
      console.log(chalk.bold("Recipient Address : ") + chalk.cyan(toAddress));
      console.log(chalk.bold("Transfer Amount   : ") + chalk.green.bold(`${amountStr} GOLD`));
      console.log(chalk.bold("Block Number      : ") + chalk.cyan(receipt.blockNumber.toString()));
      console.log(chalk.bold("Gas Used          : ") + chalk.cyan(receipt.gasUsed.toString()));
      console.log(chalk.bold("Status            : ") + chalk.green.bold("Success (1 Confirmation)"));
      console.log(chalk.yellow("====================================================================="));
    } catch (err) {
      console.error(chalk.red("\n✖ Transfer transaction failed:"), err.message);
      if (err.message.includes("insufficient funds")) {
        console.log(chalk.yellow("Ensure you have enough GOLD in your balance and gas fees to execute the transfer."));
      }
    }
  });

program.parse(process.argv);
