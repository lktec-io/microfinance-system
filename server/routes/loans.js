const router = require('express').Router();
const ctrl   = require('../controllers/loanController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/',                       ctrl.getAll);
router.get('/:id',                    ctrl.getOne);
router.get('/customer/:customerId',   ctrl.getByCustomer);
router.post('/',                      ctrl.create);
router.put('/:id',                    ctrl.update);
router.patch('/:id/refund',           requireAdmin, ctrl.markRefundPaid);   // group refund payout — admin only
router.delete('/:id',                 ctrl.remove);

module.exports = router;
