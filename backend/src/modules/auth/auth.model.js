import pool from '../../config/db.js';

const authUserFields = `
  id,
  name,
  email,
  role,
  bio,
  avatar,
  google_id,
  auth_provider,
  email_verified,
  created_at
`;

export const findByEmail = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
    [normalizedEmail]
  );
  return rows[0] || null;
};

export const findByGoogleId = async (googleId) => {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE google_id = $1',
    [googleId]
  );
  return rows[0] || null;
};

export const create = async (name, email, passwordHash) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, auth_provider, email_verified)
     VALUES ($1, $2, $3, 'local', FALSE)
     RETURNING ${authUserFields}`,
    [name, email.trim().toLowerCase(), passwordHash]
  );
  return rows[0];
};

export const createGoogleUser = async ({ name, email, googleId, avatar, emailVerified }) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, avatar, google_id, auth_provider, email_verified)
     VALUES ($1, $2, NULL, $3, $4, 'google', $5)
     RETURNING ${authUserFields}`,
    [name, email.trim().toLowerCase(), avatar || '', googleId, !!emailVerified]
  );
  return rows[0];
};

export const linkGoogleAccount = async (id, { googleId, avatar, emailVerified }) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET google_id = $1,
         avatar = CASE WHEN COALESCE(NULLIF(avatar, ''), '') = '' THEN $2 ELSE avatar END,
         email_verified = COALESCE($3, email_verified),
         auth_provider = CASE
           WHEN password_hash IS NULL OR password_hash = '' THEN 'google'
           ELSE 'hybrid'
         END
     WHERE id = $4
     RETURNING ${authUserFields}`,
    [googleId, avatar || '', !!emailVerified, id]
  );
  return rows[0] || null;
};

export const findById = async (id) => {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
};

export const updateProfile = async (id, { name, email, bio, avatar }) => {
  const setClauses = [];
  const values = [];
  let i = 1;

  if (name !== undefined) { setClauses.push(`name = $${i}`); values.push(name); i++; }
  if (email !== undefined) { setClauses.push(`email = $${i}`); values.push(email.trim().toLowerCase()); i++; }
  if (bio !== undefined) { setClauses.push(`bio = $${i}`); values.push(bio); i++; }
  if (avatar !== undefined) { setClauses.push(`avatar = $${i}`); values.push(avatar); i++; }

  if (setClauses.length === 0) return findById(id);

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${i}
     RETURNING ${authUserFields}`,
    values
  );
  return rows[0] || null;
};

export const updatePassword = async (id, newHash) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET password_hash = $1,
         auth_provider = CASE
           WHEN google_id IS NOT NULL THEN 'hybrid'
           ELSE 'local'
         END
     WHERE id = $2
     RETURNING ${authUserFields}`,
    [newHash, id]
  );
  return rows[0] || null;
};
