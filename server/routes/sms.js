const router = require('express').Router();
const ctrl   = require('../controllers/smsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// All authenticated users — manual SMS from loan pages
router.post('/send-thank-you/:loanId', ctrl.sendThankYou);
router.post('/send-reminder/:loanId',  ctrl.sendReminder);

// Admin only — SMS admin panel
router.get('/logs',        requireAdmin, ctrl.getLogs);
router.get('/stats',       requireAdmin, ctrl.getStats);
router.get('/customers',   requireAdmin, ctrl.getCustomerList);
router.post('/send',       requireAdmin, ctrl.sendManual);
router.post('/resend/:id', requireAdmin, ctrl.resendLog);

module.exports = router;
