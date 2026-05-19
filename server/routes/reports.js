const router = require('express').Router();
const ctrl   = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/summary',  ctrl.getSummary);
router.get('/recent',   ctrl.getRecent);
router.get('/daily',    ctrl.getDaily);
router.get('/monthly',  ctrl.getMonthly);
router.get('/overdue',  ctrl.getOverdue);

module.exports = router;
