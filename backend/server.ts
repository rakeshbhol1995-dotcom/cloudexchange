import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import { Pool } from "pg";
import crypto from "crypto";

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
