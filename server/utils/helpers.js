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

// ── Receipt ───────────────────────────────────────────────────
function generateReceiptNumber() {
  const date = today().replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RCP-${date}-${rand}`;
}

// ── Finance ────────────────────────────────────────────────────
function calcTotalPayable(principal, ratePercent) {
  const p = parseFloat(principal);
  const r = parseFloat(ratePercent);
  return parseFloat((p + (p * r / 100)).toFixed(2));
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

module.exports = { calcDueDate, today, generateReceiptNumber, calcTotalPayable, ok, fail, serverError };
