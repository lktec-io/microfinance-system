const router = require('express').Router();
const ctrl   = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Every admin route requires a valid token AND the admin role
router.use(authenticate, requireAdmin);

router.post('/system-reset', ctrl.systemReset);

module.exports = router;
