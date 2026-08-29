import { pool } from '../db/pool.js';

export async function writeAuditLog({ userId = null, action, resource, resourceId = null, metadata = null, req }) {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, resource, resource_id, metadata, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      action,
      resource,
      resourceId,
      metadata ? JSON.stringify(metadata) : null,
      req?.ip ?? null,
      req?.headers?.['user-agent'] ?? null,
    ]
  );
}

export async function listAuditLogs({ page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT a.id, a.action, a.resource, a.resource_id, a.metadata, a.ip_address, a.user_agent, a.created_at,
            u.id AS user_id, u.name AS user_name, u.email AS user_email
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM audit_logs');

  return {
    logs: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
