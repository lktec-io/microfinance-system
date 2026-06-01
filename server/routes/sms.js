const router = require('express').Router();
const ctrl   = require('../controllers/smsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// All authenticated staff — send SMS from loan pages
router.post('/send-thank-you/:loanId', ctrl.sendThankYou);
router.post('/send-reminder/:loanId',  ctrl.sendReminder);
router.post('/send-overdue/:loanId',   ctrl.sendOverdue);

// All authenticated staff — view SMS history and stats
router.get('/logs',        ctrl.getLogs);
router.get('/stats',       ctrl.getStats);

// Admin only — resend failed
router.post('/resend/:id', requireAdmin, ctrl.resendLog);

module.exports = router;
