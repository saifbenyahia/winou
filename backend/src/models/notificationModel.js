import pool from "../config/db.js";

export const createNotification = async ({ userId, type, title, message, link = null }) => {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, link)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, type, title, message, link, is_read, created_at`,
    [userId, type, title, message, link]
  );
  return rows[0] || null;
};

export const getNotificationsByUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT id, user_id, type, title, message, link, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );
  return rows;
};

export const markAsRead = async (notificationId, userId) => {
  const { rows } = await pool.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, type, title, message, link, is_read, created_at`,
    [notificationId, userId]
  );
  return rows[0] || null;
};

export const markAllAsRead = async (userId) => {
  const { rowCount } = await pool.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return rowCount;
};

export const getUnreadCount = async (userId) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS unread_count
     FROM notifications
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return rows[0]?.unread_count || 0;
};
