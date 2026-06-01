const { pool }      = require('../config/database');
const smsSvc        = require('../services/smsService');
const templates     = require('../services/smsTemplates');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail }      = require('../utils/helpers');
const logger        = require('../utils/logger');

/* ── Helper: fetch loan + customer ───────────────────────────── */
async function getLoanWithCustomer(loanId) {
  const [[row]] = await pool.query(
    `SELECT l.id, l.loan_amount, l.total_payable, l.balance, l.due_date,
            l.status, l.interest_rate,
            c.id AS customer_id, c.full_name AS customer_name, c.phone
     FROM loans l
     JOIN customers c ON c.id = l.customer_id
     WHERE l.id = ?`,
    [parseInt(loanId)]
  );
  return row || null;
}

/* ── Helper: build + send, return structured response ─────────── */
async function doSend(loan, messageType, buildFn, res) {
  const message = buildFn(loan.customer_name, loan);
  const result  = await smsSvc.send({
    phone:        loan.phone,
    message,
    customer_id:  loan.customer_id,
    loan_id:      loan.id,
    message_type: messageType,
  });
  res.json({
    success:       result.success,
    error:         result.error || null,
    customer_name: loan.customer_name,
    phone:         loan.phone,
    message,
    sent_at:       new Date().toISOString(),
  });
}

/* ── POST /api/sms/send-thank-you/:loanId ─────────────────────── */
const sendThankYou = asyncHandler(async (req, res) => {
  try {
    const loan = await getLoanWithCustomer(req.params.loanId);
    if (!loan)       return fail(res, 'Loan not found', 404);
    if (!loan.phone) return fail(res, 'Customer has no phone number on record');
    await doSend(loan, 'thank_you', templates.thankYou, res);
  } catch (err) {
    logger.error('sendThankYou failed', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to send SMS' });
  }
});

/* ── POST /api/sms/send-reminder/:loanId ─────────────────────── */
const sendReminder = asyncHandler(async (req, res) => {
  try {
    const loan = await getLoanWithCustomer(req.params.loanId);
    if (!loan)                         return fail(res, 'Loan not found', 404);
    if (!loan.phone)                   return fail(res, 'Customer has no phone number on record');
    if (loan.status === 'paid')        return fail(res, 'This loan is already fully paid');
    await doSend(loan, 'reminder', templates.reminder, res);
  } catch (err) {
    logger.error('sendReminder failed', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to send SMS' });
  }
});

/* ── POST /api/sms/send-overdue/:loanId ──────────────────────── */
const sendOverdue = asyncHandler(async (req, res) => {
  try {
    const loan = await getLoanWithCustomer(req.params.loanId);
    if (!loan)                         return fail(res, 'Loan not found', 404);
    if (!loan.phone)                   return fail(res, 'Customer has no phone number on record');
    if (loan.status === 'paid')        return fail(res, 'This loan is already fully paid');
    await doSend(loan, 'overdue', templates.overdue, res);
  } catch (err) {
    logger.error('sendOverdue failed', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to send SMS' });
  }
});

/* ── GET /api/sms/logs ────────────────────────────────────────── */
const getLogs = asyncHandler(async (req, res) => {
  try {
    const { type, status, search, limit = 50, offset = 0 } = req.query;
    const where = [], params = [];

    if (type)   { where.push('sl.message_type = ?'); params.push(type); }
    if (status) { where.push('sl.status = ?');        params.push(status); }
    if (search) {
      where.push('(c.full_name LIKE ? OR sl.phone LIKE ? OR sl.message LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [logs] = await pool.query(
      `SELECT sl.id, sl.phone, sl.message_type, sl.message, sl.status,
              sl.error, sl.retries, sl.sent_at, sl.created_at,
              sl.customer_id, sl.loan_id,
              c.full_name AS customer_name
       FROM sms_logs sl
       LEFT JOIN customers c ON c.id = sl.customer_id
       ${whereSQL}
       ORDER BY sl.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM sms_logs sl
       LEFT JOIN customers c ON c.id = sl.customer_id
       ${whereSQL}`,
      params
    );

    res.json({ logs, total });
  } catch (err) {
    logger.error('getLogs failed', err);
    res.json({ logs: [], total: 0 });
  }
});

/* ── GET /api/sms/stats ───────────────────────────────────────── */
const SMS_STATS_DEFAULT = { total: 0, delivered: 0, failed: 0, pending: 0, today_total: 0, today_sent: 0 };
const getStats = asyncHandler(async (_req, res) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT
        COALESCE(COUNT(*), 0)                                              AS total,
        COALESCE(SUM(status = 'sent'),    0)                               AS delivered,
        COALESCE(SUM(status = 'failed'),  0)                               AS failed,
        COALESCE(SUM(status = 'pending'), 0)                               AS pending,
        COALESCE(SUM(DATE(created_at) = CURDATE()), 0)                     AS today_total,
        COALESCE(SUM(status = 'sent' AND DATE(created_at) = CURDATE()), 0) AS today_sent
      FROM sms_logs
    `);
    res.json({
      total:       Number(stats?.total       || 0),
      delivered:   Number(stats?.delivered   || 0),
      failed:      Number(stats?.failed      || 0),
      pending:     Number(stats?.pending     || 0),
      today_total: Number(stats?.today_total || 0),
      today_sent:  Number(stats?.today_sent  || 0),
    });
  } catch (err) {
    logger.error('getStats failed', err);
    res.json(SMS_STATS_DEFAULT);
  }
});

/* ── POST /api/sms/resend/:id ─────────────────────────────────── */
const resendLog = asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return fail(res, 'Invalid log ID');
    const [[log]] = await pool.query('SELECT status FROM sms_logs WHERE id = ?', [id]);
    if (!log)                  return fail(res, 'SMS log not found', 404);
    if (log.status === 'sent') return fail(res, 'This SMS was already delivered');
    const result = await smsSvc.resend(id);
    res.json(result);
  } catch (err) {
    logger.error('resendLog failed', err);
    res.status(500).json({ success: false, message: err.message || 'Resend failed' });
  }
});

module.exports = { getLogs, getStats, sendThankYou, sendReminder, sendOverdue, resendLog };
