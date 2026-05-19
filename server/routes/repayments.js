const router = require('express').Router();
const ctrl   = require('../controllers/repaymentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/',              ctrl.getAll);
router.get('/loan/:loanId',  ctrl.getByLoan);
router.get('/:id',           ctrl.getOne);
router.post('/',             ctrl.create);

module.exports = router;
