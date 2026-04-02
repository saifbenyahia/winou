// ──────────────────────────────────────────────
// Admin Model — Aggregate queries for KPIs
// ──────────────────────────────────────────────

import pool from "../config/db.js";

/**
 * Get platform-wide KPI statistics.
 */
export const getStats = async () => {
  const [
    campaignStats,
    userCount,
    categoryBreakdown,
  ] = await Promise.all([
    // Campaign counts by status + total funding target
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'ACTIVE')   AS active_campaigns,
        COUNT(*) FILTER (WHERE status = 'CLOSED')   AS closed_campaigns,
        COUNT(*) FILTER (WHERE status = 'PENDING')  AS pending_campaigns,
        COUNT(*) FILTER (WHERE status = 'DRAFT')    AS draft_campaigns,
        COUNT(*)                                      AS total_campaigns,
        COALESCE(SUM(target_amount) FILTER (WHERE status IN ('ACTIVE','CLOSED')), 0) AS total_target
      FROM campaigns
    `),

    // Total users
    pool.query(`SELECT COUNT(*) AS total_users FROM users`),

    // Campaigns per category
    pool.query(`
      SELECT category, COUNT(*) AS count
      FROM campaigns
      WHERE status IN ('ACTIVE', 'PENDING', 'CLOSED')
      GROUP BY category
      ORDER BY count DESC
    `),
  ]);

  const cs = campaignStats.rows[0];
  const totalCampaigns = parseInt(cs.active_campaigns) + parseInt(cs.closed_campaigns);
  const successRate = totalCampaigns > 0 ? Math.round((parseInt(cs.closed_campaigns) / totalCampaigns) * 100) : 0;

  return {
    totalFunds: parseInt(cs.total_target) / 1000, // millimes → TND
    activeCampaigns: parseInt(cs.active_campaigns),
    closedCampaigns: parseInt(cs.closed_campaigns),
    pendingCampaigns: parseInt(cs.pending_campaigns),
    draftCampaigns: parseInt(cs.draft_campaigns),
    totalCampaigns: parseInt(cs.total_campaigns),
    successRate,
    totalUsers: parseInt(userCount.rows[0].total_users),
    commissionRate: 0.05,
    categorySplit: categoryBreakdown.rows.map(r => ({
      name: r.category || 'Non catégorisé',
      value: parseInt(r.count),
    })),
  };
};

/**
 * Get all campaigns with PENDING status (for moderation).
 */
export const getPendingCampaigns = async () => {
  const { rows } = await pool.query(`
    SELECT c.id, c.title, c.category, c.target_amount, c.created_at, c.description, c.rewards,
           u.name AS creator_name, u.email AS creator_email
    FROM campaigns c
    JOIN users u ON c.porteur_id = u.id
    WHERE c.status = 'PENDING'
    ORDER BY c.created_at ASC
  `);
  return rows;
};

/**
 * Get all users.
 */
export const getAllUsers = async () => {
  const { rows } = await pool.query(`
    SELECT id, name, email, role, created_at
    FROM users
    ORDER BY created_at DESC
  `);
  return rows;
};

/**
 * Approve a campaign (PENDING → ACTIVE).
 */
export const approveCampaign = async (id) => {
  const { rows } = await pool.query(
    `UPDATE campaigns SET status = 'ACTIVE' WHERE id = $1 AND status = 'PENDING'
     RETURNING id, title, status`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Reject a campaign (PENDING → REJECTED).
 */
export const rejectCampaign = async (id) => {
  const { rows } = await pool.query(
    `UPDATE campaigns SET status = 'REJECTED' WHERE id = $1 AND status = 'PENDING'
     RETURNING id, title, status`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Delete a user and all their campaigns.
 */
export const deleteUser = async (id) => {
  // Delete user's campaigns first (FK constraint)
  await pool.query(`DELETE FROM campaigns WHERE porteur_id = $1`, [id]);
  const { rows } = await pool.query(
    `DELETE FROM users WHERE id = $1 RETURNING id, name, email`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Update a user's role (USER ↔ ADMIN).
 */
export const updateUserRole = async (id, newRole) => {
  const { rows } = await pool.query(
    `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role`,
    [newRole, id]
  );
  return rows[0] || null;
};

/**
 * Update a user's name.
 */
export const updateUserName = async (id, newName) => {
  const { rows } = await pool.query(
    `UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, role`,
    [newName, id]
  );
  return rows[0] || null;
};
