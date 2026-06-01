const svc    = require('../services/loanService');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail } = require('../utils/helpers');

const getAll = asyncHandler(async (_req, res) => {
  res.json(await svc.findAll());
});

const getOne = asyncHandler(async (req, res) => {
  const loan = await svc.findById(req.params.id);
  if (!loan) return fail(res, 'Loan not found', 404);
  res.json(loan);
});

const getByCustomer = asyncHandler(async (req, res) => {
  res.json(await svc.findByCustomer(req.params.customerId));
});

const create = asyncHandler(async (req, res) => {
  const { customer_id, loan_amount, interest_rate, duration_value, duration_unit } = req.body;
  if (!customer_id || !loan_amount || interest_rate == null || !duration_value || !duration_unit) {
    return fail(res, 'Missing required fields');
  }
  if (!(await svc.customerExists(customer_id))) {
    return fail(res, 'Customer not found', 404);
  }
  res.status(201).json(await svc.create(req.body));
});

const update = asyncHandler(async (req, res) => {
  const existing = await svc.findById(req.params.id);
  if (!existing) return fail(res, 'Loan not found', 404);
  res.json(await svc.update(req.params.id, req.body));
});

const remove = asyncHandler(async (req, res) => {
  if (await svc.hasRepayments(req.params.id)) {
    return fail(res, 'Cannot delete loan with existing repayments');
  }
  const deleted = await svc.remove(req.params.id);
  if (!deleted) return fail(res, 'Loan not found', 404);
  res.json({ message: 'Loan deleted' });
});

module.exports = { getAll, getOne, getByCustomer, create, update, remove };
