const svc    = require('../services/repaymentService');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail } = require('../utils/helpers');

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
});

module.exports = { getAll, getByLoan, getOne, create };
