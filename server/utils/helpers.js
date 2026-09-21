// ── Date & Duration ──────────────────────────────────────────
function calcDueDate(startDate, value, unit) {
  const d = new Date(startDate);
  if (unit === 'days')   d.setDate(d.getDate() + Number(value));
  if (unit === 'weeks')  d.setDate(d.getDate() + Number(value) * 7);
  if (unit === 'months') d.setMonth(d.getMonth() + Number(value));
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' from a DATE column value (Date object) or a date string. */
function isoDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

// ── Local time (Tanzania, EAT) ────────────────────────────────
const LOCAL_TZ = 'Africa/Dar_es_Salaam';

/** Current wall-clock time in Tanzania as 'YYYY-MM-DD HH:mm:ss' (optionally offset). */
function nowLocal(offsetMs = 0) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LOCAL_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(Date.now() + offsetMs));
  const get = type => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

/** True for a real calendar timestamp in 'YYYY-MM-DD HH:mm:ss' form. */
function isValidTimestamp(value) {
  const s = String(value || '');
  if (!TIMESTAMP_RE.test(s)) return false;
  const d = new Date(`${s.replace(' ', 'T')}Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 19).replace('T', ' ') === s;
}

// ── Receipt ───────────────────────────────────────────────────
function generateReceiptNumber() {
  const date = today().replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RCP-${date}-${rand}`;
}

// ── Finance ────────────────────────────────────────────────────
/** Largest amount a DECIMAL(12,2) column can hold — larger values are rejected up front. */
const MAX_MONEY = 9999999999.99;

/** Processing fee (ada ya fomu): % of principal, paid upfront on every new loan. */
const PROCESSING_FEE_RATE = 10;
/** Group incentive: % of principal refunded to a group after on-time full repayment. */
const GROUP_REFUND_RATE = 5;

const percentOf = (amount, rate) => {
  const a = parseFloat(amount);
  return a > 0 ? parseFloat((a * rate / 100).toFixed(2)) : 0;
};
const calcProcessingFee = principal => percentOf(principal, PROCESSING_FEE_RATE);
const calcGroupRefund   = principal => percentOf(principal, GROUP_REFUND_RATE);

function calcTotalPayable(principal, ratePercent) {
  const p = parseFloat(principal);
  const r = parseFloat(ratePercent);
  return parseFloat((p + (p * r / 100)).toFixed(2));
}

// ── Repayment frequency & installments ────────────────────────
// Mirrored exactly in client/src/utils/finance.js so previews match stored values.
const FREQUENCIES = {
  daily:   { unit: 'days',   step: 1 },
  weekly:  { unit: 'days',   step: 7 },
  monthly: { unit: 'months', step: 1 },
};

/**
 * Number of installments between start and due date. The first installment
 * falls one period after the start date; we keep stepping one period until
 * the due date is reached.
 */
function countInstallments(startDate, dueDate, frequency) {
  const f     = FREQUENCIES[frequency];
  const start = isoDate(startDate);
  const due   = isoDate(dueDate);
  if (!f || !start || !due) return null;
  if (due <= start) return 1;
  let n = 0;
  let cursor = start;
  while (cursor < due && n < 3660) {
    n += 1;
    cursor = calcDueDate(start, n * f.step, f.unit);
  }
  return n;
}

/** Equal installment, rounded to cents (the final installment absorbs rounding). */
function calcInstallmentAmount(total, count) {
  const t = parseFloat(total);
  return count > 0 && t > 0 ? parseFloat((t / count).toFixed(2)) : null;
}

// ── Responses ─────────────────────────────────────────────────
function ok(res, data, status = 200) {
  return res.status(status).json(data);
}

function fail(res, message, status = 400) {
  return res.status(status).json({ message });
}

function serverError(res, err, label = 'Server error') {
  const logger = require('./logger');
  logger.error(label, err);
  return res.status(500).json({ message: 'Internal server error' });
}

module.exports = {
  calcDueDate, today, isoDate, nowLocal, isValidTimestamp,
  generateReceiptNumber, calcTotalPayable, MAX_MONEY,
  PROCESSING_FEE_RATE, GROUP_REFUND_RATE, calcProcessingFee, calcGroupRefund,
  FREQUENCIES, countInstallments, calcInstallmentAmount,
  ok, fail, serverError,
};
