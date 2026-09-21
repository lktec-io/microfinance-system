-- ════════════════════════════════════════════════════════════════════
-- 004_group_lending.sql — Group Lending (Mfumo wa Mikopo ya Vikundi)
--   client_groups · group_members · member_businesses
--   + loans: group identity, 10% processing fee, group refund tracker
--
-- Applied AUTOMATICALLY when the backend starts (runMigrations() in
-- server/config/database.js). This file is a reference copy only.
--
-- Run a statement by hand ONLY if `npm run verify:schema` still reports it
-- missing after a restart. Every change is additive: nothing existing is
-- renamed, altered or dropped. On later restarts the ALTERs log
-- "Duplicate column name / foreign key" — that is expected and harmless.
--
-- NOTE: GROUPS is a reserved word in MySQL 8, so the table is client_groups.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS client_groups (
  id                             INT           PRIMARY KEY AUTO_INCREMENT,
  customer_id                    INT           NULL,
  group_name                     VARCHAR(120)  NOT NULL,
  business_type                  VARCHAR(80)   NOT NULL,
  market_name                    VARCHAR(120)  NOT NULL,
  business_location              VARCHAR(160)  NOT NULL,
  operational_duration_together  SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'months',
  group_leader_id                INT           NULL,
  created_by                     INT           NULL,
  created_at                     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_group_name (group_name),
  UNIQUE KEY uq_group_customer (customer_id),
  CONSTRAINT fk_group_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_group_creator FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_members (
  id                       INT           PRIMARY KEY AUTO_INCREMENT,
  group_id                 INT           NOT NULL,
  full_name                VARCHAR(100)  NOT NULL,
  parent_or_guardian_name  VARCHAR(100)  NOT NULL,
  phone_number             VARCHAR(20)   NOT NULL,
  identity_type            ENUM('NIDA','License','Voter_ID','None') NOT NULL DEFAULT 'None',
  identity_number          VARCHAR(50)   NULL,
  residential_address      VARCHAR(255)  NOT NULL,
  residential_area         VARCHAR(120)  NOT NULL,
  residency_duration       SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'months',
  marital_status           VARCHAR(20)   NOT NULL,
  created_at               TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_member_identity (identity_type, identity_number),
  INDEX idx_member_group (group_id),
  CONSTRAINT fk_member_group FOREIGN KEY (group_id)
    REFERENCES client_groups(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS member_businesses (
  id                       INT            PRIMARY KEY AUTO_INCREMENT,
  member_id                INT            NOT NULL,
  business_name            VARCHAR(120)   NOT NULL,
  business_type            VARCHAR(80)    NOT NULL,
  room_or_location_number  VARCHAR(40)    NULL,
  business_duration        SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'months',
  average_weekly_sales     DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  average_weekly_profit    DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  ownership_type           ENUM('Personal','Partnership','Other') NOT NULL DEFAULT 'Personal',
  group_leader_name        VARCHAR(100)   NULL,
  group_leader_phone       VARCHAR(20)    NULL,
  created_at               TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_business_member (member_id),
  CONSTRAINT fk_business_member FOREIGN KEY (member_id)
    REFERENCES group_members(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leader FK added after group_members exists (the two tables reference each other)
ALTER TABLE client_groups ADD CONSTRAINT fk_group_leader FOREIGN KEY (group_leader_id)
  REFERENCES group_members(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Loans: group identity, 10% processing fee, group refundable-incentive tracker
ALTER TABLE loans ADD COLUMN loan_type VARCHAR(10) NULL DEFAULT NULL;
ALTER TABLE loans ADD COLUMN group_id INT NULL DEFAULT NULL;
ALTER TABLE loans ADD CONSTRAINT fk_loan_group FOREIGN KEY (group_id)
  REFERENCES client_groups(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE loans ADD COLUMN processing_fee DECIMAL(12,2) NULL DEFAULT NULL;
ALTER TABLE loans ADD COLUMN processing_fee_rate DECIMAL(5,2) NULL DEFAULT NULL;
ALTER TABLE loans ADD COLUMN refund_incentive_rate DECIMAL(5,2) NULL DEFAULT NULL;
ALTER TABLE loans ADD COLUMN refund_incentive_amount DECIMAL(12,2) NULL DEFAULT NULL;
ALTER TABLE loans ADD COLUMN refund_status VARCHAR(12) NULL DEFAULT NULL;
ALTER TABLE loans ADD COLUMN refund_paid_at DATETIME NULL DEFAULT NULL;
