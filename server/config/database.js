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
  // Each migration is isolated — a failure logs a warning but NEVER stops the server
  const safe = async (label, fn) => {
    try {
      await fn();
      console.log(`✅  Migration OK: ${label}`);
    } catch (err) {
      console.warn(`⚠️  Migration skipped (${label}): ${err.message}`);
    }
  };

  // Auth: password-reset token columns (added for forgot-password feature)
  await safe('users.reset_password_token', () =>
    pool.query('ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(64) NULL DEFAULT NULL')
  );
  await safe('users.reset_password_expires', () =>
    pool.query('ALTER TABLE users ADD COLUMN reset_password_expires DATETIME NULL DEFAULT NULL')
  );

  // Expenses table
  await safe('create expenses table', () =>
    pool.query(`
      CREATE TABLE expenses (
        id           INT           PRIMARY KEY AUTO_INCREMENT,
        name         VARCHAR(255)  NOT NULL,
        category     VARCHAR(100)  NOT NULL,
        amount       DECIMAL(15,2) NOT NULL,
        expense_date DATE          NOT NULL,
        description  TEXT          DEFAULT NULL,
        created_by   INT           DEFAULT NULL,
        created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_expense_user FOREIGN KEY (created_by)
          REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
        INDEX idx_exp_date     (expense_date),
        INDEX idx_exp_category (category),
        INDEX idx_exp_created  (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  );

  // SMS: create sms_logs table if the manual migration was never run
  await safe('create sms_logs table', () =>
    pool.query(`
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
    `)
  );

  // ── 2026-09 feature release — additive, nullable columns only ────────────
  // Client verification (KYC) type: nida | voter | driving | none
  await safe('customers.id_type', () =>
    pool.query('ALTER TABLE customers ADD COLUMN id_type VARCHAR(20) NULL DEFAULT NULL AFTER address')
  );

  // Repayment frequency + installment plan
  await safe('loans.repayment_frequency', () =>
    pool.query('ALTER TABLE loans ADD COLUMN repayment_frequency VARCHAR(10) NULL DEFAULT NULL')
  );
  await safe('loans.installment_count', () =>
    pool.query('ALTER TABLE loans ADD COLUMN installment_count INT NULL DEFAULT NULL')
  );
  await safe('loans.installment_amount', () =>
    pool.query('ALTER TABLE loans ADD COLUMN installment_amount DECIMAL(12,2) NULL DEFAULT NULL')
  );

  // Payment timestamp, payment mode and mobile-money agent fees
  await safe('repayments.paid_at', () =>
    pool.query('ALTER TABLE repayments ADD COLUMN paid_at DATETIME NULL DEFAULT NULL AFTER payment_date')
  );
  await safe('repayments.payment_mode', () =>
    pool.query("ALTER TABLE repayments ADD COLUMN payment_mode VARCHAR(20) NOT NULL DEFAULT 'cash'")
  );
  await safe('repayments.mobile_provider', () =>
    pool.query('ALTER TABLE repayments ADD COLUMN mobile_provider VARCHAR(20) NULL DEFAULT NULL')
  );
  await safe('repayments.amount_sent', () =>
    pool.query('ALTER TABLE repayments ADD COLUMN amount_sent DECIMAL(12,2) NULL DEFAULT NULL')
  );
  await safe('repayments.agent_fee', () =>
    pool.query('ALTER TABLE repayments ADD COLUMN agent_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00')
  );

  // Guarantors & collateral — removed automatically with their loan
  await safe('create loan_guarantors table', () =>
    pool.query(`
      CREATE TABLE IF NOT EXISTS loan_guarantors (
        id            INT           PRIMARY KEY AUTO_INCREMENT,
        loan_id       INT           NOT NULL,
        full_name     VARCHAR(100)  NOT NULL,
        phone         VARCHAR(20)   NOT NULL,
        relationship  VARCHAR(60)   DEFAULT NULL,
        id_number     VARCHAR(50)   DEFAULT NULL,
        created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_guarantor_loan FOREIGN KEY (loan_id)
          REFERENCES loans(id) ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX idx_guarantor_loan (loan_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  );
  await safe('create loan_collaterals table', () =>
    pool.query(`
      CREATE TABLE IF NOT EXISTS loan_collaterals (
        id               INT            PRIMARY KEY AUTO_INCREMENT,
        loan_id          INT            NOT NULL,
        description      VARCHAR(255)   NOT NULL,
        serial_number    VARCHAR(100)   DEFAULT NULL,
        item_condition   VARCHAR(60)    DEFAULT NULL,
        estimated_value  DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
        created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_collateral_loan FOREIGN KEY (loan_id)
          REFERENCES loans(id) ON DELETE CASCADE ON UPDATE CASCADE,
        INDEX idx_collateral_loan (loan_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  );
}

module.exports = { pool, testConnection, runMigrations };
