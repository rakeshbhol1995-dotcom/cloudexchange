const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Load .env
const envPath = path.join(__dirname, ".env");
console.log("Loading .env from:", envPath);
try {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach(line => {
    const parts = line.split("=");
    if (parts.length >= 2 && !parts[0].trim().startsWith("#")) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^"(.*)"$/, "$1");
      process.env[key] = val;
    }
  });
} catch (e) {
  console.error("Error reading env:", e);
}

const dbUrl = process.env.DATABASE_URL;
console.log("Database URL:", dbUrl);

if (!dbUrl) {
  console.log("No DATABASE_URL found.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  connectionTimeoutMillis: 5000 // 5 seconds timeout
});

console.log("Connecting to database...");
pool.connect((err, client, release) => {
  if (err) {
    console.error("Database connection failed!", err);
    process.exit(1);
  }
  console.log("Database connection successful!");
  client.query("SELECT NOW()", (err, result) => {
    release();
    if (err) {
      console.error("Query failed:", err);
    } else {
      console.log("Database query result:", result.rows[0]);
    }
    process.exit(0);
  });
});
