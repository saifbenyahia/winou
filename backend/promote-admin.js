import "dotenv/config";
import pool from "./src/config/db.js";

// Promote smoke2@test.com to ADMIN for testing
const { rows } = await pool.query(
  `UPDATE users SET role = 'ADMIN' WHERE email = 'smoke2@test.com' RETURNING id, name, email, role`
);
console.log("Promoted:", JSON.stringify(rows[0]));

// List all users
const all = await pool.query("SELECT id, name, email, role FROM users");
console.log("All users:", JSON.stringify(all.rows));

process.exit(0);
