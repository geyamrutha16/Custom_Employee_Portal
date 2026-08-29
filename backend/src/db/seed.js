import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

const DEMO_PASSWORD = 'Password123!';

const PERMISSIONS = [
  ['USER_VIEW', 'View users'],
  ['USER_CREATE', 'Create users'],
  ['USER_UPDATE', 'Update users'],
  ['USER_DELETE', 'Delete or deactivate users'],
  ['ROLE_VIEW', 'View roles'],
  ['ROLE_CREATE', 'Create roles'],
  ['ROLE_UPDATE', 'Update roles'],
  ['ROLE_DELETE', 'Delete roles'],
  ['PERMISSION_VIEW', 'View permissions'],
  ['AUDIT_VIEW', 'View audit logs'],
  ['ZOHO_CRM_VIEW', 'Access Zoho CRM dashboard'],
  ['ZOHO_DESK_VIEW', 'Access Zoho Desk dashboard'],
];

const ALL_PERMISSION_NAMES = PERMISSIONS.map(([name]) => name);

const ROLES = [
  { name: 'ADMIN', description: 'Full portal access', permissions: ALL_PERMISSION_NAMES },
  { name: 'SALES', description: 'Sales team, Zoho CRM access', permissions: ['ZOHO_CRM_VIEW'] },
  { name: 'SUPPORT', description: 'Support team, Zoho Desk access', permissions: ['ZOHO_DESK_VIEW'] },
];

const REMOVED_ROLE_NAMES = ['HR', 'MANAGER'];
const REMOVED_USER_EMAILS = ['hr@example.com', 'manager@example.com'];
const REMOVED_DEPARTMENT_NAMES = ['Human Resources', 'Management'];

const DEPARTMENTS = ['Executive', 'Sales', 'Support'];

const USERS = [
  { name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', department: 'Executive' },
  { name: 'Sales User', email: 'sales@example.com', role: 'SALES', department: 'Sales' },
  { name: 'Support User', email: 'support@example.com', role: 'SUPPORT', department: 'Support' },
];

async function upsertByName(connection, table, name, extraColumns = {}, extraValues = []) {
  const columns = ['name', ...Object.keys(extraColumns)];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [name, ...extraValues];
  await connection.query(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    values
  );
  const [rows] = await connection.query(`SELECT id FROM ${table} WHERE name = ?`, [name]);
  return rows[0].id;
}

async function run() {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  console.log('Removing retired roles/users/permission/departments (People + HR + Manager)...');
  for (const email of REMOVED_USER_EMAILS) {
    await connection.query('DELETE FROM users WHERE email = ?', [email]);
  }
  for (const roleName of REMOVED_ROLE_NAMES) {
    await connection.query('DELETE FROM roles WHERE name = ?', [roleName]);
  }
  await connection.query('DELETE FROM permissions WHERE name = ?', ['ZOHO_PEOPLE_VIEW']);
  for (const deptName of REMOVED_DEPARTMENT_NAMES) {
    await connection.query('DELETE FROM departments WHERE name = ?', [deptName]);
  }

  console.log('Seeding departments...');
  const departmentIds = {};
  for (const name of DEPARTMENTS) {
    departmentIds[name] = await upsertByName(connection, 'departments', name);
  }

  console.log('Seeding permissions...');
  const permissionIds = {};
  for (const [name, description] of PERMISSIONS) {
    await connection.query(
      `INSERT INTO permissions (name, description) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      [name, description]
    );
    const [rows] = await connection.query('SELECT id FROM permissions WHERE name = ?', [name]);
    permissionIds[name] = rows[0].id;
  }

  console.log('Seeding roles and role-permission mappings...');
  for (const role of ROLES) {
    const [existing] = await connection.query('SELECT id FROM roles WHERE name = ?', [role.name]);
    let roleId;
    if (existing.length > 0) {
      roleId = existing[0].id;
      await connection.query('UPDATE roles SET description = ? WHERE id = ?', [role.description, roleId]);
    } else {
      const [result] = await connection.query('INSERT INTO roles (name, description) VALUES (?, ?)', [
        role.name,
        role.description,
      ]);
      roleId = result.insertId;
    }

    await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    for (const permissionName of role.permissions) {
      await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [
        roleId,
        permissionIds[permissionName],
      ]);
    }
  }

  console.log('Seeding demo users...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const user of USERS) {
    const departmentId = departmentIds[user.department] ?? null;

    const [existingUser] = await connection.query('SELECT id FROM users WHERE email = ?', [user.email]);
    let userId;
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      await connection.query(
        'UPDATE users SET name = ?, password_hash = ?, status = ?, department_id = ? WHERE id = ?',
        [user.name, passwordHash, 'ACTIVE', departmentId, userId]
      );
    } else {
      const [result] = await connection.query(
        'INSERT INTO users (name, email, password_hash, status, department_id) VALUES (?, ?, ?, ?, ?)',
        [user.name, user.email, passwordHash, 'ACTIVE', departmentId]
      );
      userId = result.insertId;
    }

    const [roleRows] = await connection.query('SELECT id FROM roles WHERE name = ?', [user.role]);
    const roleId = roleRows[0].id;

    await connection.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
    await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
  }

  console.log('Seed complete.');
  console.log(`Demo password for all seeded users: ${DEMO_PASSWORD}`);
  await connection.end();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
