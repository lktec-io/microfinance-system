const router = require('express').Router();
const ctrl   = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/*
 * Report Module — ADMIN ONLY.
 *
 * Every /api/reports endpoint is refused for non-admin sessions with 403 before
 * any query runs. The role is read from the verified JWT payload (req.user),
 * never from the request, so a staff token cannot be edited to pass.
 *
 * The Dashboard and notification bell (used by staff too) read their
 * aggregates from /api/dashboard instead — see routes/dashboard.js.
 */
const FORBIDDEN_MESSAGE = 'Hauna ruhusa ya kuona ukurasa huu / You do not have permission to access this page.';

function requireReportAccess(req, res, next) {
  if (req.user?.role === 'admin') return next();
  logger.warn(`Report access denied: user ${req.user?.id ?? 'unknown'} (role: ${req.user?.role ?? 'none'}) → ${req.method} ${req.originalUrl}`);
  return res.status(403).json({ code: 'FORBIDDEN_REPORTS', message: FORBIDDEN_MESSAGE });
}

router.use(authenticate, requireReportAccess);

router.get('/summary',     ctrl.getSummary);
router.get('/recent',      ctrl.getRecent);
router.get('/daily',       ctrl.getDaily);
router.get('/monthly',     ctrl.getMonthly);
router.get('/overdue',     ctrl.getOverdue);
router.get('/commissions', ctrl.getCommissions);

module.exports = router;
module.exports.requireReportAccess = requireReportAccess;
