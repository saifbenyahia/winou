import pool from "../config/db.js";

export const createWebhookEvent = async ({ provider, queryParams = {}, payload = null }) => {
  const { rows } = await pool.query(
    `INSERT INTO payment_webhook_events (provider, query_params, payload)
     VALUES ($1, $2, $3)
     RETURNING id, provider, query_params, payload, received_at, processed, processing_error`,
    [provider, queryParams, payload]
  );

  return rows[0] || null;
};

export const markWebhookProcessed = async (id) => {
  const { rows } = await pool.query(
    `UPDATE payment_webhook_events
     SET processed = TRUE,
         processing_error = NULL
     WHERE id = $1
     RETURNING id, provider, query_params, payload, received_at, processed, processing_error`,
    [id]
  );

  return rows[0] || null;
};

export const markWebhookFailed = async (id, errorMessage) => {
  const { rows } = await pool.query(
    `UPDATE payment_webhook_events
     SET processed = FALSE,
         processing_error = $2
     WHERE id = $1
     RETURNING id, provider, query_params, payload, received_at, processed, processing_error`,
    [id, errorMessage]
  );

  return rows[0] || null;
};
