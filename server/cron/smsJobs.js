const cron      = require('node-cron');
const { pool }  = require('../config/database');
const smsSvc    = require('../services/smsService');
const templates = require('../services/smsTemplates');
const logger    = require('../utils/logger');

/* ── Deduplication: only one SMS per loan per day per type ─────── */
const alreadySentToday = (loanId, type) =>
  pool.query(
    `SELECT 1 FROM sms_logs
     WHERE loan_id = ? AND message_type = ? AND DATE(created_at) = CURDATE()
     LIMIT 1`,
    [loanId, type]
  ).then(([rows]) => rows.length > 0);

/* ── Repayment reminders — active loans due within 3 days ─────── */
async function sendRepaymentReminders() {
  logger.info('SMS Cron: checking repayment reminders…');
  try {
    const [loans] = await pool.query(`
      SELECT l.id, l.balance, l.due_date, l.loan_amount, l.total_payable,
             c.full_name AS customer_name, c.phone, c.id AS customer_id
      FROM loans l
      JOIN customers c ON c.id = l.customer_id
      WHERE l.status  = 'active'
        AND l.balance > 0
        AND l.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
    `);

    let sent = 0;
    for (const loan of loans) {
      if (await alreadySentToday(loan.id, 'reminder')) continue;
      await smsSvc.sendSafe({
        phone:        loan.phone,
        message:      templates.reminder(loan.customer_name, loan),
        customer_id:  loan.customer_id,
        loan_id:      loan.id,
        message_type: 'reminder',
      });
      sent++;
    }
    logger.info(`SMS Cron: ${sent} reminder(s) sent`);
  } catch (err) {
    logger.error('SMS Cron: reminder job failed', err);
  }
}

/* ── Overdue notifications ────────────────────────────────────── */
async function sendOverdueNotifications() {
  logger.info('SMS Cron: checking overdue loans…');
  try {
    const [loans] = await pool.query(`
      SELECT l.id, l.balance, l.due_date, l.loan_amount, l.total_payable,
             c.full_name AS customer_name, c.phone, c.id AS customer_id
      FROM loans l
      JOIN customers c ON c.id = l.customer_id
      WHERE l.status  = 'overdue'
        AND l.balance > 0
    `);

    let sent = 0;
    for (const loan of loans) {
      if (await alreadySentToday(loan.id, 'overdue')) continue;
      await smsSvc.sendSafe({
        phone:        loan.phone,
        message:      templates.overdue(loan.customer_name, loan),
        customer_id:  loan.customer_id,
        loan_id:      loan.id,
        message_type: 'overdue',
      });
      sent++;
    }
    logger.info(`SMS Cron: ${sent} overdue notice(s) sent`);
  } catch (err) {
    logger.error('SMS Cron: overdue job failed', err);
  }
}

function start() {
  // Daily at 09:00 East Africa Time
  cron.schedule('0 9 * * *', async () => {
    await sendRepaymentReminders();
    await sendOverdueNotifications();
  }, { timezone: 'Africa/Dar_es_Salaam' });

  logger.info('SMS cron jobs scheduled — daily 09:00 EAT');
}

module.exports = { start, sendRepaymentReminders, sendOverdueNotifications };
