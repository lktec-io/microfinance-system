const router = require('express').Router();
const ctrl   = require('../controllers/smsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

router.get('/logs',        ctrl.getLogs);
router.get('/stats',       ctrl.getStats);
router.get('/customers',   ctrl.getCustomerList);
router.post('/send',       ctrl.sendManual);
router.post('/resend/:id', ctrl.resendLog);

module.exports = router;
