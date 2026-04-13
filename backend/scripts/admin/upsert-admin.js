import "dotenv/config";
import bcrypt from "bcrypt";

import pool from "../../src/config/db.js";

const readArg = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const email = readArg("--email") || process.env.ADMIN_EMAIL;
const password = readArg("--password") || process.env.ADMIN_PASSWORD;
const name = readArg("--name") || process.env.ADMIN_NAME || "Admin Hive";

if (!email || !password) {
  console.error("Usage: node scripts/admin/upsert-admin.js --email admin@example.com --password secret [--name \"Admin Hive\"]");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);

const { rows } = await pool.query(
  `INSERT INTO users (name, email, password_hash, role)
   VALUES ($1, $2, $3, 'ADMIN')
   ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         role = 'ADMIN'
   RETURNING id, name, email, role`,
  [name, String(email).trim().toLowerCase(), passwordHash]
);

console.log("Admin upserted:", JSON.stringify(rows[0]));
process.exit(0);
