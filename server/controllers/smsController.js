const { pool }   = require('../config/database');
const smsSvc     = require('../services/smsService');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail }   = require('../utils/helpers');

/* ── GET /api/sms/logs ────────────────────────────────────────── */
const getLogs = asyncHandler(async (req, res) => {
  const { type, status, search, limit = 50, offset = 0 } = req.query;
  const where = [];
  const params = [];

  if (type)   { where.push('sl.message_type = ?');                             params.push(type); }
  if (status) { where.push('sl.status = ?');                                   params.push(status); }
  if (search) {
    where.push('(c.full_name LIKE ? OR sl.phone LIKE ? OR sl.message LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [logs] = await pool.query(
    `SELECT sl.id, sl.phone, sl.message_type, sl.message, sl.status,
            sl.beem_request_id, sl.error, sl.retries, sl.sent_at, sl.created_at,
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
});

/* ── GET /api/sms/stats ───────────────────────────────────────── */
const getStats = asyncHandler(async (_req, res) => {
  const [[stats]] = await pool.query(`
    SELECT
      COUNT(*)                                                        AS total,
      COALESCE(SUM(status = 'sent'),    0)                           AS delivered,
      COALESCE(SUM(status = 'failed'),  0)                           AS failed,
      COALESCE(SUM(status = 'pending'), 0)                           AS pending,
      COALESCE(SUM(DATE(created_at) = CURDATE()), 0)                 AS today_total,
      COALESCE(SUM(status = 'sent' AND DATE(created_at) = CURDATE()), 0) AS today_sent
    FROM sms_logs
  `);
  res.json(stats);
});

/* ── POST /api/sms/send ───────────────────────────────────────── */
const sendManual = asyncHandler(async (req, res) => {
  const { phone, message, customer_id } = req.body;
  if (!phone)                      return fail(res, 'Phone number is required');
  if (!message)                    return fail(res, 'Message is required');
  if (message.trim().length < 5)   return fail(res, 'Message is too short');
  if (message.length > 320)        return fail(res, 'Message exceeds 320 characters');

  const result = await smsSvc.send({
    phone,
    message: message.trim(),
    customer_id: customer_id || null,
    message_type: 'manual',
  });

  res.json(result);
});

/* ── POST /api/sms/resend/:id ─────────────────────────────────── */
const resendLog = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return fail(res, 'Invalid log ID');

  const [[log]] = await pool.query('SELECT status FROM sms_logs WHERE id = ?', [id]);
  if (!log)                    return fail(res, 'SMS log not found', 404);
  if (log.status === 'sent')   return fail(res, 'This SMS was already delivered successfully');

  const result = await smsSvc.resend(id);
  res.json(result);
});

/* ── GET /api/sms/customers ───────────────────────────────────── */
const getCustomerList = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT id, full_name, phone FROM customers ORDER BY full_name ASC'
  );
  res.json(rows);
});

module.exports = { getLogs, getStats, sendManual, resendLog, getCustomerList };
