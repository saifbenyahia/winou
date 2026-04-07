import pool from "../config/db.js";

/**
 * Get platform-wide KPI statistics.
 */
export const getStats = async () => {
  const [
    campaignStats,
    userCount,
    categoryBreakdown,
    paymentStats,
    latestPaidDonations,
  ] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_campaigns,
        COUNT(*) FILTER (WHERE status = 'CLOSED') AS closed_campaigns,
        COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_campaigns,
        COUNT(*) FILTER (WHERE status = 'DRAFT') AS draft_campaigns,
        COUNT(*) AS total_campaigns,
        COALESCE(SUM(target_amount) FILTER (WHERE status IN ('ACTIVE', 'CLOSED')), 0) AS total_target
      FROM campaigns
    `),

    pool.query(`SELECT COUNT(*) AS total_users FROM users`),

    pool.query(`
      SELECT category, COUNT(*) AS count
      FROM campaigns
      WHERE status IN ('ACTIVE', 'PENDING', 'CLOSED')
      GROUP BY category
      ORDER BY count DESC
    `),

    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PAID')::int AS total_paid_donations,
        COALESCE(SUM(amount_millimes) FILTER (WHERE status = 'PAID'), 0)::bigint AS total_amount_processed
      FROM donations
    `),

    pool.query(`
      SELECT
        d.id,
        d.amount_millimes,
        d.paid_at,
        donor.name AS donor_name,
        c.id AS campaign_id,
        c.title AS campaign_title
      FROM donations d
      JOIN users donor ON donor.id = d.user_id
      JOIN campaigns c ON c.id = d.campaign_id
      WHERE d.status = 'PAID'
      ORDER BY COALESCE(d.paid_at, d.created_at) DESC
      LIMIT 5
    `),
  ]);

  const cs = campaignStats.rows[0];
  const ps = paymentStats.rows[0];
  const totalCampaigns = parseInt(cs.active_campaigns, 10) + parseInt(cs.closed_campaigns, 10);
  const successRate = totalCampaigns > 0
    ? Math.round((parseInt(cs.closed_campaigns, 10) / totalCampaigns) * 100)
    : 0;

  return {
    totalFunds: parseInt(ps.total_amount_processed || 0, 10) / 1000,
    totalAmountProcessed: parseInt(ps.total_amount_processed || 0, 10) / 1000,
    totalPaidDonations: parseInt(ps.total_paid_donations || 0, 10),
    totalTarget: parseInt(cs.total_target || 0, 10) / 1000,
    activeCampaigns: parseInt(cs.active_campaigns, 10),
    closedCampaigns: parseInt(cs.closed_campaigns, 10),
    pendingCampaigns: parseInt(cs.pending_campaigns, 10),
    draftCampaigns: parseInt(cs.draft_campaigns, 10),
    totalCampaigns: parseInt(cs.total_campaigns, 10),
    successRate,
    totalUsers: parseInt(userCount.rows[0].total_users, 10),
    commissionRate: 0.05,
    categorySplit: categoryBreakdown.rows.map((row) => ({
      name: row.category || "Non categorise",
      value: parseInt(row.count, 10),
    })),
    latestPaidDonations: latestPaidDonations.rows.map((donation) => ({
      id: donation.id,
      amountTnd: Number(donation.amount_millimes || 0) / 1000,
      paidAt: donation.paid_at,
      donorName: donation.donor_name,
      campaignId: donation.campaign_id,
      campaignTitle: donation.campaign_title,
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
 * Get all campaigns with creator metadata.
 */
export const getAllCampaigns = async () => {
  const { rows } = await pool.query(`
    SELECT
      c.id,
      c.title,
      c.description,
      c.category,
      c.target_amount,
      c.current_amount,
      c.status,
      c.image_url,
      c.video_url,
      c.created_at,
      c.updated_at,
      COALESCE(ds.paid_donation_count, 0)::int AS paid_donation_count,
      u.name AS creator_name,
      u.email AS creator_email
    FROM campaigns c
    JOIN users u ON c.porteur_id = u.id
    LEFT JOIN (
      SELECT campaign_id, COUNT(*)::int AS paid_donation_count
      FROM donations
      WHERE status = 'PAID'
      GROUP BY campaign_id
    ) ds ON ds.campaign_id = c.id
    ORDER BY
      CASE c.status
        WHEN 'ACTIVE' THEN 1
        WHEN 'PENDING' THEN 2
        WHEN 'DRAFT' THEN 3
        WHEN 'REJECTED' THEN 4
        WHEN 'CLOSED' THEN 5
        ELSE 99
      END,
      c.created_at DESC
  `);
  return rows;
};

/**
 * Get all users.
 */
export const getAllUsers = async () => {
  const { rows } = await pool.query(`
    SELECT id, name, email, role, bio, avatar, created_at
    FROM users
    ORDER BY created_at DESC
  `);
  return rows;
};

/**
 * Get all recorded supports with donor and campaign metadata.
 */
export const getAllPledges = async () => {
  const { rows } = await pool.query(`
    WITH supports AS (
      SELECT
        p.id,
        p.amount,
        p.status::text AS status,
        p.created_at,
        NULL::timestamptz AS paid_at,
        'legacy'::text AS provider,
        NULL::text AS provider_payment_ref,
        NULL::text AS provider_short_id,
        NULL::text AS provider_order_id,
        p.donateur_id AS donor_id,
        p.campaign_id
      FROM pledges p

      UNION ALL

      SELECT
        d.id,
        d.amount_millimes AS amount,
        d.status::text AS status,
        d.created_at,
        d.paid_at,
        d.provider,
        d.provider_payment_ref,
        d.provider_short_id,
        d.provider_order_id,
        d.user_id AS donor_id,
        d.campaign_id
      FROM donations d
    )
    SELECT
      s.id,
      s.amount,
      s.status,
      s.created_at,
      s.paid_at,
      s.provider,
      s.provider_payment_ref,
      s.provider_short_id,
      s.provider_order_id,
      donor.id AS donor_id,
      donor.name AS donor_name,
      donor.email AS donor_email,
      c.id AS campaign_id,
      c.title AS campaign_title,
      c.category AS campaign_category,
      c.status AS campaign_status,
      creator.id AS creator_id,
      creator.name AS creator_name,
      creator.email AS creator_email
    FROM supports s
    JOIN users donor ON donor.id = s.donor_id
    JOIN campaigns c ON c.id = s.campaign_id
    JOIN users creator ON creator.id = c.porteur_id
    ORDER BY COALESCE(s.paid_at, s.created_at) DESC
  `);
  return rows;
};

/**
 * Approve a campaign (PENDING -> ACTIVE).
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
 * Reject a campaign (PENDING -> REJECTED).
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
 * Delete a draft, pending or active campaign.
 */
export const deleteCampaign = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM campaigns
     WHERE id = $1 AND status IN ('DRAFT', 'PENDING', 'ACTIVE')
     RETURNING id, title, status`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Delete a user and all their campaigns.
 */
export const deleteUser = async (id) => {
  await pool.query(`DELETE FROM campaigns WHERE porteur_id = $1`, [id]);
  const { rows } = await pool.query(
    `DELETE FROM users WHERE id = $1 RETURNING id, name, email`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Update a user's role (USER <-> ADMIN).
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

/**
 * Update a user's editable admin-managed fields.
 */
export const updateUser = async (id, { name, email, role, bio, avatar }) => {
  const setClauses = [];
  const values = [];
  let index = 1;

  if (name !== undefined) {
    setClauses.push(`name = $${index}`);
    values.push(name);
    index += 1;
  }

  if (email !== undefined) {
    setClauses.push(`email = $${index}`);
    values.push(email);
    index += 1;
  }

  if (role !== undefined) {
    setClauses.push(`role = $${index}`);
    values.push(role);
    index += 1;
  }

  if (bio !== undefined) {
    setClauses.push(`bio = $${index}`);
    values.push(bio);
    index += 1;
  }

  if (avatar !== undefined) {
    setClauses.push(`avatar = $${index}`);
    values.push(avatar);
    index += 1;
  }

  if (setClauses.length === 0) {
    return null;
  }

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE users
     SET ${setClauses.join(", ")}
     WHERE id = $${index}
     RETURNING id, name, email, role, bio, avatar, created_at`,
    values
  );
  return rows[0] || null;
};
