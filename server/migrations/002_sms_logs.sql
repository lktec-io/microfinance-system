-- ============================================================
--  SMS Logs Table — Baraka Microcredit
--  Run once against the live database.
-- ============================================================

CREATE TABLE IF NOT EXISTS sms_logs (
  id              INT           PRIMARY KEY AUTO_INCREMENT,
  phone           VARCHAR(20)   NOT NULL,
  customer_id     INT           DEFAULT NULL,
  loan_id         INT           DEFAULT NULL,
  message_type    ENUM('thank_you','reminder','overdue')
                                NOT NULL DEFAULT 'reminder',
  message         TEXT          NOT NULL,
  status          ENUM('sent','failed','pending')
                                NOT NULL DEFAULT 'pending',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If table already exists with old ENUM, run:
-- ALTER TABLE sms_logs MODIFY COLUMN message_type
--   ENUM('thank_you','reminder','overdue') NOT NULL DEFAULT 'reminder';
