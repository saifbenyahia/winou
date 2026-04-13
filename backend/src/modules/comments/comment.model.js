import pool from "../../config/db.js";

export const createComment = async ({ campaignId, userId, content }) => {
  const { rows } = await pool.query(
    `INSERT INTO comments (campaign_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, campaign_id, user_id, content, is_deleted, created_at, updated_at`,
    [campaignId, userId, content]
  );

  const created = rows[0];
  if (!created) return null;

  return getCommentById(created.id);
};

export const getCommentById = async (commentId) => {
  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.campaign_id,
       c.user_id,
       c.content,
       c.is_deleted,
       c.created_at,
       c.updated_at,
       u.name AS author_name,
       u.avatar AS author_avatar,
       u.email AS author_email
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = $1`,
    [commentId]
  );

  return rows[0] || null;
};

export const getPublicCommentsByCampaign = async (campaignId) => {
  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.campaign_id,
       c.user_id,
       c.content,
       c.created_at,
       c.updated_at,
       u.name AS author_name,
       u.avatar AS author_avatar
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.campaign_id = $1
       AND c.is_deleted = FALSE
     ORDER BY c.created_at DESC`,
    [campaignId]
  );

  return rows;
};

export const getAdminCommentsByCampaign = async (campaignId) => {
  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.campaign_id,
       c.user_id,
       c.content,
       c.is_deleted,
       c.created_at,
       c.updated_at,
       u.name AS author_name,
       u.avatar AS author_avatar,
       u.email AS author_email
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.campaign_id = $1
     ORDER BY c.created_at DESC`,
    [campaignId]
  );

  return rows;
};

export const softDeleteComment = async (commentId) => {
  const { rows } = await pool.query(
    `UPDATE comments
     SET is_deleted = TRUE,
         updated_at = NOW()
     WHERE id = $1
       AND is_deleted = FALSE
     RETURNING id, campaign_id, user_id, content, is_deleted, created_at, updated_at`,
    [commentId]
  );

  return rows[0] || null;
};
