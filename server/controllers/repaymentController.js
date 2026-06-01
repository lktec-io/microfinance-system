const svc        = require('../services/repaymentService');
const smsSvc     = require('../services/smsService');
const templates  = require('../services/smsTemplates');
const { pool }   = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail }   = require('../utils/helpers');
const logger     = require('../utils/logger');

const getAll = asyncHandler(async (_req, res) => {
  res.json(await svc.findAll());
});

const getByLoan = asyncHandler(async (req, res) => {
  res.json(await svc.findByLoan(req.params.loanId));
});

const getOne = asyncHandler(async (req, res) => {
  const repayment = await svc.findById(req.params.id);
  if (!repayment) return fail(res, 'Repayment not found', 404);
  res.json(repayment);
});

const create = asyncHandler(async (req, res) => {
  const { loan_id, amount } = req.body;
  if (!loan_id || !amount)       return fail(res, 'Loan ID and amount are required');
  if (parseFloat(amount) <= 0)   return fail(res, 'Amount must be greater than zero');

  const result = await svc.create({ ...req.body, created_by: req.user.id });
  res.status(201).json(result);

  // Fire-and-forget SMS notification after response is sent
  (async () => {
    try {
      const [[loanInfo]] = await pool.query(
        `SELECT l.customer_id, l.total_payable,
                c.full_name AS customer_name, c.phone
         FROM loans l
         JOIN customers c ON c.id = l.customer_id
         WHERE l.id = ?`,
        [loan_id]
      );
      if (loanInfo?.phone) {
        await smsSvc.sendSafe({
          phone:        loanInfo.phone,
          message:      templates.repaymentRecorded(
                          loanInfo.customer_name,
                          result.amount,
                          result.new_balance,
                          result.receipt_number
                        ),
          customer_id:  loanInfo.customer_id,
          loan_id:      parseInt(loan_id),
          message_type: 'repayment_recorded',
        });
      }
    } catch (err) {
      logger.error('Post-repayment SMS failed', err);
    }
  })();
});

module.exports = { getAll, getByLoan, getOne, create };
