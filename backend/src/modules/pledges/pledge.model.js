import pool from "../../config/db.js";

const resolveClient = (client) => client || pool;

export const createPledge = async ({ campaignId, donorId, amount, status = "SUCCESS" }, client = null) => {
  const db = resolveClient(client);
  const { rows } = await db.query(
    `INSERT INTO pledges (campaign_id, donateur_id, amount, status)
     VALUES ($1, $2, $3, $4)
     RETURNING id, campaign_id, donateur_id, amount, status, created_at`,
    [campaignId, donorId, amount, status]
  );

  return rows[0] || null;
};

export const findSupportedCampaignsByDonor = async (donorId) => {
  const { rows } = await pool.query(
    `WITH combined_supports AS (
       SELECT
         p.campaign_id,
         p.donateur_id AS user_id,
         p.amount,
         p.created_at
       FROM pledges p
       WHERE p.status = 'SUCCESS'

       UNION ALL

       SELECT
         d.campaign_id,
         d.user_id,
         d.amount_millimes AS amount,
         COALESCE(d.paid_at, d.created_at) AS created_at
       FROM donations d
       WHERE d.status = 'PAID'
     ),
     combined_campaign_support_counts AS (
       SELECT
         campaign_id,
         COUNT(*)::int AS backer_count
       FROM combined_supports
       GROUP BY campaign_id
     )
     SELECT
       c.id,
       c.porteur_id,
       c.title,
       c.description,
       c.category,
       c.target_amount,
       c.current_amount,
       c.status,
       c.rewards,
       c.story,
       c.image_url,
       c.video_url,
       c.created_at,
       c.updated_at,
       u.name AS creator_name,
       u.email AS creator_email,
       COUNT(s.campaign_id)::int AS pledge_count,
       COALESCE(SUM(s.amount), 0)::int AS total_contributed,
       MAX(s.created_at) AS last_supported_at,
       c.current_amount::int AS amount_raised,
       COALESCE(cs.backer_count, 0)::int AS backer_count,
       CASE
         WHEN c.target_amount > 0 THEN LEAST(
           ROUND((c.current_amount::numeric / c.target_amount::numeric) * 100),
           100
         )::int
         ELSE 0
       END AS funded_percent
     FROM combined_supports s
     JOIN campaigns c ON c.id = s.campaign_id
     JOIN users u ON u.id = c.porteur_id
     LEFT JOIN combined_campaign_support_counts cs ON cs.campaign_id = c.id
     WHERE s.user_id = $1
     GROUP BY c.id, u.name, u.email, cs.backer_count
     ORDER BY last_supported_at DESC`,
    [donorId]
  );

  return rows;
};
