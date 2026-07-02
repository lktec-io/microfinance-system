const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'microfinance',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅  MySQL connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌  MySQL connection failed:', err.message);
    process.exit(1);
  }
}

async function runMigrations() {
  const addColumn = async (col, def) => {
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
      console.log(`✅  Migration: added column '${col}'`);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  };
  await addColumn('reset_password_token',   'VARCHAR(64)  NULL DEFAULT NULL');
  await addColumn('reset_password_expires', 'DATETIME     NULL DEFAULT NULL');
}

module.exports = { pool, testConnection, runMigrations };
