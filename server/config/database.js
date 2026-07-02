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
  // Safely add a column — silently skip if it already exists
  const addColumn = async (table, col, def) => {
    try {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
      console.log(`✅  Migration: ${table}.${col} added`);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  };

  // Auth: password-reset token columns
  await addColumn('users', 'reset_password_token',   'VARCHAR(64)  NULL DEFAULT NULL');
  await addColumn('users', 'reset_password_expires', 'DATETIME     NULL DEFAULT NULL');

  // SMS: create sms_logs table if it was never migrated
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_logs (
      id              INT           PRIMARY KEY AUTO_INCREMENT,
      phone           VARCHAR(20)   NOT NULL,
      customer_id     INT           DEFAULT NULL,
      loan_id         INT           DEFAULT NULL,
      message_type    ENUM('thank_you','reminder','overdue') NOT NULL DEFAULT 'reminder',
      message         TEXT          NOT NULL,
      status          ENUM('sent','failed','pending')        NOT NULL DEFAULT 'pending',
      beem_request_id VARCHAR(100)  DEFAULT NULL,
      error           TEXT          DEFAULT NULL,
      retries         TINYINT       NOT NULL DEFAULT 0,
      sent_at         TIMESTAMP     NULL,
      created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_smslog_customer FOREIGN KEY (customer_id)
        REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_smslog_loan FOREIGN KEY (loan_id)
        REFERENCES loans(id) ON DELETE SET NULL ON UPDATE CASCADE,
      INDEX idx_sms_status   (status),
      INDEX idx_sms_type     (message_type),
      INDEX idx_sms_created  (created_at),
      INDEX idx_sms_customer (customer_id),
      INDEX idx_sms_loan     (loan_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

module.exports = { pool, testConnection, runMigrations };
