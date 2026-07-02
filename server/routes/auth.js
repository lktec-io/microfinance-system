const router = require('express').Router();
const ctrl   = require('../controllers/authController');
const { authenticate, requireAdmin }                    = require('../middleware/auth');
const { rateLimitLogin, rateLimitForgotPassword }       = require('../middleware/validate');

router.post('/login',                   rateLimitLogin,          ctrl.login);
router.post('/forgot-password',         rateLimitForgotPassword, ctrl.forgotPassword);
router.post('/reset-password/:token',                            ctrl.resetPassword);
router.post('/register',    authenticate, requireAdmin, ctrl.register);
router.get('/me',           authenticate, ctrl.getMe);
router.get('/users',        authenticate, requireAdmin, ctrl.getUsers);
router.put('/users/:id',    authenticate, requireAdmin, ctrl.updateUser);
router.delete('/users/:id', authenticate, requireAdmin, ctrl.deleteUser);

module.exports = router;
