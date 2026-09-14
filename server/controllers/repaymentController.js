const svc    = require('../services/repaymentService');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail, isValidTimestamp, nowLocal } = require('../utils/helpers');

const CLOCK_DRIFT_MS = 10 * 60 * 1000;   // tolerate a device clock up to 10 minutes fast

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
  const { loan_id, amount, payment_mode, mobile_provider, amount_sent, agent_fee, paid_at } = req.body;
  if (!loan_id) return fail(res, 'Loan ID and amount are required');

  if (payment_mode != null && payment_mode !== '' && !svc.PAYMENT_MODES.includes(payment_mode)) {
    return fail(res, 'Payment mode must be cash, mobile_money or bank');
  }

  if (payment_mode === 'mobile_money') {
    const sent = parseFloat(amount_sent);
    const fee  = parseFloat(agent_fee ?? 0);
    if (!svc.MOBILE_PROVIDERS.includes(mobile_provider)) return fail(res, 'Select the mobile money provider');
    if (!(sent > 0))  return fail(res, 'Amount sent must be greater than zero');
    if (!(fee >= 0))  return fail(res, 'Agent fee cannot be negative');
    if (fee >= sent)  return fail(res, 'Agent fee must be less than the amount sent');
  } else {
    if (!amount)                 return fail(res, 'Loan ID and amount are required');
    if (parseFloat(amount) <= 0) return fail(res, 'Amount must be greater than zero');
  }

  if (paid_at != null && paid_at !== '') {
    if (!isValidTimestamp(paid_at)) return fail(res, 'Payment time must use the format YYYY-MM-DD HH:mm:ss');
    if (paid_at > nowLocal(CLOCK_DRIFT_MS)) return fail(res, 'Payment time cannot be in the future');
  }

  const result = await svc.create({ ...req.body, paid_at: paid_at || null, created_by: req.user.id });
  res.status(201).json(result);
});

module.exports = { getAll, getByLoan, getOne, create };
