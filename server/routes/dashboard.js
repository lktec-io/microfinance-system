const router = require('express').Router();
const ctrl   = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

/*
 * Dashboard data for every signed-in user (admin and staff).
 *
 * Only the aggregates the Dashboard and the notification bell display. The
 * Report Module itself (/api/reports, including the daily breakdown used for
 * analytics and PDF exports) is admin-only — see routes/reports.js.
 */
router.use(authenticate);

router.get('/summary',     ctrl.getSummary);
router.get('/recent',      ctrl.getRecent);
router.get('/monthly',     ctrl.getMonthly);
router.get('/overdue',     ctrl.getOverdue);
router.get('/commissions', ctrl.getCommissions);

module.exports = router;
