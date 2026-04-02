// ──────────────────────────────────────────────
// Campaign Model — Data access layer for 'campaigns'
// ──────────────────────────────────────────────

import pool from "../config/db.js";

/**
 * Create a new draft campaign for a given user.
 * @param {string} porteurId — UUID of the authenticated user
 * @param {object} data — { title, description, category, target_amount }
 * @returns {object} The newly created campaign row
 */
export const create = async (porteurId, { title, description, category, target_amount }) => {
  const { rows } = await pool.query(
    `INSERT INTO campaigns (porteur_id, title, description, category, target_amount, status)
     VALUES ($1, $2, $3, $4, $5, 'DRAFT')
     RETURNING id, porteur_id, title, description, category, target_amount, status, rewards, created_at`,
    [porteurId, title, description, category, target_amount]
  );
  return rows[0];
};

/**
 * Find a campaign by its ID.
 * @param {string} id — UUID
 * @returns {object|null}
 */
export const findById = async (id) => {
  const { rows } = await pool.query(
    "SELECT * FROM campaigns WHERE id = $1",
    [id]
  );
  return rows[0] || null;
};

/**
 * Find all campaigns belonging to a specific user.
 * @param {string} porteurId — UUID
 * @returns {Array}
 */
export const findByPorteur = async (porteurId) => {
  const { rows } = await pool.query(
    "SELECT * FROM campaigns WHERE porteur_id = $1 ORDER BY created_at DESC",
    [porteurId]
  );
  return rows;
};

/**
 * Get all public (ACTIVE) campaigns.
 * @returns {Array}
 */
export const findAllActive = async () => {
  const { rows } = await pool.query(
    "SELECT * FROM campaigns WHERE status = 'ACTIVE' ORDER BY created_at DESC"
  );
  return rows;
};

/**
 * Update a campaign's editable fields.
 * Only updates the fields that are provided (partial update).
 * @param {string} id — Campaign UUID
 * @param {object} fields — Any subset of { title, description, category, target_amount }
 * @returns {object} The updated campaign row
 */
export const update = async (id, fields) => {
  // Whitelist of columns that can be updated
  const allowed = ["title", "description", "category", "target_amount", "rewards", "image_url", "video_url"];
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
      values.push(fields[key]);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return findById(id);

  values.push(id); // last param is the WHERE id

  const { rows } = await pool.query(
    `UPDATE campaigns
     SET ${setClauses.join(", ")}
     WHERE id = $${paramIndex}
     RETURNING id, porteur_id, title, description, category, target_amount, status, rewards, created_at, updated_at`,
    values
  );
  return rows[0] || null;
};

/**
 * Update a campaign's status.
 * @param {string} id — Campaign UUID
 * @param {string} newStatus — One of the campaign_status enum values
 * @returns {object|null} The updated campaign row
 */
export const updateStatus = async (id, newStatus) => {
  const { rows } = await pool.query(
    `UPDATE campaigns
     SET status = $1
     WHERE id = $2
     RETURNING id, porteur_id, title, description, category, target_amount, status, rewards, created_at, updated_at`,
    [newStatus, id]
  );
  return rows[0] || null;
};
