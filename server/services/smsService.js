const axios  = require('axios');
const { pool } = require('../config/database');
const logger   = require('../utils/logger');

const {
  BEEM_API_KEY,
  BEEM_SECRET_KEY,
  BEEM_SENDER_ID = 'BARAKA',
} = process.env;

const BEEM_URL   = 'https://apisms.beem.africa/v1/send';
const MAX_RETRIES = 3;

/* ── Phone normaliser ─────────────────────────────────────────── */
function formatPhone(raw) {
  let n = String(raw || '').replace(/\D/g, '');
  if (n.startsWith('0'))    n = '255' + n.slice(1);
  if (n.startsWith('+'))    n = n.slice(1);
  if (!n.startsWith('255')) n = '255' + n;
  return n;
}

/* ── BEEM API call ────────────────────────────────────────────── */
async function callBeem(phone, message) {
  if (!BEEM_API_KEY || !BEEM_SECRET_KEY) {
    throw new Error('BEEM credentials not configured — set BEEM_API_KEY and BEEM_SECRET_KEY in .env');
  }

  const auth = Buffer.from(`${BEEM_API_KEY}:${BEEM_SECRET_KEY}`).toString('base64');
  const { data } = await axios.post(
    BEEM_URL,
    {
      source_addr:   BEEM_SENDER_ID,
      schedule_time: '',
      encoding:      0,
      message,
      recipients: [{ recipient_id: 1, dest_addr: formatPhone(phone) }],
    },
    {
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Basic ${auth}`,
      },
      timeout: 15000,
    }
  );

  if (!data.successful) {
    throw Object.assign(
      new Error(data.message || 'BEEM API returned unsuccessful response'),
      { beemCode: data.code }
    );
  }
  return data;
}

/* ── DB logger ────────────────────────────────────────────────── */
async function logSms({ phone, customer_id, loan_id, message_type, message, status, request_id, error, retries }) {
  try {
    await pool.query(
      `INSERT INTO sms_logs
         (phone, customer_id, loan_id, message_type, message, status, beem_request_id, error, retries, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        phone,
        customer_id || null,
        loan_id     || null,
        message_type,
        message,
        status,
        request_id  || null,
        error       || null,
        retries     || 0,
        status === 'sent' ? new Date() : null,
      ]
    );
  } catch (dbErr) {
    logger.error('sms_logs insert failed', dbErr);
  }
}

/* ── Core send with retry ─────────────────────────────────────── */
async function send({ phone, message, customer_id = null, loan_id = null, message_type = 'manual' }) {
  const normalised = formatPhone(phone);
  let lastErr = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
    try {
      const result = await callBeem(normalised, message);
      await logSms({ phone: normalised, customer_id, loan_id, message_type, message, status: 'sent', request_id: result.request_id, retries: attempt });
      logger.success(`SMS sent → ${normalised} [${message_type}]`);
      return { success: true, request_id: result.request_id };
    } catch (err) {
      lastErr = err;
      logger.warn(`SMS attempt ${attempt + 1}/${MAX_RETRIES} failed for ${normalised}: ${err.message}`);
    }
  }

  await logSms({ phone: normalised, customer_id, loan_id, message_type, message, status: 'failed', error: lastErr?.message, retries: MAX_RETRIES });
  logger.error(`SMS failed after ${MAX_RETRIES} attempts → ${normalised}`, lastErr);
  return { success: false, error: lastErr?.message };
}

/* ── Resend (updates existing log row) ───────────────────────── */
async function resend(logId) {
  const [[log]] = await pool.query('SELECT * FROM sms_logs WHERE id = ?', [logId]);
  if (!log) throw Object.assign(new Error('SMS log not found'), { status: 404 });

  let lastErr = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    try {
      const result = await callBeem(log.phone, log.message);
      await pool.query(
        'UPDATE sms_logs SET status=?, beem_request_id=?, error=NULL, retries=retries+?, sent_at=NOW(), updated_at=NOW() WHERE id=?',
        ['sent', result.request_id, attempt + 1, logId]
      );
      logger.success(`SMS resent → ${log.phone} [log #${logId}]`);
      return { success: true, request_id: result.request_id };
    } catch (err) {
      lastErr = err;
    }
  }

  await pool.query(
    'UPDATE sms_logs SET retries=retries+?, error=?, updated_at=NOW() WHERE id=?',
    [MAX_RETRIES, lastErr?.message, logId]
  );
  return { success: false, error: lastErr?.message };
}

/* ── Fire-and-forget (never throws) ──────────────────────────── */
async function sendSafe(params) {
  try { return await send(params); }
  catch { return { success: false }; }
}

module.exports = { send, sendSafe, resend, formatPhone };
