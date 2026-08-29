import { pool } from '../db/pool.js';

export async function listRoles() {
  const [rows] = await pool.query(
    `SELECT r.id, r.name, r.description, r.created_at,
            COALESCE(GROUP_CONCAT(p.name ORDER BY p.name), '') AS permissions
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     GROUP BY r.id
     ORDER BY r.name`
  );
  return rows.map((row) => ({ ...row, permissions: row.permissions ? row.permissions.split(',') : [] }));
}

export async function findRoleById(id) {
  const [rows] = await pool.query('SELECT id, name, description FROM roles WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function findRoleByName(name) {
  const [rows] = await pool.query('SELECT id, name, description FROM roles WHERE name = ?', [name]);
  return rows[0] ?? null;
}

export async function createRole({ name, description }) {
  const [result] = await pool.query('INSERT INTO roles (name, description) VALUES (?, ?)', [
    name,
    description ?? null,
  ]);
  return result.insertId;
}

export async function updateRoleDescription(id, description) {
  await pool.query('UPDATE roles SET description = ? WHERE id = ?', [description, id]);
}

export async function deleteRole(id) {
  await pool.query('DELETE FROM roles WHERE id = ?', [id]);
}

export async function setRolePermissions(roleId, permissionIds) {
  await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
  if (permissionIds.length === 0) return;
  const values = permissionIds.map((permissionId) => [roleId, permissionId]);
  await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [values]);
}

export async function isRoleAssignedToAnyUser(roleId) {
  const [rows] = await pool.query('SELECT 1 FROM user_roles WHERE role_id = ? LIMIT 1', [roleId]);
  return rows.length > 0;
}
