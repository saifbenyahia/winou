import "dotenv/config";
import pg from "pg";
import { ensureRuntimeSchema } from "./src/config/schemaInit.js";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  await pool.query("SELECT NOW()");
  await ensureRuntimeSchema(pool);
  console.log("Runtime schema initialized successfully.");
} catch (error) {
  console.error("Runtime schema initialization failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
