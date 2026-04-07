// ──────────────────────────────────────────────
// SavedCampaign Model — Data access for 'saved_campaigns'
// ──────────────────────────────────────────────

import pool from "../config/db.js";

/**
 * Save a campaign for a user (bookmark).
 */
export const save = async (userId, campaignId) => {
  const { rows } = await pool.query(
    `INSERT INTO saved_campaigns (user_id, campaign_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, campaign_id) DO NOTHING
     RETURNING *`,
    [userId, campaignId]
  );
  return rows[0];
};

/**
 * Remove a saved campaign for a user (unbookmark).
 */
export const unsave = async (userId, campaignId) => {
  const { rowCount } = await pool.query(
    `DELETE FROM saved_campaigns WHERE user_id = $1 AND campaign_id = $2`,
    [userId, campaignId]
  );
  return rowCount > 0;
};

/**
 * Get all saved campaigns for a user (with campaign details).
 */
export const getByUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT sc.id AS saved_id, sc.created_at AS saved_at,
            c.id, c.title, c.description, c.category, c.target_amount,
            c.current_amount AS amount_raised,
            CASE
              WHEN c.target_amount > 0 THEN LEAST(
                ROUND((c.current_amount::numeric / c.target_amount::numeric) * 100),
                100
              )::int
              ELSE 0
            END AS funded_percent,
            c.image_url, c.status, c.created_at,
            u.name AS creator_name
     FROM saved_campaigns sc
     JOIN campaigns c ON sc.campaign_id = c.id
     JOIN users u ON c.porteur_id = u.id
     WHERE sc.user_id = $1
     ORDER BY sc.created_at DESC`,
    [userId]
  );
  return rows;
};

/**
 * Check if a campaign is saved by a user.
 */
export const isSaved = async (userId, campaignId) => {
  const { rows } = await pool.query(
    `SELECT id FROM saved_campaigns WHERE user_id = $1 AND campaign_id = $2`,
    [userId, campaignId]
  );
  return rows.length > 0;
};
