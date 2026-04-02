// ──────────────────────────────────────────────
// Database Connection — PostgreSQL via 'pg' Pool
// Credentials are pulled exclusively from .env
// ──────────────────────────────────────────────

import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Verify the connection on startup
pool.query("SELECT NOW()")
  .then(() => console.log("✅ PostgreSQL connected successfully"))
  .catch((err) => {
    console.error("❌ PostgreSQL connection failed:", err.message);
    process.exit(1);
  });

export default pool;
