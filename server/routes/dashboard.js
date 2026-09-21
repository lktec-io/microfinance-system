const router = require('express').Router();
const ctrl   = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/*
 * Dashboard data for every signed-in user (admin and staff).
 *
 * Staff (any role that is not "admin") get basic operational metrics only:
 *  - GET /commissions (the mobile money agent-fee ledger) is refused with 403
 *    before any query runs;
 *  - every other response has fee / commission fields removed at any depth,
 *    so collected fee balances never appear in staff network traffic.
 * The role comes from the verified JWT payload (req.user), never the request.
 *
 * The Report Module itself (/api/reports) is admin-only — see routes/reports.js.
 */
const FORBIDDEN_MESSAGE = 'Hauna ruhusa ya kuona ukurasa huu / You do not have permission to access this page.';

/** Fee / commission fields a staff session must never receive. */
const FEE_FIELDS = new Set([
  'agent_fee', 'amount_sent', 'mobile_provider',
  'total_fees', 'month_fees', 'total_sent', 'total_credited', 'by_provider',
  'processing_fees', 'refunds_due', 'refunds_paid',
]);

const isAdmin = req => req.user?.role === 'admin';

/** Deep copy of a JSON payload without fee fields (Dates and primitives kept as-is). */
function stripFeeFields(value) {
  if (Array.isArray(value)) return value.map(stripFeeFields);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !FEE_FIELDS.has(key))
        .map(([key, v]) => [key, stripFeeFields(v)])
    );
  }
  return value;
}

/** For non-admin sessions, redact fee fields from every JSON response on this router. */
function redactFeesForStaff(req, res, next) {
  if (isAdmin(req)) return next();
  const send = res.json.bind(res);
  res.json = body => send(stripFeeFields(body));
  next();
}

/** Mobile money commission ledger — admin only. */
function requireAdminForCommissions(req, res, next) {
  if (isAdmin(req)) return next();
  logger.warn(`Commission ledger access denied: user ${req.user?.id ?? 'unknown'} (role: ${req.user?.role ?? 'none'}) → ${req.method} ${req.originalUrl}`);
  return res.status(403).json({ code: 'FORBIDDEN_COMMISSIONS', message: FORBIDDEN_MESSAGE });
}

router.use(authenticate, redactFeesForStaff);

router.get('/summary',     ctrl.getSummary);
router.get('/recent',      ctrl.getRecent);
router.get('/monthly',     ctrl.getMonthly);
router.get('/overdue',     ctrl.getOverdue);
router.get('/commissions', requireAdminForCommissions, ctrl.getCommissions);

module.exports = router;
module.exports.stripFeeFields = stripFeeFields;
module.exports.FEE_FIELDS = FEE_FIELDS;
