import "dotenv/config";
import bcrypt from "bcrypt";
import pool from "./src/config/db.js";

const hash = await bcrypt.hash("admin", 12);

const { rows } = await pool.query(
  `INSERT INTO users (name, email, password_hash, role)
   VALUES ('Admin Hive', 'admin', $1, 'ADMIN')
   ON CONFLICT (email) DO UPDATE SET password_hash = $1, role = 'ADMIN'
   RETURNING id, name, email, role`,
  [hash]
);

console.log("Admin created:", JSON.stringify(rows[0]));
process.exit(0);
