const router = require('express').Router();
const ctrl   = require('../controllers/groupController');
const { authenticate } = require('../middleware/auth');

/* Group lending — onboarding is open to every signed-in user (admin and staff). */
router.use(authenticate);

router.get('/',          ctrl.getAll);
router.get('/:id',       ctrl.getOne);
router.post('/register', ctrl.register);

module.exports = router;
