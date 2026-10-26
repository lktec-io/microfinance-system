const svc    = require('../services/loanService');
const groupSvc    = require('../services/groupService');
const memberLoans = require('../services/memberLoanService');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail, FREQUENCIES, MAX_MONEY, calcTotalPayable } = require('../utils/helpers');

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

const LOAN_TYPES = ['individual', 'group'];
const SHARE_TOLERANCE = 1;          // allow a 1 TZS rounding gap on the split

/**
 * Agreed member shares for a group loan: [{ group_member_id, agreed_share }].
 * Optional — without them the loan keeps the loan-level incentive. When given,
 * every member must belong to the group and the shares must add up to the
 * total payable, so a member's target can never be invented later.
 */
function memberSharesError(shares, { groupMemberIds, totalPayable }) {
  if (shares == null) return null;
  if (!Array.isArray(shares) || shares.length === 0) return 'Member shares must be a list';
  const seen = new Set();
  let sum = 0;
  for (const [i, s] of shares.entries()) {
    const who = `Member ${i + 1}`;
    if (!s || typeof s !== 'object') return `${who}: share details are missing`;
    const id = Number(s.group_member_id);
    if (!Number.isInteger(id) || id < 1) return `${who}: invalid member`;
    if (!groupMemberIds.has(id)) return `${who} does not belong to this group`;
    if (seen.has(id)) return `${who} is listed twice`;
    seen.add(id);
    const share = Number(s.agreed_share);
    if (!Number.isFinite(share) || share <= 0) return `${who}: enter a share greater than zero`;
    if (share > MAX_MONEY) return `${who}: share is too large`;
    sum += share;
  }
  if (Math.abs(sum - totalPayable) > SHARE_TOLERANCE) {
    return `Member shares must add up to the total payable (${totalPayable.toFixed(2)}), not ${sum.toFixed(2)}`;
  }
  return null;
}

const create = asyncHandler(async (req, res) => {
  const loanType = req.body.loan_type == null || req.body.loan_type === '' ? 'individual' : req.body.loan_type;
  if (!LOAN_TYPES.includes(loanType)) return fail(res, 'Loan type must be individual or group');
  if (loanType === 'group' && !isPositiveId(req.body.group_id)) return fail(res, 'Select the group for a group loan');

  // Group loans are booked to the group's borrower record; a group's borrower is always a group loan.
  let group = null;
  if (loanType === 'group') {
    group = await svc.findGroupForLoan({ group_id: Number(req.body.group_id) });
    if (!group) return fail(res, 'Group not found', 404);
  } else if (req.body.customer_id) {
    group = await svc.findGroupForLoan({ customer_id: req.body.customer_id });
  }
  const customer_id = group ? group.customer_id : req.body.customer_id;

  const { loan_amount, interest_rate, duration_value, duration_unit } = req.body;
  if (!customer_id || !loan_amount || interest_rate == null || !duration_value || !duration_unit) {
    return fail(res, 'Missing required fields');
  }
  const invalid = frequencyError(req.body.repayment_frequency) || securitiesError(req.body.securities);
  if (invalid) return fail(res, invalid);
  if (!(await svc.customerExists(customer_id))) {
    return fail(res, 'Customer not found', 404);
  }

  let memberShares = null;
  if (group && req.body.member_shares != null) {
    const members = await groupSvc.findById(group.id);
    const ids = new Set((members?.members || []).map(m => Number(m.id)));
    const totalPayable = calcTotalPayable(parseFloat(loan_amount), parseFloat(interest_rate));
    const shareError = memberSharesError(req.body.member_shares, { groupMemberIds: ids, totalPayable });
    if (shareError) return fail(res, shareError);
    memberShares = req.body.member_shares;
  }

  res.status(201).json(await svc.create({
    ...req.body,
    customer_id,
    loan_type: group ? 'group' : 'individual',
    group_id:  group ? group.id : null,
    member_shares: memberShares,
  }));
});

/** GET /api/loans/:id/members — agreed shares and live progress per member. */
const getMembers = asyncHandler(async (req, res) => {
  const loan = await svc.findById(req.params.id);
  if (!loan) return fail(res, 'Loan not found', 404);
  res.json(await memberLoans.findForLoan(req.params.id));
});

/** PATCH /api/loans/:id/members/:memberId/refund — admin pays one member out. */
const markMemberRefundPaid = asyncHandler(async (req, res) => {
  const loan = await svc.findById(req.params.id);
  if (!loan) return fail(res, 'Loan not found', 404);
  if (loan.loan_type !== 'group') return fail(res, 'Only group loans carry a refundable incentive');

  const rows = await memberLoans.findForLoan(req.params.id);
  const row = rows.find(r => Number(r.group_member_id) === Number(req.params.memberId));
  if (!row) return fail(res, 'That member has no agreed share on this loan', 404);
  if (row.refund_status !== 'eligible') {
    return fail(res, `${row.full_name}'s refund is not due (status: ${row.refund_status || 'none'})`);
  }
  const updated = await memberLoans.markRefundPaid(req.params.id, req.params.memberId);
  if (!updated) return fail(res, 'The refund was already processed', 409);
  res.json(updated);
});

const markRefundPaid = asyncHandler(async (req, res) => {
  const loan = await svc.findById(req.params.id);
  if (!loan) return fail(res, 'Loan not found', 404);
  if (loan.loan_type !== 'group') return fail(res, 'Only group loans carry a refundable incentive');
  if (loan.refund_status !== 'eligible') {
    return fail(res, `The refund is not due (status: ${loan.refund_status || 'none'})`);
  }
  const updated = await svc.markRefundPaid(req.params.id);
  if (!updated) return fail(res, 'The refund was already processed', 409);
  res.json(updated);
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

module.exports = {
  getMembers, markMemberRefundPaid, getAll, getOne, getByCustomer, create, update, remove, markRefundPaid };
