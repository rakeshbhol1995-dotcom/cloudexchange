import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import { Pool } from "pg";
import crypto from "crypto";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// Native .env file loader for zero-dependency local configuration
try {
  const envPath = path.join(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
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

// In-Memory Security OTP Cache
interface OtpEntry {
  emailCode?: string;
  smsCode?: string;
  expiresAt: number;
}
const otpCache: Record<string, OtpEntry> = {};


const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// 1. PostgreSQL Database Setup
// ----------------------------------------------------
const dbUrl = process.env.DATABASE_URL;
let pool: Pool | null = null;
let isDbConnected = false;

if (dbUrl) {
  try {
    pool = new Pool({
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

// Auto-run schema migrations on startup if connected to Postgres
const initializeDatabase = async () => {
  if (!pool) return;
  try {
    const client = await pool.connect();
    isDbConnected = true;
    console.log("[DATABASE] Successfully connected to PostgreSQL!");

    // Create tables if they do not exist
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
    `);
    console.log("[DATABASE] Table schemas verified/migrated.");
    client.release();
  } catch (err) {
    isDbConnected = false;
    console.error("[DATABASE] Error connecting to PostgreSQL / running migrations: ", err);
  }
};

initializeDatabase();

// In-Memory Storage Fallbacks
const memoryUsers: any[] = [];
const memoryBalances: Record<string, any[]> = {};
const memoryOrders: any[] = [];

interface P2PEscrow {
  id: string;
  adId: string;
  buyerId: string;
  sellerId: string;
  amountUsdt: number;
  amountInr: number;
  state: "CREATED" | "PAID" | "RELEASED" | "DISPUTED";
  upiRef?: string;
  createdAt: string;
}
const memoryP2PEscrows: P2PEscrow[] = [];

const p2pAds: any[] = [
  { id: "ad-1", seller: "TitanOTC", orders: 1845, completion: 99.2, rate: 89.42, available: 15400, minLimit: 10000, maxLimit: 500000, payments: ["UPI", "IMPS"] },
  { id: "ad-2", seller: "Alpha_Liquidity", orders: 954, completion: 98.7, rate: 89.48, available: 42000, minLimit: 20000, maxLimit: 1500000, payments: ["IMPS", "Bank Transfer"] },
  { id: "ad-3", seller: "CryptoEscrow_Desk", orders: 3412, completion: 99.8, rate: 89.50, available: 8500, minLimit: 5000, maxLimit: 750000, payments: ["UPI", "PhonePe"] },
  { id: "ad-4", seller: "DeltaMerchant", orders: 421, completion: 95.4, rate: 89.55, available: 12000, minLimit: 10000, maxLimit: 1000000, payments: ["UPI", "GPay"] },
];

// Helper to hash password securely
const hashPassword = (password: string) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

// ----------------------------------------------------
// 2. REST API Endpoints
// ----------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    databaseConnected: isDbConnected,
    timestamp: new Date().toISOString(),
    matchingEngine: "active"
  });
});

// Admin Authentication Login
app.post("/api/admin/auth/login", (req, res) => {
  const { password, totp } = req.body;
  if (password === "exchange_admin_2026" && totp === "125983") {
    return res.json({ success: true, token: "admin-jwt-token-2026-supersecret" });
  } else {
    return res.status(401).json({ error: "Invalid admin password or TOTP security key." });
  }
});

// Authentication: Register
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password credentials." });
  }

  const passwordHash = hashPassword(password);

  if (pool && isDbConnected) {
    try {
      // Check if user exists
      const userCheck = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
      if (userCheck.rows.length > 0) {
        return res.status(400).json({ error: "User already registered." });
      }

      // Create user
      const result = await pool.query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
        [email, passwordHash]
      );
      const userId = result.rows[0].id;

      // Seed initial balances (USDT, BTC, ETH, SOL, BNB)
      const defaultAssets = [
        { sym: "USDT", qty: 15740.50 },
        { sym: "BTC", qty: 0.2450 },
        { sym: "ETH", qty: 2.8500 },
        { sym: "SOL", qty: 15.40 },
        { sym: "BNB", qty: 4.80 }
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
    // In-Memory fallback
    const exists = memoryUsers.some(u => u.email === email);
    if (exists) {
      return res.status(400).json({ error: "User already registered in sandbox." });
    }
    const userId = "usr-" + Math.floor(1000 + Math.random() * 9000);
    memoryUsers.push({ id: userId, email, passwordHash });
    
    // Seed in-memory balances
    memoryBalances[userId] = [
      { symbol: "USDT", amount: 15740.50, inOrder: 0.00 },
      { symbol: "BTC", amount: 0.2450, inOrder: 0.00 },
      { symbol: "ETH", amount: 2.8500, inOrder: 0.00 },
      { symbol: "SOL", amount: 15.40, inOrder: 0.00 },
      { symbol: "BNB", amount: 4.80, inOrder: 0.00 }
    ];

    return res.json({ success: true, message: "User registered in sandbox store.", userId });
  }
});

// Authentication: Login
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

      // Fetch user balances to sync with localstorage
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
    // In-memory fallback
    const user = memoryUsers.find(u => u.email === email && u.passwordHash === passwordHash);
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

// Balances: Get or Sync
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

// Orderbook Management
app.post("/api/orders/create", async (req, res) => {
  const { userId, pair, side, price, quantity, type } = req.body;
  const newOrder = {
    id: "ord-" + Math.floor(100000 + Math.random() * 900000),
    pair,
    side,
    price: parseFloat(price),
    quantity: parseFloat(quantity),
    type,
    filled: 0,
    status: "PENDING",
    timestamp: new Date().toISOString()
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

  // Trigger order matching engine cycle
  matchOrders(pair);

  res.json({ success: true, order: newOrder });
});

app.get("/api/orders/list", (req, res) => {
  res.json({ success: true, orders: memoryOrders });
});

// P2P Marketplace
app.get("/api/p2p/ads", (req, res) => {
  res.json({ success: true, ads: p2pAds });
});

app.post("/api/p2p/post-ad", (req, res) => {
  const { seller, rate, available, minLimit, maxLimit, payments } = req.body;
  const newAd = {
    id: "ad-" + Math.floor(10000 + Math.random() * 90000),
    seller: seller || "MerchantUser",
    orders: 0,
    completion: 100.0,
    rate: parseFloat(rate),
    available: parseFloat(available),
    minLimit: parseFloat(minLimit),
    maxLimit: parseFloat(maxLimit),
    payments: payments || ["UPI"]
  };
  p2pAds.unshift(newAd);
  res.json({ success: true, ad: newAd });
});

// ----------------------------------------------------
// Security OTP Integration (SMS & Email OTPs)
// ----------------------------------------------------
app.post("/api/security/send-email-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email address is required." });
  }

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5-minute expiry

  // Store in cache
  if (!otpCache[email]) {
    otpCache[email] = { expiresAt };
  }
  otpCache[email].emailCode = code;
  otpCache[email].expiresAt = expiresAt;

  console.log(`[SECURITY EMAIL OTP] Generated ${code} for ${email}`);

  // Transporter config - Fallback to mock nodemailer transporter if SMTP credentials are missing
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.EMAIL_PORT || "587");
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });

      await transporter.sendMail({
        from: '"CloudExchange Security" <no-reply@cloudexchange.in>',
        to: email,
        subject: "🔒 Security Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; background: #060913; color: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid rgba(245, 166, 35, 0.15); max-width: 500px;">
            <h2 style="color: #f5a623; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px;">CloudExchange Secure Verification</h2>
            <p>Your one-time security authentication OTP is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #00f0ff; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px dashed rgba(0,240,255,0.3);">${code}</div>
            <p style="font-size: 12px; color: #94a3b8;">This code is valid for 5 minutes. If you did not request this code, please ignore this email.</p>
          </div>
        `
      });
      console.log(`[SECURITY EMAIL OTP] Sent to ${email} via SMTP.`);
      return res.json({ success: true, message: "Verification OTP sent to your email." });
    } catch (err) {
      console.error("[SECURITY EMAIL OTP ERROR] SMTP delivery failed, falling back to mock: ", err);
    }
  }

  // Sandbox/Mock success response
  return res.json({ 
    success: true, 
    message: "Verification OTP dispatched (Sandbox Mock). Check node logs.",
    sandbox: true,
    code 
  });
});

app.post("/api/security/send-sms-otp", async (req, res) => {
  const { email, phoneNumber } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email/User identification is required." });
  }

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5-minute expiry

  // Store in cache
  if (!otpCache[email]) {
    otpCache[email] = { expiresAt };
  }
  otpCache[email].smsCode = code;
  otpCache[email].expiresAt = expiresAt;

  console.log(`[SECURITY SMS OTP] Generated ${code} for mobile associated with ${email}`);

  // Integrate Fast2SMS / MSG91 API if API key is present in environment
  const smsApiKey = process.env.SMS_API_KEY;
  if (smsApiKey && phoneNumber) {
    try {
      // Clean up phone number
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      // Fast2SMS API integration example:
      const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${smsApiKey}&variables_values=${code}&route=otp&numbers=${cleanPhone}`);
      const data = await response.json();
      console.log(`[SECURITY SMS OTP] Fast2SMS dispatch result:`, data);
      return res.json({ success: true, message: "Verification OTP sent to your phone via SMS." });
    } catch (err) {
      console.error("[SECURITY SMS OTP ERROR] Fast2SMS API call failed, falling back to mock: ", err);
    }
  }

  return res.json({ 
    success: true, 
    message: "Verification OTP dispatched (Sandbox Mock). Check node logs.",
    sandbox: true,
    code 
  });
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

  // Clean cache on success
  delete otpCache[email];
  return res.json({ success: true, message: "Verification check succeeded!" });
});

// ----------------------------------------------------
// P2P Escrow & UPI Webhook Integration
// ----------------------------------------------------
import http from "http";

function dispatchL1Settlement(buyer: string, seller: string, amount: number, price: number) {
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    method: "gold_sendRawTransaction",
    params: [`settle:p2p_from_${seller.replace(/[^a-zA-Z0-9]/g, "")}_to_${buyer.replace(/[^a-zA-Z0-9]/g, "")}_amt_${Math.round(amount * 1_000_000_000)}_price_${Math.round(price)}`],
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

  const req = http.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => { data += chunk; });
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
      const result = await pool.query("SELECT id, ad_id as \"adId\", buyer_id as \"buyerId\", seller_id as \"sellerId\", amount_usdt as \"amountUsdt\", amount_inr as \"amountInr\", state, upi_ref as \"upiRef\", created_at as \"createdAt\" FROM p2p_escrows ORDER BY created_at DESC");
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

  const escrowId = "P2P-" + Math.floor(100000 + Math.random() * 900000);
  const newEscrow: P2PEscrow = {
    id: escrowId,
    adId,
    buyerId,
    sellerId,
    amountUsdt: parseFloat(amountUsdt),
    amountInr: parseFloat(amountInr),
    state: "CREATED",
    createdAt: new Date().toISOString()
  };

  // Lock USDT from seller
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

  const escrow = memoryP2PEscrows.find(e => e.id === escrowId);
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

  let escrow: P2PEscrow | undefined;
  
  if (pool && isDbConnected) {
    try {
      const result = await pool.query("SELECT id, ad_id as \"adId\", buyer_id as \"buyerId\", seller_id as \"sellerId\", amount_usdt as \"amountUsdt\", amount_inr as \"amountInr\", state, upi_ref as \"upiRef\" FROM p2p_escrows WHERE id = $1", [escrowId]);
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
    escrow = memoryP2PEscrows.find(e => e.id === escrowId);
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

  console.log(`[UPI WEBHOOK RECEIVED] Processing reference: ${upiRef}, Amount: ₹${amountInr}, Status: ${status || 'SUCCESS'}`);

  let escrow: P2PEscrow | undefined;

  if (pool && isDbConnected) {
    try {
      const result = await pool.query(
        "SELECT id, ad_id as \"adId\", buyer_id as \"buyerId\", seller_id as \"sellerId\", amount_usdt as \"amountUsdt\", amount_inr as \"amountInr\", state FROM p2p_escrows WHERE upi_ref = $1 OR id = $1", 
        [upiRef]
      );
      if (result.rows.length > 0) {
        escrow = result.rows[0];
      }
    } catch (err) {
      console.error("[WEBHOOK DB FETCH ERROR] ", err);
    }
  } else {
    escrow = memoryP2PEscrows.find(e => e.upiRef === upiRef || e.id === upiRef);
  }

  if (!escrow) {
    if (pool && isDbConnected) {
      try {
        const result = await pool.query(
          "SELECT id, ad_id as \"adId\", buyer_id as \"buyerId\", seller_id as \"sellerId\", amount_usdt as \"amountUsdt\", amount_inr as \"amountInr\", state FROM p2p_escrows WHERE state = 'CREATED' AND amount_inr = $1 LIMIT 1",
          [amountInr]
        );
        if (result.rows.length > 0) {
          escrow = result.rows[0];
        }
      } catch (err) {}
    } else {
      escrow = memoryP2PEscrows.find(e => e.state === "CREATED" && e.amountInr === parseFloat(amountInr));
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
      } catch (err) {}
    } else {
      const memEscrow = memoryP2PEscrows.find(e => e.id === escrowId);
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

// HFT Order Matching Engine Logic
function matchOrders(pair: string) {
  const pendingBids = memoryOrders.filter(o => o.pair === pair && o.side === "BUY" && o.status === "PENDING").sort((a, b) => b.price - a.price);
  const pendingAsks = memoryOrders.filter(o => o.pair === pair && o.side === "SELL" && o.status === "PENDING").sort((a, b) => a.price - b.price);

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

// HTTP Server setup
const server = createServer(app);

// WebSocket Server (Realtime Ticker & Depth Feed)
const wss = new WebSocketServer({ server });

let prices: Record<string, number> = {
  "BTC/USDT": 65050.00,
  "ETH/USDT": 3450.00,
  "SOL/USDT": 145.00,
  "BNB/USDT": 580.00,
  "XRP/USDT": 0.52
};

wss.on("connection", (ws: WebSocket) => {
  console.log("[WS SERVER] Client connected to live feed.");
  
  const interval = setInterval(() => {
    Object.keys(prices).forEach(pair => {
      const percent = (Math.random() - 0.5) * 0.05;
      prices[pair] = +(prices[pair] * (1 + percent)).toFixed(2);
    });

    const feedData = {
      type: "ticker",
      timestamp: new Date().toISOString(),
      data: prices
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(feedData));
    }
  }, 1000);

  ws.on("close", () => {
    clearInterval(interval);
    console.log("[WS SERVER] Client disconnected.");
  });
});

server.listen(PORT, () => {
  console.log(`[HTTP SERVER] Running on port ${PORT}`);
  console.log(`[WS FEED SERVER] Streaming active on port ${PORT}`);
});
