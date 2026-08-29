import { pool } from '../db/pool.js';

export async function listPermissions() {
  const [rows] = await pool.query('SELECT id, name, description FROM permissions ORDER BY name');
  return rows;
}
