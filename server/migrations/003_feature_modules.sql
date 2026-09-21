-- ════════════════════════════════════════════════════════════════════
-- 003_feature_modules.sql — Sept 2026 feature release
--   Multi-ID KYC · repayment frequency · payment time & mobile money fees
--   · guarantors & collateral
--
-- These statements are applied AUTOMATICALLY when the backend starts
-- (runMigrations() in server/config/database.js). This file is a reference
-- copy only.
--
-- Run a statement by hand ONLY if `npm run verify:schema` still reports it
-- missing after a restart. Every change is additive: nothing is renamed or
-- dropped. On a second start the ALTERs log "Duplicate column name" — that
-- is expected and harmless.
-- ════════════════════════════════════════════════════════════════════

-- Client verification (KYC) type: nida | voter | driving | none
ALTER TABLE customers ADD COLUMN id_type VARCHAR(20) NULL DEFAULT NULL AFTER address;

-- Repayment frequency + installment plan
ALTER TABLE loans ADD COLUMN repayment_frequency VARCHAR(10) NULL DEFAULT NULL;
ALTER TABLE loans ADD COLUMN installment_count INT NULL DEFAULT NULL;
ALTER TABLE loans ADD COLUMN installment_amount DECIMAL(12,2) NULL DEFAULT NULL;

-- Payment timestamp, payment mode and mobile-money agent fees
ALTER TABLE repayments ADD COLUMN paid_at DATETIME NULL DEFAULT NULL AFTER payment_date;
ALTER TABLE repayments ADD COLUMN payment_mode VARCHAR(20) NOT NULL DEFAULT 'cash';
ALTER TABLE repayments ADD COLUMN mobile_provider VARCHAR(20) NULL DEFAULT NULL;
ALTER TABLE repayments ADD COLUMN amount_sent DECIMAL(12,2) NULL DEFAULT NULL;
ALTER TABLE repayments ADD COLUMN agent_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- Guarantors — removed automatically with their loan
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Collateral assets — removed automatically with their loan
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Guarantor assets / collateral details (Mali za Mdhamini) — edited from the Edit Loan form
ALTER TABLE loan_guarantors ADD COLUMN assets_description TEXT NULL DEFAULT NULL AFTER id_number;
