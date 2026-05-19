-- ============================================================
--  Microfinance Management System — MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS microfinance
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE microfinance;

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT          PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- customers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id                INT          PRIMARY KEY AUTO_INCREMENT,
  full_name         VARCHAR(100) NOT NULL,
  phone             VARCHAR(20)  NOT NULL,
  address           TEXT         NOT NULL,
  id_number         VARCHAR(50)  DEFAULT NULL,
  registration_date DATE         NOT NULL DEFAULT (CURRENT_DATE),
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- loans
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loans (
  id             INT                               PRIMARY KEY AUTO_INCREMENT,
  customer_id    INT                               NOT NULL,
  loan_amount    DECIMAL(12,2)                     NOT NULL,
  interest_rate  DECIMAL(5,2)                      NOT NULL,
  duration_value INT                               NOT NULL,
  duration_unit  ENUM('days','weeks','months')     NOT NULL,
  total_payable  DECIMAL(12,2)                     NOT NULL,
  amount_paid    DECIMAL(12,2)                     NOT NULL DEFAULT 0.00,
  balance        DECIMAL(12,2)                     NOT NULL,
  status         ENUM('pending','active','paid','overdue') NOT NULL DEFAULT 'pending',
  start_date     DATE                              DEFAULT NULL,
  due_date       DATE                              DEFAULT NULL,
  purpose        TEXT                              DEFAULT NULL,
  created_at     TIMESTAMP                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP                         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_loan_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- repayments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repayments (
  id             INT           PRIMARY KEY AUTO_INCREMENT,
  loan_id        INT           NOT NULL,
  amount         DECIMAL(12,2) NOT NULL,
  payment_date   DATE          NOT NULL DEFAULT (CURRENT_DATE),
  receipt_number VARCHAR(60)   NOT NULL UNIQUE,
  notes          TEXT          DEFAULT NULL,
  created_by     INT           DEFAULT NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_repayment_loan FOREIGN KEY (loan_id)
    REFERENCES loans(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_repayment_user FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- ------------------------------------------------------------
-- Seed: default admin account  (password: password)
-- Hash generated with bcrypt rounds=10
-- ------------------------------------------------------------
INSERT IGNORE INTO users (name, email, password, role)
VALUES (
  'System Admin',
  'admin@microfinance.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin'
);
