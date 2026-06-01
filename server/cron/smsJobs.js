const cron      = require('node-cron');
const { pool }  = require('../config/database');
const smsSvc    = require('../services/smsService');
const templates = require('../services/smsTemplates');
const logger    = require('../utils/logger');

/* ── Repayment reminders — active loans due within 3 days ─────── */
async function sendRepaymentReminders() {
  logger.info('SMS Cron: checking repayment reminders…');
  try {
    const [loans] = await pool.query(`
      SELECT l.id, l.balance, l.due_date,
             c.full_name AS customer_name, c.phone, c.id AS customer_id
      FROM loans l
      JOIN customers c ON c.id = l.customer_id
      WHERE l.status   = 'active'
        AND l.balance  > 0
        AND l.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
        AND NOT EXISTS (
          SELECT 1 FROM sms_logs sl
          WHERE sl.loan_id      = l.id
            AND sl.message_type = 'repayment_reminder'
            AND DATE(sl.created_at) = CURDATE()
        )
    `);

    logger.info(`SMS Cron: ${loans.length} reminder(s) queued`);
    for (const loan of loans) {
      await smsSvc.sendSafe({
        phone:        loan.phone,
        message:      templates.repaymentReminder(loan.customer_name, loan.balance, loan.due_date),
        customer_id:  loan.customer_id,
        loan_id:      loan.id,
        message_type: 'repayment_reminder',
      });
    }
  } catch (err) {
    logger.error('SMS Cron: repayment reminder job failed', err);
  }
}

/* ── Overdue notifications ────────────────────────────────────── */
async function sendOverdueNotifications() {
  logger.info('SMS Cron: checking overdue notifications…');
  try {
    const [loans] = await pool.query(`
      SELECT l.id, l.balance, l.due_date,
             c.full_name AS customer_name, c.phone, c.id AS customer_id
      FROM loans l
      JOIN customers c ON c.id = l.customer_id
      WHERE l.status  = 'overdue'
        AND l.balance > 0
        AND NOT EXISTS (
          SELECT 1 FROM sms_logs sl
          WHERE sl.loan_id      = l.id
            AND sl.message_type = 'overdue_notice'
            AND DATE(sl.created_at) = CURDATE()
        )
    `);

    logger.info(`SMS Cron: ${loans.length} overdue notice(s) queued`);
    for (const loan of loans) {
      await smsSvc.sendSafe({
        phone:        loan.phone,
        message:      templates.overdueNotice(loan.customer_name, loan.balance, loan.due_date),
        customer_id:  loan.customer_id,
        loan_id:      loan.id,
        message_type: 'overdue_notice',
      });
    }
  } catch (err) {
    logger.error('SMS Cron: overdue notification job failed', err);
  }
}

function start() {
  // Run daily at 09:00 East Africa Time (UTC+3)
  cron.schedule('0 9 * * *', async () => {
    await sendRepaymentReminders();
    await sendOverdueNotifications();
  }, { timezone: 'Africa/Dar_es_Salaam' });

  logger.info('SMS cron jobs scheduled — daily 09:00 EAT');
}

module.exports = { start, sendRepaymentReminders, sendOverdueNotifications };
