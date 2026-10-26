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


/* ── Reporting directories & the full financial statement (admin only) ── */
const getIndividuals = asyncHandler(async (_req, res) => {
  res.json(await statement.getIndividuals());
});

const getGroups = asyncHandler(async (_req, res) => {
  res.json(await statement.getGroups());
});

const getGroupMembers = asyncHandler(async (req, res) => {
  res.json(await statement.getGroupMembers(req.params.id));
});

const getLedger = asyncHandler(async (req, res) => {
  res.json(await statement.getLedger({ from: req.query.from, to: req.query.to, limit: req.query.limit }));
});

const getStatement = asyncHandler(async (_req, res) => {
  res.json(await statement.getStatement());
});

module.exports = {
  getIndividuals, getGroups, getGroupMembers, getStatement, getLedger, getSummary, getRecent, getDaily, getMonthly, getOverdue, getCommissions };
