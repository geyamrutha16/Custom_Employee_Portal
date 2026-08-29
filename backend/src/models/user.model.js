import { pool } from '../db/pool.js';

export async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, name, email, password_hash, status, department_id
     FROM users WHERE email = ?`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, name, email, status, department_id
     FROM users WHERE id = ?`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getUserRoles(userId) {
  const [rows] = await pool.query(
    `SELECT r.id, r.name
     FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = ?`,
    [userId]
  );
  return rows;
}

export async function getUserPermissions(userId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT p.name
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = ?`,
    [userId]
  );
  return rows.map((row) => row.name);
}

export async function listUsers() {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.status, u.created_at, u.department_id AS departmentId, d.name AS department,
            COALESCE(GROUP_CONCAT(r.name ORDER BY r.name), '') AS roles
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     GROUP BY u.id
     ORDER BY u.created_at DESC`
  );
  return rows.map((row) => ({ ...row, roles: row.roles ? row.roles.split(',') : [] }));
}

export async function createUser({ name, email, passwordHash, departmentId }) {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password_hash, status, department_id) VALUES (?, ?, ?, 'ACTIVE', ?)`,
    [name, email, passwordHash, departmentId ?? null]
  );
  return result.insertId;
}

export async function updateUser(id, fields) {
  const columns = [];
  const values = [];
  for (const [key, dbColumn] of [
    ['name', 'name'],
    ['email', 'email'],
    ['departmentId', 'department_id'],
    ['status', 'status'],
  ]) {
    if (fields[key] !== undefined) {
      columns.push(`${dbColumn} = ?`);
      values.push(fields[key]);
    }
  }
  if (columns.length === 0) return;
  values.push(id);
  await pool.query(`UPDATE users SET ${columns.join(', ')} WHERE id = ?`, values);
}

export async function setUserRoles(userId, roleIds) {
  await pool.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
  if (roleIds.length === 0) return;
  const values = roleIds.map((roleId) => [userId, roleId]);
  await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ?', [values]);
}

export async function userHasRole(userId, roleName) {
  const [rows] = await pool.query(
    `SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.name = ? LIMIT 1`,
    [userId, roleName]
  );
  return rows.length > 0;
}

export async function countActiveAdmins() {
  const [rows] = await pool.query(
    `SELECT COUNT(DISTINCT u.id) AS count
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name = 'ADMIN' AND u.status = 'ACTIVE'`
  );
  return rows[0].count;
}

export async function getAuthContextForUser(userId) {
  const user = await findUserById(userId);
  if (!user || user.status !== 'ACTIVE') return null;

  const [roles, permissions] = await Promise.all([getUserRoles(userId), getUserPermissions(userId)]);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    departmentId: user.department_id,
    roles: roles.map((r) => r.name),
    permissions,
  };
}
