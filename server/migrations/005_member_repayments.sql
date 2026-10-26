-- ════════════════════════════════════════════════════════════════════
-- 005_member_repayments.sql — member-level repayments inside group loans
--   group_loan_members  · the agreed share and 5% incentive per member
--   repayments.group_member_id · which member a payment belongs to
--
-- Applied AUTOMATICALLY when the backend starts (runMigrations() in
-- server/config/database.js). This file is a reference copy only.
--
-- Run a statement by hand ONLY if `npm run verify:schema` still reports it
-- missing after a restart. Every change is additive: nothing existing is
-- renamed, altered or dropped, and group loans booked before this migration
-- keep their loan-level refund exactly as it was.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS group_loan_members (
  id               INT           PRIMARY KEY AUTO_INCREMENT,
  loan_id          INT           NOT NULL,
  group_member_id  INT           NOT NULL,
  agreed_share     DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'this member share of total_payable',
  refund_amount    DECIMAL(12,2) NULL DEFAULT NULL     COMMENT '5% of the member principal share',
  refund_status    VARCHAR(12)   NULL DEFAULT NULL     COMMENT 'pending | eligible | forfeited | paid',
  refund_paid_at   DATETIME      NULL DEFAULT NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_loan_member (loan_id, group_member_id),
  INDEX idx_glm_loan (loan_id),
  INDEX idx_glm_member (group_member_id),
  CONSTRAINT fk_glm_loan FOREIGN KEY (loan_id)
    REFERENCES loans(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_glm_member FOREIGN KEY (group_member_id)
    REFERENCES group_members(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Which member a repayment belongs to. NULL = a group-level or individual payment.
ALTER TABLE repayments ADD COLUMN group_member_id INT NULL DEFAULT NULL;
ALTER TABLE repayments ADD CONSTRAINT fk_repayment_member FOREIGN KEY (group_member_id)
  REFERENCES group_members(id) ON DELETE SET NULL ON UPDATE CASCADE;
