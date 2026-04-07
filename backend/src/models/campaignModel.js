// ──────────────────────────────────────────────
// Campaign Model — Data access layer for 'campaigns'
// ──────────────────────────────────────────────

import pool from "../config/db.js";

const fundingStatsSelect = `
  c.current_amount::int AS current_amount,
  c.current_amount::int AS amount_raised,
  COALESCE(fs.backer_count, 0)::int AS backer_count,
  COALESCE(fs.paid_donation_count, 0)::int AS paid_donation_count,
  CASE
    WHEN c.target_amount > 0 THEN LEAST(
      ROUND((c.current_amount::numeric / c.target_amount::numeric) * 100),
      100
    )::int
    ELSE 0
  END AS funded_percent
`;

const fundingStatsJoin = `
  LEFT JOIN (
    SELECT
      combined.campaign_id,
      COUNT(*)::int AS backer_count,
      COUNT(*) FILTER (WHERE combined.source = 'DONATION')::int AS paid_donation_count
    FROM (
      SELECT campaign_id, 'PLEDGE'::text AS source
      FROM pledges
      WHERE status = 'SUCCESS'

      UNION ALL

      SELECT campaign_id, 'DONATION'::text AS source
      FROM donations
      WHERE status = 'PAID'
    ) combined
    GROUP BY combined.campaign_id
  ) fs ON fs.campaign_id = c.id
`;

/**
 * Create a new draft campaign for a given user.
 * @param {string} porteurId — UUID of the authenticated user
 * @param {object} data — { title, description, category, target_amount, rewards, story }
 * @returns {object} The newly created campaign row
 */
export const create = async (porteurId, { title, description, category, target_amount, rewards, story }) => {
  const { rows } = await pool.query(
    `INSERT INTO campaigns (porteur_id, title, description, category, target_amount, rewards, story, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT')
     RETURNING id, porteur_id, title, description, category, target_amount, current_amount, rewards, story, status, created_at`,
    [porteurId, title, description, category, target_amount, rewards, story]
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
    `SELECT c.*, u.name AS creator_name, u.email AS creator_email,
            ${fundingStatsSelect}
     FROM campaigns c
     JOIN users u ON c.porteur_id = u.id
     ${fundingStatsJoin}
     WHERE c.id = $1`,
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
    `SELECT c.*, ${fundingStatsSelect}
     FROM campaigns c
     ${fundingStatsJoin}
     WHERE c.porteur_id = $1
     ORDER BY c.created_at DESC`,
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
    `SELECT c.*, u.name AS creator_name, u.email AS creator_email,
            ${fundingStatsSelect}
     FROM campaigns c
     JOIN users u ON c.porteur_id = u.id
     ${fundingStatsJoin}
     WHERE c.status = 'ACTIVE'
     ORDER BY c.created_at DESC`
  );
  return rows;
};

/**
 * Update a campaign's editable fields.
 * Only updates the fields that are provided (partial update).
 * @param {string} id — Campaign UUID
 * @param {object} fields — Any subset of { title, description, category, target_amount, rewards, story }
 * @returns {object} The updated campaign row
 */
export const update = async (id, fields) => {
  // Whitelist of columns that can be updated
  const allowed = ["title", "description", "category", "target_amount", "rewards", "story", "image_url", "video_url"];
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
     RETURNING id, porteur_id, title, description, category, target_amount, current_amount, status, rewards, story, image_url, video_url, created_at, updated_at`,
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
     RETURNING id, porteur_id, title, description, category, target_amount, current_amount, status, rewards, story, image_url, video_url, created_at, updated_at`,
    [newStatus, id]
  );
  return rows[0] || null;
};

/**
 * Delete a draft campaign owned by the given creator.
 * @param {string} id - Campaign UUID
 * @param {string} porteurId - Creator UUID
 * @returns {object|null}
 */
export const deleteDraftByOwner = async (id, porteurId) => {
  const { rows } = await pool.query(
    `DELETE FROM campaigns
     WHERE id = $1
       AND porteur_id = $2
       AND status = 'DRAFT'
     RETURNING id, title, status`,
    [id, porteurId]
  );
  return rows[0] || null;
};
