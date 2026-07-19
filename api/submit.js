import { Client } from 'pg';

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const TABLE_NAME = 'predictions';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!NEON_DATABASE_URL) {
    return res.status(500).json({ error: 'Missing NEON_DATABASE_URL' });
  }

  const { empId, empName, winner, arg, esp } = req.body || {};

  if (!empId || !empName || !winner) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
  }

  const client = new Client({ connectionString: NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        emp_id TEXT NOT NULL UNIQUE,
        emp_name TEXT NOT NULL,
        winner TEXT NOT NULL,
        arg_score INTEGER,
        esp_score INTEGER
      )
    `);

    const existing = await client.query(
      'SELECT id FROM ' + TABLE_NAME + ' WHERE emp_id = $1 LIMIT 1',
      [empId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'รหัสพนักงานนี้เคยลงผลแล้ว' });
    }

    await client.query(
      'INSERT INTO ' + TABLE_NAME + ' (emp_id, emp_name, winner, arg_score, esp_score) VALUES ($1, $2, $3, $4, $5)',
      [empId, empName, winner, arg || null, esp || null]
    );

    return res.status(200).json({ success: true, message: 'บันทึกผลการทายสำเร็จ!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'เกิดข้อผิดพลาด' });
  } finally {
    await client.end();
  }
}
