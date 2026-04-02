// ──────────────────────────────────────────────
// User Model — Data access layer for the 'users' table
// ──────────────────────────────────────────────

import pool from "../config/db.js";

/**
 * Find a user by their email address.
 * @param {string} email
 * @returns {object|null} The user row or null
 */
export const findByEmail = async (email) => {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  return rows[0] || null;
};

/**
 * Create a new user in the database.
 * @param {string} name
 * @param {string} email
 * @param {string} passwordHash  — already hashed
 * @returns {object} The newly created user row (without password_hash)
 */
export const create = async (name, email, passwordHash) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash]
  );
  return rows[0];
};

/**
 * Find a user by their ID.
 */
export const findById = async (id) => {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE id = $1",
    [id]
  );
  return rows[0] || null;
};

/**
 * Update a user's name, email, bio, and/or avatar.
 */
export const updateProfile = async (id, { name, email, bio, avatar }) => {
  const setClauses = [];
  const values = [];
  let i = 1;

  if (name !== undefined) { setClauses.push(`name = $${i}`); values.push(name); i++; }
  if (email !== undefined) { setClauses.push(`email = $${i}`); values.push(email); i++; }
  if (bio !== undefined) { setClauses.push(`bio = $${i}`); values.push(bio); i++; }
  if (avatar !== undefined) { setClauses.push(`avatar = $${i}`); values.push(avatar); i++; }

  if (setClauses.length === 0) return findById(id);

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${i}
     RETURNING id, name, email, role, bio, avatar, created_at`,
    values
  );
  return rows[0] || null;
};

/**
 * Update a user's password hash.
 */
export const updatePassword = async (id, newHash) => {
  const { rows } = await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, name, email, role`,
    [newHash, id]
  );
  return rows[0] || null;
};
