import { pool } from '../db/pool.js';

export async function listDepartments() {
  const [rows] = await pool.query('SELECT id, name FROM departments ORDER BY name');
  return rows;
}
