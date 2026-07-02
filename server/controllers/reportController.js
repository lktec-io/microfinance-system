const svc    = require('../services/reportService');
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

module.exports = { getSummary, getRecent, getDaily, getMonthly, getOverdue };
