import pool from "../../config/db.js";

export const SUPPORT_TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"];
export const SUPPORT_TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const SUPPORT_TICKET_CATEGORIES = ["GENERAL", "CAMPAIGN", "PAYMENT", "ACCOUNT", "TECHNICAL", "REPORT_ABUSE", "OTHER"];

const detailSelect = `
  t.id,
  t.code,
  t.user_id,
  t.related_campaign_id,
  t.title,
  t.category,
  t.priority,
  t.status,
  t.assigned_admin_id,
  t.last_message_at,
  t.created_at,
  t.updated_at,
  t.closed_at,
  requester.name AS user_name,
  requester.email AS user_email,
  assigned_admin.name AS assigned_admin_name,
  assigned_admin.email AS assigned_admin_email,
  c.title AS related_campaign_title,
  c.status AS related_campaign_status
`;

const detailJoins = `
  JOIN users requester ON requester.id = t.user_id
  LEFT JOIN users assigned_admin ON assigned_admin.id = t.assigned_admin_id
  LEFT JOIN campaigns c ON c.id = t.related_campaign_id
`;

const priorityOrderSql = `
  CASE t.priority
    WHEN 'URGENT' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    WHEN 'LOW' THEN 4
    ELSE 99
  END
`;

const statusOrderSql = `
  CASE t.status
    WHEN 'OPEN' THEN 1
    WHEN 'IN_PROGRESS' THEN 2
    WHEN 'WAITING_USER' THEN 3
    WHEN 'RESOLVED' THEN 4
    WHEN 'CLOSED' THEN 5
    ELSE 99
  END
`;

const sortMap = {
  created_at: "t.created_at",
  updated_at: "t.updated_at",
  last_message_at: "t.last_message_at",
  title: "t.title",
  code: "t.code",
  priority: priorityOrderSql,
  status: statusOrderSql,
};

const normalizePage = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const normalizeLimit = (value, fallback = 20) => {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 100);
};

const normalizeSortDirection = (value) => (String(value || "").toUpperCase() === "ASC" ? "ASC" : "DESC");

const resolveClosedAtValue = (status, previousClosedAt = null) => {
  if (status === "RESOLVED" || status === "CLOSED") {
    return previousClosedAt || new Date();
  }
  return null;
};

const buildTicketWhereClause = ({ userId, search, status, category, priority, assignedAdminId, dateFrom, dateTo }) => {
  const clauses = [];
  const values = [];

  if (userId) {
    values.push(userId);
    clauses.push(`t.user_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search.trim()}%`);
    clauses.push(`(
      t.code ILIKE $${values.length}
      OR t.title ILIKE $${values.length}
      OR requester.name ILIKE $${values.length}
      OR requester.email ILIKE $${values.length}
      OR COALESCE(c.title, '') ILIKE $${values.length}
    )`);
  }

  if (status && SUPPORT_TICKET_STATUSES.includes(status)) {
    values.push(status);
    clauses.push(`t.status = $${values.length}`);
  }

  if (category && SUPPORT_TICKET_CATEGORIES.includes(category)) {
    values.push(category);
    clauses.push(`t.category = $${values.length}`);
  }

  if (priority && SUPPORT_TICKET_PRIORITIES.includes(priority)) {
    values.push(priority);
    clauses.push(`t.priority = $${values.length}`);
  }

  if (assignedAdminId === "UNASSIGNED") {
    clauses.push("t.assigned_admin_id IS NULL");
  } else if (assignedAdminId) {
    values.push(assignedAdminId);
    clauses.push(`t.assigned_admin_id = $${values.length}`);
  }

  if (dateFrom) {
    values.push(dateFrom);
    clauses.push(`t.created_at::date >= $${values.length}::date`);
  }

  if (dateTo) {
    values.push(dateTo);
    clauses.push(`t.created_at::date <= $${values.length}::date`);
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
};

const getOrderClause = (sortBy, sortDir) => {
  const column = sortMap[sortBy] || sortMap.last_message_at;
  const direction = normalizeSortDirection(sortDir);
  return `ORDER BY ${column} ${direction}, t.created_at DESC`;
};

const getTicketById = async (ticketId, userId = null) => {
  const values = [ticketId];
  const conditions = ["t.id = $1"];

  if (userId) {
    values.push(userId);
    conditions.push(`t.user_id = $${values.length}`);
  }

  const { rows } = await pool.query(
    `SELECT ${detailSelect}
     FROM support_tickets t
     ${detailJoins}
     WHERE ${conditions.join(" AND ")}`,
    values
  );

  return rows[0] || null;
};

export const getUserTicketById = async (ticketId, userId) => getTicketById(ticketId, userId);

export const getAdminTicketById = async (ticketId) => getTicketById(ticketId);

export const getTicketMessages = async (ticketId) => {
  const { rows } = await pool.query(
    `SELECT
       id,
       ticket_id,
       sender_id,
       sender_role,
       sender_name,
       message,
       attachment_url,
       attachment_name,
       created_at,
       updated_at
     FROM support_ticket_messages
     WHERE ticket_id = $1
     ORDER BY created_at ASC`,
    [ticketId]
  );

  return rows;
};

export const getTicketInternalNotes = async (ticketId) => {
  const { rows } = await pool.query(
    `SELECT
       id,
       ticket_id,
       admin_id,
       admin_name,
       note,
       created_at,
       updated_at
     FROM support_ticket_internal_notes
     WHERE ticket_id = $1
     ORDER BY created_at DESC`,
    [ticketId]
  );

  return rows;
};

export const getAssignableAdmins = async () => {
  const { rows } = await pool.query(
    `SELECT id, name, email
     FROM users
     WHERE role = 'ADMIN'
     ORDER BY name ASC`
  );

  return rows;
};

export const listUserTickets = async ({ userId, search, status, category, sortBy = "last_message_at", sortDir = "DESC", page = 1, limit = 20 }) => {
  const normalizedPage = normalizePage(page);
  const normalizedLimit = normalizeLimit(limit, 20);
  const offset = (normalizedPage - 1) * normalizedLimit;

  const { whereSql, values } = buildTicketWhereClause({
    userId,
    search,
    status,
    category,
  });

  const [totalResult, dataResult, summaryResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM support_tickets t
       ${detailJoins}
       ${whereSql}`,
      values
    ),
    pool.query(
      `SELECT ${detailSelect}
       FROM support_tickets t
       ${detailJoins}
       ${whereSql}
       ${getOrderClause(sortBy, sortDir)}
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, normalizedLimit, offset]
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS total_tickets,
         COUNT(*) FILTER (WHERE status IN ('OPEN', 'IN_PROGRESS', 'WAITING_USER'))::int AS open_tickets,
         COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::int AS closed_tickets
       FROM support_tickets
       WHERE user_id = $1`,
      [userId]
    ),
  ]);

  const total = totalResult.rows[0]?.total || 0;

  return {
    tickets: dataResult.rows,
    summary: summaryResult.rows[0] || {
      total_tickets: 0,
      open_tickets: 0,
      closed_tickets: 0,
    },
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      totalPages: Math.max(Math.ceil(total / normalizedLimit), 1),
    },
  };
};

export const listAdminTickets = async ({ search, status, category, priority, assignedAdminId, dateFrom, dateTo, sortBy = "last_message_at", sortDir = "DESC", page = 1, limit = 20 }) => {
  const normalizedPage = normalizePage(page);
  const normalizedLimit = normalizeLimit(limit, 20);
  const offset = (normalizedPage - 1) * normalizedLimit;

  const { whereSql, values } = buildTicketWhereClause({
    search,
    status,
    category,
    priority,
    assignedAdminId,
    dateFrom,
    dateTo,
  });

  const [totalResult, dataResult, summaryResult, admins] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM support_tickets t
       ${detailJoins}
       ${whereSql}`,
      values
    ),
    pool.query(
      `SELECT ${detailSelect}
       FROM support_tickets t
       ${detailJoins}
       ${whereSql}
       ${getOrderClause(sortBy, sortDir)}
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, normalizedLimit, offset]
    ),
    pool.query(
      `SELECT
         COUNT(*)::int AS total_tickets,
         COUNT(*) FILTER (WHERE assigned_admin_id IS NULL)::int AS new_unassigned_tickets,
         COUNT(*) FILTER (WHERE status IN ('OPEN', 'IN_PROGRESS'))::int AS open_in_progress_tickets,
         COUNT(*) FILTER (WHERE status = 'WAITING_USER')::int AS awaiting_user_reply_tickets,
         COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::int AS resolved_closed_tickets
       FROM support_tickets`
    ),
    getAssignableAdmins(),
  ]);

  const total = totalResult.rows[0]?.total || 0;

  return {
    tickets: dataResult.rows,
    admins,
    summary: summaryResult.rows[0] || {
      total_tickets: 0,
      new_unassigned_tickets: 0,
      open_in_progress_tickets: 0,
      awaiting_user_reply_tickets: 0,
      resolved_closed_tickets: 0,
    },
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      totalPages: Math.max(Math.ceil(total / normalizedLimit), 1),
    },
  };
};

export const createTicket = async ({
  userId,
  userName,
  title,
  category,
  priority,
  message,
  relatedCampaignId = null,
  attachmentUrl = null,
  attachmentName = null,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let createdTicketId = null;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const year = new Date().getFullYear();
      const { rows } = await client.query(
        `SELECT COALESCE(MAX(CAST(RIGHT(code, 4) AS INTEGER)), 0) + 1 AS next_number
         FROM support_tickets
         WHERE code LIKE $1`,
        [`HT-${year}-%`]
      );

      const nextNumber = rows[0]?.next_number || 1;
      const code = `HT-${year}-${String(nextNumber).padStart(4, "0")}`;

      try {
        const ticketResult = await client.query(
          `INSERT INTO support_tickets (
             code,
             user_id,
             related_campaign_id,
             title,
             category,
             priority,
             status,
             last_message_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', NOW())
           RETURNING id`,
          [code, userId, relatedCampaignId, title, category, priority]
        );

        createdTicketId = ticketResult.rows[0]?.id || null;
        break;
      } catch (error) {
        if (error.code === "23505") {
          continue;
        }
        throw error;
      }
    }

    if (!createdTicketId) {
      throw new Error("Impossible de generer un code de ticket unique.");
    }

    await client.query(
      `INSERT INTO support_ticket_messages (
         ticket_id,
         sender_id,
         sender_role,
         sender_name,
         message,
         attachment_url,
         attachment_name
       )
       VALUES ($1, $2, 'USER', $3, $4, $5, $6)`,
      [createdTicketId, userId, userName, message, attachmentUrl, attachmentName]
    );

    await client.query("COMMIT");
    return createdTicketId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const closeTicketByUser = async (ticketId, userId) => {
  const { rows } = await pool.query(
    `UPDATE support_tickets
     SET status = 'CLOSED',
         closed_at = NOW()
     WHERE id = $1
       AND user_id = $2
       AND status <> 'CLOSED'
     RETURNING id`,
    [ticketId, userId]
  );

  return rows[0] || null;
};

export const addMessage = async ({
  ticketId,
  senderId,
  senderRole,
  senderName,
  message,
  attachmentUrl = null,
  attachmentName = null,
  nextStatus = null,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ticketResult = await client.query(
      `SELECT id, user_id, status, assigned_admin_id, closed_at
       FROM support_tickets
       WHERE id = $1
       FOR UPDATE`,
      [ticketId]
    );

    const ticket = ticketResult.rows[0];
    if (!ticket) {
      const error = new Error("Ticket introuvable.");
      error.statusCode = 404;
      throw error;
    }

    if (senderRole === "USER" && ["RESOLVED", "CLOSED"].includes(ticket.status)) {
      const error = new Error("Ce ticket est ferme. Vous ne pouvez plus y repondre.");
      error.statusCode = 400;
      throw error;
    }

    const resolvedStatus = nextStatus
      || (senderRole === "USER" && ticket.status === "WAITING_USER" ? "OPEN" : ticket.status);

    const resolvedAssignedAdminId = senderRole === "ADMIN" && !ticket.assigned_admin_id
      ? senderId
      : ticket.assigned_admin_id;

    const messageResult = await client.query(
      `INSERT INTO support_ticket_messages (
         ticket_id,
         sender_id,
         sender_role,
         sender_name,
         message,
         attachment_url,
         attachment_name
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         id,
         ticket_id,
         sender_id,
         sender_role,
         sender_name,
         message,
         attachment_url,
         attachment_name,
         created_at,
         updated_at`,
      [ticketId, senderId, senderRole, senderName, message, attachmentUrl, attachmentName]
    );

    await client.query(
      `UPDATE support_tickets
       SET
         status = $2,
         assigned_admin_id = $3,
         last_message_at = NOW(),
         closed_at = $4
       WHERE id = $1`,
      [
        ticketId,
        resolvedStatus,
        resolvedAssignedAdminId,
        resolveClosedAtValue(resolvedStatus, ticket.closed_at),
      ]
    );

    await client.query("COMMIT");

    return {
      message: messageResult.rows[0],
      status: resolvedStatus,
      autoAssignedAdminId: resolvedAssignedAdminId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateTicketByAdmin = async (ticketId, fields) => {
  const setClauses = [];
  const values = [];
  let index = 1;

  if (fields.status !== undefined) {
    setClauses.push(`status = $${index}`);
    values.push(fields.status);
    index += 1;

    setClauses.push(`closed_at = $${index}`);
    values.push(resolveClosedAtValue(fields.status));
    index += 1;
  }

  if (fields.priority !== undefined) {
    setClauses.push(`priority = $${index}`);
    values.push(fields.priority);
    index += 1;
  }

  if (fields.category !== undefined) {
    setClauses.push(`category = $${index}`);
    values.push(fields.category);
    index += 1;
  }

  if (fields.assignedAdminId !== undefined) {
    setClauses.push(`assigned_admin_id = $${index}`);
    values.push(fields.assignedAdminId);
    index += 1;
  }

  if (setClauses.length === 0) {
    return getAdminTicketById(ticketId);
  }

  values.push(ticketId);

  const { rows } = await pool.query(
    `UPDATE support_tickets
     SET ${setClauses.join(", ")}
     WHERE id = $${index}
     RETURNING id`,
    values
  );

  return rows[0] || null;
};

export const assignTicketToAdmin = async (ticketId, assignedAdminId) => {
  const { rows } = await pool.query(
    `UPDATE support_tickets
     SET assigned_admin_id = $2
     WHERE id = $1
     RETURNING id`,
    [ticketId, assignedAdminId]
  );

  return rows[0] || null;
};

export const addInternalNote = async ({ ticketId, adminId, adminName, note }) => {
  const { rows } = await pool.query(
    `INSERT INTO support_ticket_internal_notes (
       ticket_id,
       admin_id,
       admin_name,
       note
     )
     VALUES ($1, $2, $3, $4)
     RETURNING id, ticket_id, admin_id, admin_name, note, created_at, updated_at`,
    [ticketId, adminId, adminName, note]
  );

  return rows[0] || null;
};
