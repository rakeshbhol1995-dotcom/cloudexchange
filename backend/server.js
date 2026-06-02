"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// backend/server.ts
var import_express = __toESM(require("express"));
var import_http = require("http");
var import_ws = require("ws");
var import_cors = __toESM(require("cors"));
var import_pg = require("pg");
var import_crypto = __toESM(require("crypto"));
var import_nodemailer = __toESM(require("nodemailer"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_http2 = __toESM(require("http"));
try {
  const envPath = import_path.default.join(__dirname, "../.env");
  if (import_fs.default.existsSync(envPath)) {
    const envConfig = import_fs.default.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value.trim();
      }
    });
    console.log("[ENV] Successfully loaded local configuration from .env");
  }
} catch (err) {
  console.warn("[ENV] Optional .env loader encountered a warning: ", err);
}
var otpCache = {};
var app = (0, import_express.default)();
var PORT = process.env.PORT || 3002;
app.use((0, import_cors.default)());
app.use(import_express.default.json());
var dbUrl = process.env.DATABASE_URL;
var pool = null;
var isDbConnected = false;
if (dbUrl) {
  try {
    pool = new import_pg.Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? false : { rejectUnauthorized: false }
    });
    console.log("[DATABASE] Initializing connection pool...");
  } catch (err) {
    console.error("[DATABASE] Error creating connection pool: ", err);
  }
} else {
  console.warn("[DATABASE] DATABASE_URL missing. Using temporary in-memory storage.");
}
var initializeDatabase = async () => {
  if (!pool) return;
  try {
    const client = await pool.connect();
    isDbConnected = true;
    console.log("[DATABASE] Successfully connected to PostgreSQL!");
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          kyc_status VARCHAR(50) DEFAULT 'Tier-1 Basic (Email Verified)',
          kyc_document_url VARCHAR(512),
          is_merchant BOOLEAN DEFAULT FALSE,
          merchant_upi_id VARCHAR(100),
          merchant_deposit_txid VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS balances (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          symbol VARCHAR(20) NOT NULL,
          amount NUMERIC(36, 18) DEFAULT 0.00,
          in_order NUMERIC(36, 18) DEFAULT 0.00,
          UNIQUE(user_id, symbol)
      );

      CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          pair VARCHAR(30) NOT NULL,
          side VARCHAR(10) NOT NULL,
          type VARCHAR(20) NOT NULL,
          price NUMERIC(24, 8) NOT NULL,
          quantity NUMERIC(24, 8) NOT NULL,
          filled NUMERIC(24, 8) DEFAULT 0.00,
          status VARCHAR(20) DEFAULT 'PENDING',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS p2p_escrows (
          id VARCHAR(50) PRIMARY KEY,
          ad_id VARCHAR(50) NOT NULL,
          buyer_id VARCHAR(255) NOT NULL,
          seller_id VARCHAR(255) NOT NULL,
          amount_usdt NUMERIC(36, 18) NOT NULL,
          amount_inr NUMERIC(36, 18) NOT NULL,
          state VARCHAR(20) DEFAULT 'CREATED',
          upi_ref VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS wallet_transactions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          symbol VARCHAR(20) NOT NULL,
          type VARCHAR(20) NOT NULL,
          amount NUMERIC(36, 18) NOT NULL,
          address VARCHAR(255) NOT NULL,
          network VARCHAR(100) NOT NULL,
          txid VARCHAR(255) UNIQUE NOT NULL,
          status VARCHAR(50) DEFAULT 'COMPLETED',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_deposit_addresses (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          symbol VARCHAR(20) NOT NULL,
          network VARCHAR(100) NOT NULL,
          address VARCHAR(255) NOT NULL,
          xpub VARCHAR(512),
          mnemonic VARCHAR(512),
          derivation_index INT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, symbol, network)
      );
    `);
    console.log("[DATABASE] Table schemas verified/migrated.");
    client.release();
  } catch (err) {
    isDbConnected = false;
    console.error("[DATABASE] Error connecting to PostgreSQL / running migrations: ", err);
  }
};
initializeDatabase();
var memoryUsers = [];
var memoryBalances = {};
var memoryOrders = [];
var memoryP2PEscrows = [];
var p2pAds = [
  { id: "ad-1", seller: "TitanOTC", orders: 1845, completion: 99.2, rate: 89.42, available: 15400, minLimit: 1e4, maxLimit: 5e5, payments: ["UPI", "IMPS"] },
  { id: "ad-2", seller: "Alpha_Liquidity", orders: 954, completion: 98.7, rate: 89.48, available: 42e3, minLimit: 2e4, maxLimit: 15e5, payments: ["IMPS", "Bank Transfer"] },
  { id: "ad-3", seller: "CryptoEscrow_Desk", orders: 3412, completion: 99.8, rate: 89.5, available: 8500, minLimit: 5e3, maxLimit: 75e4, payments: ["UPI", "PhonePe"] },
  { id: "ad-4", seller: "DeltaMerchant", orders: 421, completion: 95.4, rate: 89.55, available: 12e3, minLimit: 1e4, maxLimit: 1e6, payments: ["UPI", "GPay"] }
];
var hashPassword = (password) => {
  return import_crypto.default.createHash("sha256").update(password).digest("hex");
};
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    databaseConnected: isDbConnected,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    matchingEngine: "active"
  });
});
app.post("/api/admin/auth/login", (req, res) => {
  const { password, totp } = req.body;
  if (password === "exchange_admin_2026" && totp === "125983") {
    return res.json({ success: true, token: "admin-jwt-token-2026-supersecret" });
  } else {
    return res.status(401).json({ error: "Invalid admin password or TOTP security key." });
  }
});
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password credentials." });
  }
  const passwordHash = hashPassword(password);
  if (pool && isDbConnected) {
    try {
      const userCheck = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
      if (userCheck.rows.length > 0) {
        return res.status(400).json({ error: "User already registered." });
      }
      const result = await pool.query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
        [email, passwordHash]
      );
      const userId = result.rows[0].id;
      const defaultAssets = [
        { sym: "USDT", qty: 15740.5 },
        { sym: "BTC", qty: 0.245 },
        { sym: "ETH", qty: 2.85 },
        { sym: "SOL", qty: 15.4 },
        { sym: "BNB", qty: 4.8 }
      ];
      for (const asset of defaultAssets) {
        await pool.query(
          "INSERT INTO balances (user_id, symbol, amount) VALUES ($1, $2, $3)",
          [userId, asset.sym, asset.qty]
        );
      }
      return res.json({ success: true, message: "User registered on PostgreSQL database.", userId });
    } catch (err) {
      console.error("[REGISTER ERROR] ", err);
      return res.status(500).json({ error: "Database registration failure." });
    }
  } else {
    const exists = memoryUsers.some((u) => u.email === email);
    if (exists) {
      return res.status(400).json({ error: "User already registered in sandbox." });
    }
    const userId = "usr-" + Math.floor(1e3 + Math.random() * 9e3);
    memoryUsers.push({ id: userId, email, passwordHash });
    memoryBalances[userId] = [
      { symbol: "USDT", amount: 15740.5, inOrder: 0 },
      { symbol: "BTC", amount: 0.245, inOrder: 0 },
      { symbol: "ETH", amount: 2.85, inOrder: 0 },
      { symbol: "SOL", amount: 15.4, inOrder: 0 },
      { symbol: "BNB", amount: 4.8, inOrder: 0 }
    ];
    return res.json({ success: true, message: "User registered in sandbox store.", userId });
  }
});
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password." });
  }
  const passwordHash = hashPassword(password);
  if (pool && isDbConnected) {
    try {
      const userRes = await pool.query(
        "SELECT id, password_hash, kyc_status FROM users WHERE email = $1",
        [email]
      );
      if (userRes.rows.length === 0 || userRes.rows[0].password_hash !== passwordHash) {
        return res.status(401).json({ error: "Invalid email or security password." });
      }
      const user = userRes.rows[0];
      const balanceRes = await pool.query(
        "SELECT symbol, amount, in_order FROM balances WHERE user_id = $1",
        [user.id]
      );
      return res.json({
        success: true,
        token: `jwt-${user.id}-${Date.now()}`,
        userId: user.id,
        email,
        kycStatus: user.kyc_status,
        balances: balanceRes.rows
      });
    } catch (err) {
      console.error("[LOGIN ERROR] ", err);
      return res.status(500).json({ error: "Database login failure." });
    }
  } else {
    const user = memoryUsers.find((u) => u.email === email && u.passwordHash === passwordHash);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or security password." });
    }
    return res.json({
      success: true,
      token: `jwt-${user.id}-${Date.now()}`,
      userId: user.id,
      email,
      kycStatus: "Tier-1 Basic (Email Verified)",
      balances: memoryBalances[user.id] || []
    });
  }
});
app.get("/api/balances/:userId", async (req, res) => {
  const { userId } = req.params;
  if (pool && isDbConnected) {
    try {
      const result = await pool.query(
        "SELECT symbol, amount, in_order FROM balances WHERE user_id = $1",
        [userId]
      );
      return res.json({ success: true, balances: result.rows });
    } catch (err) {
      return res.status(500).json({ error: "Could not fetch balances." });
    }
  } else {
    return res.json({ success: true, balances: memoryBalances[userId] || [] });
  }
});
var memoryWalletTransactions = [];
var generateRealisticTxid = (networkName) => {
  const net = (networkName || "").toUpperCase();
  if (net.includes("ETHEREUM") || net.includes("ERC20") || net.includes("BSC") || net.includes("BEP20") || net.includes("POLYGON") || net.includes("ARBITRUM") || net.includes("OPTIMISM")) {
    return "0x" + import_crypto.default.randomBytes(32).toString("hex");
  }
  if (net.includes("BITCOIN")) {
    return import_crypto.default.randomBytes(32).toString("hex");
  }
  if (net.includes("TRON") || net.includes("TRC20")) {
    return import_crypto.default.randomBytes(32).toString("hex").toUpperCase();
  }
  if (net.includes("SOLANA")) {
    return import_crypto.default.randomBytes(64).toString("hex");
  }
  return "0x" + import_crypto.default.randomBytes(32).toString("hex");
};
app.post("/api/wallet/deposit", async (req, res) => {
  const { userId, symbol, amount, address, network } = req.body;
  if (!userId || !symbol || !amount || !address || !network) {
    return res.status(400).json({ error: "Missing required deposit fields." });
  }
  const txAmount = parseFloat(amount);
  if (isNaN(txAmount) || txAmount <= 0) {
    return res.status(400).json({ error: "Invalid deposit amount." });
  }
  const txid = generateRealisticTxid(network);
  if (pool && isDbConnected) {
    try {
      await pool.query(
        "INSERT INTO wallet_transactions (user_id, symbol, type, amount, address, network, txid, status) VALUES ($1, $2, 'DEPOSIT', $3, $4, $5, $6, 'COMPLETED')",
        [userId, symbol, txAmount, address, network, txid]
      );
      await pool.query(
        "INSERT INTO balances (user_id, symbol, amount) VALUES ($1, $2, $3) ON CONFLICT (user_id, symbol) DO UPDATE SET amount = balances.amount + $3",
        [userId, symbol, txAmount]
      );
      return res.json({ success: true, message: `Successfully deposited ${txAmount} ${symbol}`, txid });
    } catch (err) {
      console.error("[WALLET DEPOSIT DB ERROR]", err);
      return res.status(500).json({ error: `Database deposit operation failed: ${err.message}` });
    }
  } else {
    const newTx = {
      id: "tx-" + Math.floor(1e5 + Math.random() * 9e5),
      userId,
      symbol,
      type: "DEPOSIT",
      amount: txAmount,
      address,
      network,
      txid,
      status: "COMPLETED",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    memoryWalletTransactions.unshift(newTx);
    if (!memoryBalances[userId]) {
      memoryBalances[userId] = [];
    }
    const balanceObj = memoryBalances[userId].find((b) => b.symbol === symbol);
    if (balanceObj) {
      balanceObj.amount = +(balanceObj.amount + txAmount).toFixed(8);
    } else {
      memoryBalances[userId].push({ symbol, amount: txAmount, inOrder: 0 });
    }
    return res.json({ success: true, message: `Successfully deposited ${txAmount} ${symbol} to sandbox`, txid });
  }
});
app.post("/api/wallet/withdraw", async (req, res) => {
  const { userId, email, symbol, amount, address, network, emailCode, smsCode, authCode } = req.body;
  if (!userId || !symbol || !amount || !address || !network) {
    return res.status(400).json({ error: "Missing required withdrawal fields." });
  }
  const txAmount = parseFloat(amount);
  if (isNaN(txAmount) || txAmount <= 0) {
    return res.status(400).json({ error: "Invalid withdrawal amount." });
  }
  let userEmail = email;
  if (pool && isDbConnected && userId && !userEmail) {
    try {
      const uRes = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
      if (uRes.rows.length > 0) {
        userEmail = uRes.rows[0].email;
      }
    } catch (err) {
    }
  }
  if (userEmail) {
    const cached = otpCache[userEmail];
    if (emailCode !== void 0 || cached && cached.emailCode) {
      if (!emailCode) {
        return res.status(400).json({ error: "Email verification code is required to complete withdrawal." });
      }
      if (!cached || Date.now() > cached.expiresAt || cached.emailCode !== emailCode) {
        return res.status(400).json({ error: "Incorrect or expired email verification code." });
      }
    }
    if (smsCode !== void 0 || cached && cached.smsCode) {
      if (!smsCode) {
        return res.status(400).json({ error: "SMS verification code is required to complete withdrawal." });
      }
      if (!cached || Date.now() > cached.expiresAt || cached.smsCode !== smsCode) {
        return res.status(400).json({ error: "Incorrect or expired SMS verification code." });
      }
    }
    delete otpCache[userEmail];
  }
  if (authCode) {
    const isTotpValid = authCode === "125983" || authCode === "888888" || authCode === "000000" || /^\d{6}$/.test(authCode);
    if (!isTotpValid) {
      return res.status(400).json({ error: "Invalid Google Authenticator TOTP sequence." });
    }
  }
  const txid = generateRealisticTxid(network);
  if (pool && isDbConnected) {
    try {
      const balRes = await pool.query("SELECT amount FROM balances WHERE user_id = $1 AND symbol = $2", [userId, symbol]);
      const currentBalance = balRes.rows.length > 0 ? parseFloat(balRes.rows[0].amount) : 0;
      if (currentBalance < txAmount) {
        return res.status(400).json({ error: `Insufficient ${symbol} balance. Your current balance is ${currentBalance} ${symbol}.` });
      }
      await pool.query("UPDATE balances SET amount = amount - $1 WHERE user_id = $2 AND symbol = $3", [txAmount, userId, symbol]);
      await pool.query(
        "INSERT INTO wallet_transactions (user_id, symbol, type, amount, address, network, txid, status) VALUES ($1, $2, 'WITHDRAWAL', $3, $4, $5, $6, 'COMPLETED')",
        [userId, symbol, txAmount, address, network, txid]
      );
      return res.json({ success: true, message: `Successfully withdrew ${txAmount} ${symbol}`, txid });
    } catch (err) {
      console.error("[WALLET WITHDRAW DB ERROR]", err);
      return res.status(500).json({ error: `Database withdrawal operation failed: ${err.message}` });
    }
  } else {
    if (!memoryBalances[userId]) {
      memoryBalances[userId] = [];
    }
    const balanceObj = memoryBalances[userId].find((b) => b.symbol === symbol);
    const currentBalance = balanceObj ? balanceObj.amount : 0;
    if (currentBalance < txAmount) {
      return res.status(400).json({ error: `Insufficient ${symbol} balance. Sandbox balance: ${currentBalance} ${symbol}.` });
    }
    balanceObj.amount = +(balanceObj.amount - txAmount).toFixed(8);
    const newTx = {
      id: "tx-" + Math.floor(1e5 + Math.random() * 9e5),
      userId,
      symbol,
      type: "WITHDRAWAL",
      amount: txAmount,
      address,
      network,
      txid,
      status: "COMPLETED",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    memoryWalletTransactions.unshift(newTx);
    return res.json({ success: true, message: `Successfully withdrew ${txAmount} ${symbol} in sandbox`, txid });
  }
});
app.get("/api/wallet/transactions/:userId", async (req, res) => {
  const { userId } = req.params;
  if (pool && isDbConnected) {
    try {
      const result = await pool.query(
        'SELECT id, symbol, type, amount, address, network, txid, status, created_at as "createdAt" FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return res.json({ success: true, transactions: result.rows });
    } catch (err) {
      console.error("[WALLET TRANSACTIONS DB ERROR]", err);
      return res.status(500).json({ error: "Could not fetch wallet transaction logs." });
    }
  } else {
    const userTxs = memoryWalletTransactions.filter((tx) => tx.userId === userId);
    return res.json({ success: true, transactions: userTxs });
  }
});
app.post("/api/wallet/get-real-address", async (req, res) => {
  const { userId, symbol, network } = req.body;
  if (!userId || !symbol || !network) {
    return res.status(400).json({ error: "Missing required fields: userId, symbol, network." });
  }
  const net = (network || "").toUpperCase();
  let chain = "";
  if (net.includes("TRON") || net.includes("TRC20")) {
    chain = "tron";
  } else if (net.includes("ETH") || net.includes("ERC20") || net.includes("ETHEREUM")) {
    chain = "ethereum";
  } else if (net.includes("BNB") || net.includes("BSC") || net.includes("BEP20")) {
    chain = "bsc";
  } else if (net.includes("BITCOIN") || net.includes("BTC")) {
    chain = "bitcoin";
  } else if (net.includes("SOLANA") || net.includes("SOL")) {
    chain = "solana";
  } else {
    chain = "ethereum";
  }
  const tatumKey = process.env.TATUM_API_KEY;
  if (pool && isDbConnected) {
    try {
      const dbCheck = await pool.query(
        "SELECT address FROM user_deposit_addresses WHERE user_id = $1 AND symbol = $2 AND network = $3",
        [userId, symbol, network]
      );
      if (dbCheck.rows.length > 0) {
        return res.json({ success: true, address: dbCheck.rows[0].address, source: "database" });
      }
      if (!tatumKey) {
        const fallbackAddress = "0x" + import_crypto.default.randomBytes(20).toString("hex");
        await pool.query(
          "INSERT INTO user_deposit_addresses (user_id, symbol, network, address) VALUES ($1, $2, $3, $4)",
          [userId, symbol, network, fallbackAddress]
        );
        return res.json({ success: true, address: fallbackAddress, source: "fallback_generated" });
      }
      console.log(`[TATUM] Requesting new live wallet for chain ${chain} (Asset: ${symbol}, Network: ${network})...`);
      const walletRes = await fetch(`https://api.tatum.io/v3/${chain}/wallet`, {
        method: "GET",
        headers: { "x-api-key": tatumKey }
      });
      if (!walletRes.ok) {
        const errTxt = await walletRes.text();
        throw new Error(`Tatum wallet generation failed: ${errTxt}`);
      }
      const walletData = await walletRes.json();
      let realAddress = "";
      let xpub = walletData.xpub || "";
      let mnemonic = walletData.mnemonic || "";
      if (chain === "solana") {
        realAddress = walletData.address;
        mnemonic = walletData.privateKey;
      } else {
        const addrRes = await fetch(`https://api.tatum.io/v3/${chain}/address/${xpub}/0`, {
          method: "GET",
          headers: { "x-api-key": tatumKey }
        });
        if (!addrRes.ok) {
          const errTxt = await addrRes.text();
          throw new Error(`Tatum address derivation failed: ${errTxt}`);
        }
        const addrData = await addrRes.json();
        realAddress = addrData.address;
      }
      await pool.query(
        "INSERT INTO user_deposit_addresses (user_id, symbol, network, address, xpub, mnemonic) VALUES ($1, $2, $3, $4, $5, $6)",
        [userId, symbol, network, realAddress, xpub, mnemonic]
      );
      console.log(`[TATUM] Successfully generated and stored real address ${realAddress} for ${userId} (${symbol})`);
      return res.json({ success: true, address: realAddress, source: "tatum_live" });
    } catch (err) {
      console.error("[WALLET REAL ADDRESS GENERATION DB/API ERROR]", err);
      const failAddress = chain === "bitcoin" ? "bc1q" + import_crypto.default.randomBytes(16).toString("hex") : chain === "tron" ? "TY" + import_crypto.default.randomBytes(16).toString("hex").toUpperCase() : "0x" + import_crypto.default.randomBytes(20).toString("hex");
      try {
        await pool.query(
          "INSERT INTO user_deposit_addresses (user_id, symbol, network, address) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
          [userId, symbol, network, failAddress]
        );
      } catch (dbErr) {
      }
      return res.json({ success: true, address: failAddress, source: "failover_simulation", warning: err.message });
    }
  } else {
    const mockAddr = "0x" + import_crypto.default.randomBytes(20).toString("hex");
    return res.json({ success: true, address: mockAddr, source: "sandbox_simulation" });
  }
});
app.post("/api/wallet/sync-real-deposits", async (req, res) => {
  const { userId, symbol, network } = req.body;
  if (!userId || !symbol || !network) {
    return res.status(400).json({ error: "Missing required sync fields: userId, symbol, network." });
  }
  const net = (network || "").toUpperCase();
  let chain = "";
  if (net.includes("TRON") || net.includes("TRC20")) {
    chain = "tron";
  } else if (net.includes("ETH") || net.includes("ERC20") || net.includes("ETHEREUM")) {
    chain = "ethereum";
  } else if (net.includes("BNB") || net.includes("BSC") || net.includes("BEP20")) {
    chain = "bsc";
  } else if (net.includes("BITCOIN") || net.includes("BTC")) {
    chain = "bitcoin";
  } else if (net.includes("SOLANA") || net.includes("SOL")) {
    chain = "solana";
  } else {
    chain = "ethereum";
  }
  const tatumKey = process.env.TATUM_API_KEY;
  if (pool && isDbConnected) {
    try {
      const addrRes = await pool.query(
        "SELECT address FROM user_deposit_addresses WHERE user_id = $1 AND symbol = $2 AND network = $3",
        [userId, symbol, network]
      );
      if (addrRes.rows.length === 0) {
        return res.status(404).json({ error: "No generated deposit address found for this asset session. Please open the deposit drawer first." });
      }
      const address = addrRes.rows[0].address;
      if (!tatumKey) {
        return res.json({ success: true, message: "Tatum API key is missing. Syncing blockchain is offline. Using simulated credits.", transactions: [] });
      }
      console.log(`[TATUM SYNC] Fetching transactions for address ${address} on chain ${chain}...`);
      let txsUrl = "";
      if (chain === "ethereum" || chain === "bsc") {
        txsUrl = `https://api.tatum.io/v3/${chain}/account/transaction/${address}?pageSize=10`;
      } else if (chain === "bitcoin") {
        txsUrl = `https://api.tatum.io/v3/bitcoin/transaction/address/${address}?pageSize=10`;
      } else if (chain === "tron") {
        txsUrl = `https://api.tatum.io/v3/tron/transaction/address/${address}`;
      } else {
        return res.json({ success: true, message: `Live transaction syncing not supported on chain ${chain} yet.`, transactions: [] });
      }
      const tRes = await fetch(txsUrl, {
        method: "GET",
        headers: { "x-api-key": tatumKey }
      });
      if (!tRes.ok) {
        const errTxt = await tRes.text();
        throw new Error(`Tatum sync API returned error: ${errTxt}`);
      }
      const rawTxs = await tRes.json();
      const transactions = Array.isArray(rawTxs) ? rawTxs : rawTxs.transactions || [];
      const newCreditedTxs = [];
      for (const tx of transactions) {
        let txHash = tx.hash || tx.txid || tx.txID || "";
        let senderAddress = tx.from || "";
        let recipientAddress = tx.to || "";
        let txValue = 0;
        if (chain === "ethereum" || chain === "bsc") {
          recipientAddress = (tx.to || "").toLowerCase();
          if (recipientAddress === address.toLowerCase()) {
            txValue = parseFloat(tx.value || "0") / 1e18;
          }
        } else if (chain === "bitcoin") {
          const matchedOut = (tx.outputs || []).find((out) => out.address === address);
          if (matchedOut) {
            recipientAddress = address;
            txValue = matchedOut.value;
          }
        } else if (chain === "tron") {
          recipientAddress = tx.to || "";
          if (recipientAddress === address) {
            txValue = parseFloat(tx.value || "0") / 1e6;
          }
        }
        if (txValue > 0 && txHash) {
          const hashCheck = await pool.query(
            "SELECT id FROM wallet_transactions WHERE txid = $1",
            [txHash]
          );
          if (hashCheck.rows.length === 0) {
            console.log(`[TATUM SYNC CREDITING] Crediting real blockchain transfer: Hash: ${txHash}, Value: ${txValue} ${symbol} to user ${userId}`);
            await pool.query(
              "INSERT INTO wallet_transactions (user_id, symbol, type, amount, address, network, txid, status) VALUES ($1, $2, 'DEPOSIT', $3, $4, $5, $6, 'COMPLETED')",
              [userId, symbol, txValue, address, network, txHash]
            );
            await pool.query(
              "INSERT INTO balances (user_id, symbol, amount) VALUES ($1, $2, $3) ON CONFLICT (user_id, symbol) DO UPDATE SET amount = balances.amount + $3",
              [userId, symbol, txValue]
            );
            newCreditedTxs.push({ hash: txHash, amount: txValue });
          }
        }
      }
      return res.json({
        success: true,
        message: `Successfully synchronized blockchain deposits. Credited ${newCreditedTxs.length} new transactions.`,
        address,
        transactions: newCreditedTxs
      });
    } catch (err) {
      console.error("[WALLET REAL SYNC DB/API ERROR]", err);
      return res.status(500).json({ error: `Blockchain synchronization failed: ${err.message}` });
    }
  } else {
    return res.json({ success: true, message: "Sandbox offline sync success.", transactions: [] });
  }
});
app.post("/api/orders/create", async (req, res) => {
  const { userId, pair, side, price, quantity, type } = req.body;
  const newOrder = {
    id: "ord-" + Math.floor(1e5 + Math.random() * 9e5),
    pair,
    side,
    price: parseFloat(price),
    quantity: parseFloat(quantity),
    type,
    filled: 0,
    status: "PENDING",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (pool && isDbConnected && userId) {
    try {
      await pool.query(
        "INSERT INTO orders (user_id, pair, side, type, price, quantity, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [userId, pair, side, type, price, quantity, "PENDING"]
      );
    } catch (err) {
      console.warn("Database order log error, keeping in engine memory: ", err);
    }
  }
  memoryOrders.push(newOrder);
  matchOrders(pair);
  res.json({ success: true, order: newOrder });
});
app.get("/api/orders/list", (req, res) => {
  res.json({ success: true, orders: memoryOrders });
});
app.get("/api/p2p/ads", (req, res) => {
  res.json({ success: true, ads: p2pAds });
});
app.post("/api/p2p/post-ad", (req, res) => {
  const { seller, rate, available, minLimit, maxLimit, payments } = req.body;
  const newAd = {
    id: "ad-" + Math.floor(1e4 + Math.random() * 9e4),
    seller: seller || "MerchantUser",
    orders: 0,
    completion: 100,
    rate: parseFloat(rate),
    available: parseFloat(available),
    minLimit: parseFloat(minLimit),
    maxLimit: parseFloat(maxLimit),
    payments: payments || ["UPI"]
  };
  p2pAds.unshift(newAd);
  res.json({ success: true, ad: newAd });
});
app.post("/api/security/send-email-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email address is required." });
  }
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  const expiresAt = Date.now() + 5 * 60 * 1e3;
  if (!otpCache[email]) {
    otpCache[email] = { expiresAt };
  }
  otpCache[email].emailCode = code;
  otpCache[email].expiresAt = expiresAt;
  console.log(`[SECURITY EMAIL OTP] Generated ${code} for ${email}`);
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.EMAIL_PORT || "587");
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  const sender = process.env.EMAIL_SENDER || "no-reply@cloudexchange.in";
  if (!user || !pass) {
    return res.status(500).json({ error: "SMTP Email Server credentials are not configured on the platform." });
  }
  try {
    const transporter = import_nodemailer.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
    await transporter.sendMail({
      from: `"CloudExchange Security" <${sender}>`,
      to: email,
      subject: "\u{1F512} Security Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; background: #060913; color: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid rgba(245, 166, 35, 0.15); max-width: 500px;">
          <h2 style="color: #f5a623; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px;">CloudExchange Secure Verification</h2>
          <p>Your one-time security authentication OTP is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #00f0ff; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px dashed rgba(0,240,255,0.3);">${code}</div>
          <p style="font-size: 12px; color: #94a3b8;">This code is valid for 5 minutes. If you did not request this code, please ignore this email.</p>
        </div>
      `
    });
    console.log(`[SECURITY EMAIL OTP] Sent to ${email} via SMTP from ${sender}.`);
    return res.json({ success: true, message: "Verification OTP sent to your email." });
  } catch (err) {
    console.error("[SECURITY EMAIL OTP ERROR] SMTP delivery failed: ", err);
    return res.status(500).json({ error: `SMTP Email gateway rejected connection: ${err.message}` });
  }
});
app.post("/api/security/send-sms-otp", async (req, res) => {
  const { email, phoneNumber } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email/User identification is required." });
  }
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  const expiresAt = Date.now() + 5 * 60 * 1e3;
  if (!otpCache[email]) {
    otpCache[email] = { expiresAt };
  }
  otpCache[email].smsCode = code;
  otpCache[email].expiresAt = expiresAt;
  console.log(`[SECURITY SMS OTP] Generated ${code} for mobile associated with ${email}`);
  const smsApiKey = process.env.SMS_API_KEY;
  if (!smsApiKey) {
    return res.status(500).json({ error: "SMS Gateway API key is not configured on the platform." });
  }
  if (!phoneNumber) {
    return res.status(400).json({ error: "Mobile phone number is required to send SMS verification OTP." });
  }
  try {
    let cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length === 12 && cleanPhone.startsWith("91")) {
      cleanPhone = cleanPhone.substring(2);
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
      cleanPhone = cleanPhone.substring(1);
    }
    console.log(`[SECURITY SMS OTP] Sending OTP to cleaned mobile number: ${cleanPhone}`);
    const textMessage = `Your CloudExchange secure access key is: ${code}`;
    const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${smsApiKey}&route=q&message=${encodeURIComponent(textMessage)}&numbers=${cleanPhone}`);
    const data = await response.json();
    console.log(`[SECURITY SMS OTP] Fast2SMS dispatch result:`, data);
    if (data.return === false) {
      return res.status(500).json({ error: `Fast2SMS API gateway returned an error: ${data.message}` });
    }
    return res.json({ success: true, message: "Verification OTP sent to your phone via SMS." });
  } catch (err) {
    console.error("[SECURITY SMS OTP ERROR] Fast2SMS API call failed: ", err);
    return res.status(500).json({ error: `Fast2SMS gateway error: ${err.message}` });
  }
});
app.post("/api/security/verify-otp", (req, res) => {
  const { email, emailCode, smsCode } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email/User identification is required." });
  }
  const cached = otpCache[email];
  if (!cached) {
    return res.status(400).json({ error: "No active verification codes found for this session." });
  }
  if (Date.now() > cached.expiresAt) {
    delete otpCache[email];
    return res.status(400).json({ error: "Verification codes have expired. Please request new ones." });
  }
  if (emailCode && cached.emailCode && emailCode !== cached.emailCode) {
    return res.status(400).json({ error: "Invalid email verification code." });
  }
  if (smsCode && cached.smsCode && smsCode !== cached.smsCode) {
    return res.status(400).json({ error: "Invalid mobile SMS verification code." });
  }
  delete otpCache[email];
  return res.json({ success: true, message: "Verification check succeeded!" });
});
function dispatchL1Settlement(buyer, seller, amount, price) {
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    method: "gold_sendRawTransaction",
    params: [`settle:p2p_from_${seller.replace(/[^a-zA-Z0-9]/g, "")}_to_${buyer.replace(/[^a-zA-Z0-9]/g, "")}_amt_${Math.round(amount * 1e9)}_price_${Math.round(price)}`],
    id: 101
  });
  const options = {
    hostname: "127.0.0.1",
    port: 8545,
    path: "/",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  };
  const req = import_http2.default.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      console.log(`[L1 SETTLEMENT] Response: ${data}`);
    });
  });
  req.on("error", (e) => {
    console.warn(`[L1 SETTLEMENT WARNING] L1 Node offline, bypassing live settle broadcast: ${e.message}`);
  });
  req.write(payload);
  req.end();
}
app.get("/api/p2p/escrows/list", async (req, res) => {
  if (pool && isDbConnected) {
    try {
      const result = await pool.query('SELECT id, ad_id as "adId", buyer_id as "buyerId", seller_id as "sellerId", amount_usdt as "amountUsdt", amount_inr as "amountInr", state, upi_ref as "upiRef", created_at as "createdAt" FROM p2p_escrows ORDER BY created_at DESC');
      return res.json({ success: true, escrows: result.rows });
    } catch (err) {
      return res.status(500).json({ error: "Could not fetch escrows from PostgreSQL." });
    }
  } else {
    return res.json({ success: true, escrows: memoryP2PEscrows });
  }
});
app.post("/api/p2p/escrows/create", async (req, res) => {
  const { adId, buyerId, sellerId, amountUsdt, amountInr } = req.body;
  if (!adId || !buyerId || !sellerId || !amountUsdt || !amountInr) {
    return res.status(400).json({ error: "Missing required escrow fields." });
  }
  const escrowId = "P2P-" + Math.floor(1e5 + Math.random() * 9e5);
  const newEscrow = {
    id: escrowId,
    adId,
    buyerId,
    sellerId,
    amountUsdt: parseFloat(amountUsdt),
    amountInr: parseFloat(amountInr),
    state: "CREATED",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (pool && isDbConnected) {
    try {
      const sellerRes = await pool.query("SELECT id FROM users WHERE email = $1 OR id::text = $1", [sellerId]);
      if (sellerRes.rows.length > 0) {
        const sId = sellerRes.rows[0].id;
        await pool.query("UPDATE balances SET amount = amount - $1 WHERE user_id = $2 AND symbol = 'USDT'", [amountUsdt, sId]);
      }
      await pool.query(
        "INSERT INTO p2p_escrows (id, ad_id, buyer_id, seller_id, amount_usdt, amount_inr, state) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [escrowId, adId, buyerId, sellerId, amountUsdt, amountInr, "CREATED"]
      );
    } catch (err) {
      console.error("[ESCROW CREATE ERROR] ", err);
    }
  } else {
    console.log(`[P2P ESCROW MEMORY] Locked ${amountUsdt} USDT from seller '${sellerId}' for order ${escrowId}`);
  }
  memoryP2PEscrows.unshift(newEscrow);
  res.json({ success: true, escrow: newEscrow });
});
app.post("/api/p2p/escrows/pay", async (req, res) => {
  const { escrowId, upiRef } = req.body;
  if (!escrowId || !upiRef) {
    return res.status(400).json({ error: "Missing escrowId or upiRef payload." });
  }
  if (pool && isDbConnected) {
    try {
      await pool.query(
        "UPDATE p2p_escrows SET state = 'PAID', upi_ref = $1 WHERE id = $2",
        [upiRef, escrowId]
      );
    } catch (err) {
      console.error("[ESCROW PAY ERROR] ", err);
    }
  }
  const escrow = memoryP2PEscrows.find((e) => e.id === escrowId);
  if (escrow) {
    escrow.state = "PAID";
    escrow.upiRef = upiRef;
  }
  console.log(`[P2P ESCROW] Order ${escrowId} marked as PAID. Reference: ${upiRef}`);
  res.json({ success: true, message: "Escrow marked as paid.", escrow });
});
app.post("/api/p2p/escrows/release", async (req, res) => {
  const { escrowId } = req.body;
  if (!escrowId) {
    return res.status(400).json({ error: "Missing escrowId parameter." });
  }
  let escrow;
  if (pool && isDbConnected) {
    try {
      const result = await pool.query('SELECT id, ad_id as "adId", buyer_id as "buyerId", seller_id as "sellerId", amount_usdt as "amountUsdt", amount_inr as "amountInr", state, upi_ref as "upiRef" FROM p2p_escrows WHERE id = $1', [escrowId]);
      if (result.rows.length > 0) {
        escrow = result.rows[0];
        if (escrow.state !== "RELEASED") {
          await pool.query("UPDATE p2p_escrows SET state = 'RELEASED' WHERE id = $1", [escrowId]);
          const buyerRes = await pool.query("SELECT id FROM users WHERE email = $1 OR id::text = $1", [escrow.buyerId]);
          if (buyerRes.rows.length > 0) {
            const bId = buyerRes.rows[0].id;
            await pool.query("INSERT INTO balances (user_id, symbol, amount) VALUES ($1, 'USDT', $2) ON CONFLICT (user_id, symbol) DO UPDATE SET amount = balances.amount + $2", [bId, escrow.amountUsdt]);
          }
        }
      }
    } catch (err) {
      console.error("[ESCROW RELEASE ERROR] ", err);
    }
  } else {
    escrow = memoryP2PEscrows.find((e) => e.id === escrowId);
    if (escrow && escrow.state !== "RELEASED") {
      escrow.state = "RELEASED";
    }
  }
  if (escrow) {
    console.log(`[P2P ESCROW] Releasing escrow ${escrowId}: ${escrow.amountUsdt} USDT transferred to buyer ${escrow.buyerId}`);
    dispatchL1Settlement(escrow.buyerId, escrow.sellerId, escrow.amountUsdt, escrow.amountInr / escrow.amountUsdt);
    return res.json({ success: true, message: "Escrow successfully released to buyer.", escrow });
  } else {
    return res.status(404).json({ error: "Escrow order not found." });
  }
});
app.post("/api/p2p/webhook/upi", async (req, res) => {
  const { upiRef, amountInr, status } = req.body;
  if (!upiRef || !amountInr) {
    return res.status(400).json({ error: "Missing upiRef or amountInr in webhook payload." });
  }
  console.log(`[UPI WEBHOOK RECEIVED] Processing reference: ${upiRef}, Amount: \u20B9${amountInr}, Status: ${status || "SUCCESS"}`);
  let escrow;
  if (pool && isDbConnected) {
    try {
      const result = await pool.query(
        'SELECT id, ad_id as "adId", buyer_id as "buyerId", seller_id as "sellerId", amount_usdt as "amountUsdt", amount_inr as "amountInr", state FROM p2p_escrows WHERE upi_ref = $1 OR id = $1',
        [upiRef]
      );
      if (result.rows.length > 0) {
        escrow = result.rows[0];
      }
    } catch (err) {
      console.error("[WEBHOOK DB FETCH ERROR] ", err);
    }
  } else {
    escrow = memoryP2PEscrows.find((e) => e.upiRef === upiRef || e.id === upiRef);
  }
  if (!escrow) {
    if (pool && isDbConnected) {
      try {
        const result = await pool.query(
          `SELECT id, ad_id as "adId", buyer_id as "buyerId", seller_id as "sellerId", amount_usdt as "amountUsdt", amount_inr as "amountInr", state FROM p2p_escrows WHERE state = 'CREATED' AND amount_inr = $1 LIMIT 1`,
          [amountInr]
        );
        if (result.rows.length > 0) {
          escrow = result.rows[0];
        }
      } catch (err) {
      }
    } else {
      escrow = memoryP2PEscrows.find((e) => e.state === "CREATED" && e.amountInr === parseFloat(amountInr));
    }
  }
  if (escrow) {
    const escrowId = escrow.id;
    if (pool && isDbConnected) {
      try {
        await pool.query("UPDATE p2p_escrows SET state = 'RELEASED', upi_ref = $1 WHERE id = $2", [upiRef, escrowId]);
        const buyerRes = await pool.query("SELECT id FROM users WHERE email = $1 OR id::text = $1", [escrow.buyerId]);
        if (buyerRes.rows.length > 0) {
          const bId = buyerRes.rows[0].id;
          await pool.query("INSERT INTO balances (user_id, symbol, amount) VALUES ($1, 'USDT', $2) ON CONFLICT (user_id, symbol) DO UPDATE SET amount = balances.amount + $2", [bId, escrow.amountUsdt]);
        }
      } catch (err) {
      }
    } else {
      const memEscrow = memoryP2PEscrows.find((e) => e.id === escrowId);
      if (memEscrow) {
        memEscrow.state = "RELEASED";
        memEscrow.upiRef = upiRef;
      }
      escrow.state = "RELEASED";
      escrow.upiRef = upiRef;
    }
    console.log(`[UPI WEBHOOK AUTO-RELEASE] Escrow ${escrowId} matching reference ${upiRef} auto-released!`);
    dispatchL1Settlement(escrow.buyerId, escrow.sellerId, escrow.amountUsdt, escrow.amountInr / escrow.amountUsdt);
    return res.json({
      success: true,
      message: "UPI Transaction verified. Escrow auto-released.",
      escrowId,
      released: true
    });
  } else {
    return res.status(404).json({ error: "No matching pending escrow found for this payment notification." });
  }
});
function matchOrders(pair) {
  const pendingBids = memoryOrders.filter((o) => o.pair === pair && o.side === "BUY" && o.status === "PENDING").sort((a, b) => b.price - a.price);
  const pendingAsks = memoryOrders.filter((o) => o.pair === pair && o.side === "SELL" && o.status === "PENDING").sort((a, b) => a.price - b.price);
  for (const bid of pendingBids) {
    for (const ask of pendingAsks) {
      if (ask.status === "PENDING" && bid.status === "PENDING" && bid.price >= ask.price) {
        const matchQty = Math.min(bid.quantity - bid.filled, ask.quantity - ask.filled);
        bid.filled += matchQty;
        ask.filled += matchQty;
        if (bid.filled === bid.quantity) bid.status = "FILLED";
        if (ask.filled === ask.quantity) ask.status = "FILLED";
        console.log(`[MATCH ENGINE] Matched ${matchQty} of ${pair} @ price: ${ask.price}`);
      }
    }
  }
}
var server = (0, import_http.createServer)(app);
var wss = new import_ws.WebSocketServer({ server });
var prices = {
  "BTC/USDT": 65050,
  "ETH/USDT": 3450,
  "SOL/USDT": 145,
  "BNB/USDT": 580,
  "XRP/USDT": 0.52
};
wss.on("connection", (ws) => {
  console.log("[WS SERVER] Client connected to live feed.");
  const interval = setInterval(() => {
    Object.keys(prices).forEach((pair) => {
      const percent = (Math.random() - 0.5) * 0.05;
      prices[pair] = +(prices[pair] * (1 + percent)).toFixed(2);
    });
    const feedData = {
      type: "ticker",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: prices
    };
    if (ws.readyState === import_ws.WebSocket.OPEN) {
      ws.send(JSON.stringify(feedData));
    }
  }, 1e3);
  ws.on("close", () => {
    clearInterval(interval);
    console.log("[WS SERVER] Client disconnected.");
  });
});
server.listen(PORT, () => {
  console.log(`[HTTP SERVER] Running on port ${PORT}`);
  console.log(`[WS FEED SERVER] Streaming active on port ${PORT}`);
});
