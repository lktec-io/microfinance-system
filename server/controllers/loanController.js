const svc    = require('../services/loanService');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail, FREQUENCIES, MAX_MONEY } = require('../utils/helpers');

const MAX_SECURITIES = 20;

function frequencyError(value) {
  if (value == null || value === '') return null;
  return FREQUENCIES[value] ? null : 'Repayment frequency must be daily, weekly or monthly';
}

/** Validate the guarantor / collateral list sent with a loan application. */
function securitiesError(securities) {
  if (securities == null) return null;
  if (!Array.isArray(securities)) return 'Guarantors and assets must be sent as a list';
  if (securities.length > MAX_SECURITIES) return `A loan can have at most ${MAX_SECURITIES} guarantors and assets`;
  for (const [i, s] of securities.entries()) {
    const n = i + 1;
    if (s?.type === 'guarantor') {
      if (!String(s.full_name || '').trim() || !String(s.phone || '').trim()) {
        return `Guarantor ${n}: full name and phone number are required`;
      }
    } else if (s?.type === 'collateral') {
      if (!String(s.description || '').trim()) return `Asset ${n}: description is required`;
      const value = parseFloat(s.estimated_value);
      if (!(value >= 0)) return `Asset ${n}: estimated market value must be 0 or more`;
      if (value > MAX_MONEY) return `Asset ${n}: estimated market value is too large`;
    } else {
      return `Item ${n}: type must be "guarantor" or "collateral"`;
    }
  }
  return null;
}

const GUARANTOR_ASSETS_MAX = 1000;
const PHONE_RE = /^\+?[\d\s-]{9,16}$/;
const isPositiveId = v => Number.isInteger(Number(v)) && Number(v) > 0;

/** Validate the guarantor change sent by the Edit Loan form (undefined = no change). */
function guarantorChangeError(g) {
  if (g === undefined) return null;
  if (!g || typeof g !== 'object' || Array.isArray(g)) return 'Guarantor details must be an object';
  if (g.remove === true) return isPositiveId(g.id) ? null : 'Guarantor id is required to remove a guarantor';
  if (g.id != null && !isPositiveId(g.id)) return 'Guarantor id is invalid';
  if (g.replaces != null && !isPositiveId(g.replaces)) return 'Replaced guarantor id is invalid';
  if (g.id != null && g.replaces != null) return 'Send either the guarantor id or the id it replaces, not both';

  const name = String(g.name ?? '').trim();
  if (name.length < 2 || name.length > 100) return 'Guarantor full name is required (2–100 characters)';
  if (!PHONE_RE.test(String(g.phone ?? '').trim())) return 'Guarantor phone number is invalid';
  const idNumber = String(g.nida ?? '').trim();
  if (idNumber) {
    const compact = idNumber.replace(/[\s-]/g, '');
    const ok = /^\d+$/.test(compact) ? compact.length === 20 : /^[A-Za-z0-9/ -]{5,50}$/.test(idNumber);
    if (!ok) return 'Guarantor NIDA number must be 20 digits';
  }
  if (String(g.assets_description ?? '').length > GUARANTOR_ASSETS_MAX) {
    return `Guarantor assets description is too long (max ${GUARANTOR_ASSETS_MAX} characters)`;
  }
  return null;
}

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
  const invalid = frequencyError(req.body.repayment_frequency) || securitiesError(req.body.securities);
  if (invalid) return fail(res, invalid);
  if (!(await svc.customerExists(customer_id))) {
    return fail(res, 'Customer not found', 404);
  }
  res.status(201).json(await svc.create(req.body));
});

const update = asyncHandler(async (req, res) => {
  const invalid = frequencyError(req.body.repayment_frequency) || guarantorChangeError(req.body.guarantor);
  if (invalid) return fail(res, invalid);
  const existing = await svc.findById(req.params.id);
  if (!existing) return fail(res, 'Loan not found', 404);
  if (req.body.guarantor !== undefined && existing.status === 'paid') {
    return fail(res, 'Guarantor details cannot be changed on a fully repaid loan');
  }
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
