import pool from "../config/db.js";

const donationSelect = `
  d.id,
  d.campaign_id,
  d.user_id,
  d.provider,
  d.amount_millimes,
  d.currency_token,
  d.status,
  d.provider_payment_ref,
  d.provider_short_id,
  d.provider_order_id,
  d.provider_status,
  d.provider_payload_init,
  d.provider_payload_details,
  d.description,
  d.created_at,
  d.updated_at,
  d.paid_at,
  c.title AS campaign_title,
  c.porteur_id AS campaign_owner_id,
  c.status AS campaign_status,
  c.target_amount AS campaign_target_amount,
  c.current_amount AS campaign_current_amount,
  u.name AS donor_name,
  u.email AS donor_email
`;

const resolveClient = (client) => client || pool;

export const createPendingDonation = async (
  client,
  {
    campaignId,
    userId,
    amountMillimes,
    currencyToken = "TND",
    provider = "konnect",
    providerOrderId = null,
    description = null,
  }
) => {
  const db = resolveClient(client);
  const { rows } = await db.query(
    `INSERT INTO donations (
       campaign_id,
       user_id,
       provider,
       amount_millimes,
       currency_token,
       provider_order_id,
       description
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [campaignId, userId, provider, amountMillimes, currencyToken, providerOrderId, description]
  );

  return rows[0] ? findById(rows[0].id, client) : null;
};

export const updateDonation = async (client, donationId, fields) => {
  const db = resolveClient(client);
  const allowed = [
    "provider",
    "amount_millimes",
    "currency_token",
    "status",
    "provider_payment_ref",
    "provider_short_id",
    "provider_order_id",
    "provider_status",
    "provider_payload_init",
    "provider_payload_details",
    "description",
    "paid_at",
  ];

  const clauses = [];
  const values = [];
  let index = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      clauses.push(`${key} = $${index}`);
      values.push(fields[key]);
      index += 1;
    }
  }

  if (clauses.length === 0) {
    return findById(donationId, client);
  }

  values.push(donationId);

  const { rows } = await db.query(
    `UPDATE donations
     SET ${clauses.join(", ")}
     WHERE id = $${index}
     RETURNING id`,
    values
  );

  return rows[0] ? findById(rows[0].id, client) : null;
};

export const findById = async (id, client = null) => {
  const db = resolveClient(client);
  const { rows } = await db.query(
    `SELECT ${donationSelect}
     FROM donations d
     JOIN campaigns c ON c.id = d.campaign_id
     JOIN users u ON u.id = d.user_id
     WHERE d.id = $1`,
    [id]
  );

  return rows[0] || null;
};

export const findByProviderPaymentRef = async (providerPaymentRef, client = null) => {
  const db = resolveClient(client);
  const { rows } = await db.query(
    `SELECT ${donationSelect}
     FROM donations d
     JOIN campaigns c ON c.id = d.campaign_id
     JOIN users u ON u.id = d.user_id
     WHERE d.provider_payment_ref = $1`,
    [providerPaymentRef]
  );

  return rows[0] || null;
};

export const findByProviderOrderId = async (providerOrderId, client = null) => {
  const db = resolveClient(client);
  const { rows } = await db.query(
    `SELECT ${donationSelect}
     FROM donations d
     JOIN campaigns c ON c.id = d.campaign_id
     JOIN users u ON u.id = d.user_id
     WHERE d.provider_order_id = $1`,
    [providerOrderId]
  );

  return rows[0] || null;
};

export const lockById = async (client, donationId) => {
  const { rows } = await client.query(
    `SELECT *
     FROM donations
     WHERE id = $1
     FOR UPDATE`,
    [donationId]
  );

  return rows[0] || null;
};

export const listRecentPaidDonations = async (limit = 5) => {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 5;
  const { rows } = await pool.query(
    `SELECT
       d.id,
       d.amount_millimes,
       d.provider,
       d.provider_payment_ref,
       d.provider_short_id,
       d.provider_order_id,
       d.paid_at,
       donor.name AS donor_name,
       donor.email AS donor_email,
       c.id AS campaign_id,
       c.title AS campaign_title
     FROM donations d
     JOIN users donor ON donor.id = d.user_id
     JOIN campaigns c ON c.id = d.campaign_id
     WHERE d.status = 'PAID'
     ORDER BY COALESCE(d.paid_at, d.created_at) DESC
     LIMIT $1`,
    [safeLimit]
  );

  return rows;
};
