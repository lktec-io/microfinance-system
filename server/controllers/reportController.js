const svc    = require('../services/reportService');
const statement = require('../services/statementService');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

const SUMMARY_DEFAULT = {
  customers: 0, total_loans: 0, loans_amount: 0,
  repayments: 0, collected: 0, outstanding: 0,
  active_loans: 0, overdue_loans: 0,
  loan_status: { active: 0, pending: 0, paid: 0, overdue: 0 },
};
const RECENT_DEFAULT = { repayments: [], customers: [], loans: [] };

function safeSend(res, data) {
  if (!res.headersSent) res.json(data);
}

const getSummary = asyncHandler(async (_req, res) => {
  try {
    const data = await svc.getSummary();
    safeSend(res, data);
  } catch (err) {
    logger.error('getSummary failed', err);
    safeSend(res, SUMMARY_DEFAULT);
  }
});

const getRecent = asyncHandler(async (_req, res) => {
  try {
    const data = await svc.getRecent();
    safeSend(res, data);
  } catch (err) {
    logger.error('getRecent failed', err);
    safeSend(res, RECENT_DEFAULT);
  }
});

const getDaily = asyncHandler(async (_req, res) => {
  try {
    const data = await svc.getDaily();
    safeSend(res, data);
  } catch (err) {
    logger.error('getDaily failed', err);
    safeSend(res, { loans: [], repayments: [] });
  }
});

const getMonthly = asyncHandler(async (_req, res) => {
  try {
    const data = await svc.getMonthly();
    safeSend(res, data);
  } catch (err) {
    logger.error('getMonthly failed', err);
    safeSend(res, { loans: [], repayments: [] });
  }
});

const getOverdue = asyncHandler(async (_req, res) => {
  try {
    const data = await svc.getOverdue();
    safeSend(res, data);
  } catch (err) {
    logger.error('getOverdue failed', err);
    safeSend(res, []);
  }
});

const COMMISSIONS_DEFAULT = { count: 0, total_fees: 0, total_sent: 0, total_credited: 0, month_fees: 0, by_provider: [], recent: [] };

const getCommissions = asyncHandler(async (_req, res) => {
  try {
    const data = await svc.getCommissions();
    safeSend(res, data);
  } catch (err) {
    logger.error('getCommissions failed', err);
    safeSend(res, COMMISSIONS_DEFAULT);
  }
});


/* ── Reporting directories & the full financial statement (admin only) ──
 *
 * These five are read-only, so a failure must never take the terminal down
 * with it. Each one degrades to a payload of the SAME SHAPE the view expects —
 * the client destructures `metrics`/`clients`/`entries` directly, and an error
 * body of a different shape is what turns a server fault into a blank screen.
 *
 * The fallback carries `degraded: true`. That matters: a zero that came from a
 * failed query must not be displayed as a real balance, so the view shows the
 * figures as unavailable instead of asserting the business took in nothing.
 */
const EMPTY_INDIVIDUALS = {
  metrics: {
    capital_disbursed: 0, outstanding: 0, total_repaid: 0, active_borrowers: 0, loans: 0,
    collected_this_month: 0, expected_this_month: 0, repayment_rate: 0,
    par30_balance: 0, par30_pct: 0,
  },
  clients: [],
};
const EMPTY_GROUPS = {
  metrics: {
    groups_registered: 0, members: 0, capital_disbursed: 0, active_portfolio: 0,
    total_repaid: 0, fees: 0, loans: 0, active_loans: 0,
    liability_accrued: 0, liability_earned: 0, liability_paid: 0, allocations: 0,
  },
  groups: [],
};
const EMPTY_STATEMENT = {
  generated_at: null,
  portfolio: {
    loans: 0, principal_disbursed: 0, total_payable: 0, interest_booked: 0, total_repaid: 0,
    outstanding: 0, active_loans: 0, overdue_loans: 0, closed_loans: 0,
    individual_loans: 0, individual_principal: 0, group_loans: 0, group_principal: 0,
    par_balance: 0, par30_balance: 0, par_loans: 0, par_pct: 0, par30_pct: 0,
  },
  sectors: {
    individual: { loans: 0, fees: 0, interest: 0, collected: 0, payments: 0, revenue: 0 },
    group: { loans: 0, fees: 0, interest: 0, collected: 0, payments: 0, revenue: 0 },
  },
  liabilities: { refundable_accrued: 0, refundable_pending: 0, refundable_forfeited: 0, allocations: 0 },
  cash: { gross_outbound: 0, gross_recovered: 0, immediate_revenue: 0, operating_expenses: 0, net_system_balance: 0 },
  income: { processing_fees: 0, interest_recognised: 0, revenue: 0, expenses: 0, net: 0, expense_count: 0 },
  refunds: { loan_due: 0, loan_paid: 0, member_due: 0, member_paid: 0 },
  trend: [],
};
const EMPTY_LEDGER = {
  from: null, to: null, limit: 0,
  opening_balance: 0, closing_balance: 0, total_inflow: 0, total_outflow: 0,
  count: 0, entries: [],
};

/** Serve the real figures; on a fault serve the same shape, marked degraded. */
async function readOnly(res, label, load, fallback) {
  try {
    safeSend(res, await load());
  } catch (err) {
    logger.error(`${label} failed`, err);
    /* The member drill-down returns a bare list — it must stay a list, or the
       client's .map() is handed an object and the row crashes the view. */
    if (Array.isArray(fallback)) return safeSend(res, fallback);
    safeSend(res, { ...fallback, degraded: true, error: 'Reporting data is temporarily unavailable.' });
  }
}

const getIndividuals = asyncHandler((_req, res) =>
  readOnly(res, 'getIndividuals', () => statement.getIndividuals(), EMPTY_INDIVIDUALS));

const getGroups = asyncHandler((_req, res) =>
  readOnly(res, 'getGroups', () => statement.getGroups(), EMPTY_GROUPS));

const getGroupMembers = asyncHandler((req, res) =>
  readOnly(res, 'getGroupMembers', () => statement.getGroupMembers(req.params.id), []));

const getLedger = asyncHandler((req, res) =>
  readOnly(res, 'getLedger', () => statement.getLedger({
    from: req.query.from, to: req.query.to, limit: req.query.limit,
  }), EMPTY_LEDGER));

const getStatement = asyncHandler((_req, res) =>
  readOnly(res, 'getStatement', () => statement.getStatement(), EMPTY_STATEMENT));

module.exports = {
  getIndividuals, getGroups, getGroupMembers, getStatement, getLedger, getSummary, getRecent, getDaily, getMonthly, getOverdue, getCommissions };
