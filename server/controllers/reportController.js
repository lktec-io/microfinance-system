const svc    = require('../services/reportService');
const logger = require('../utils/logger');

const SUMMARY_DEFAULT = {
  customers: 0, total_loans: 0, loans_amount: 0,
  repayments: 0, collected: 0, outstanding: 0,
  active_loans: 0, overdue_loans: 0,
  loan_status: { active: 0, pending: 0, paid: 0, overdue: 0 },
};
const RECENT_DEFAULT  = { repayments: [], customers: [], loans: [] };

async function getSummary(_req, res) {
  try {
    res.json(await svc.getSummary());
  } catch (err) {
    logger.error('getSummary failed', err);
    res.json(SUMMARY_DEFAULT);
  }
}

async function getRecent(_req, res) {
  try {
    res.json(await svc.getRecent());
  } catch (err) {
    logger.error('getRecent failed', err);
    res.json(RECENT_DEFAULT);
  }
}

async function getDaily(_req, res) {
  try {
    res.json(await svc.getDaily());
  } catch (err) {
    logger.error('getDaily failed', err);
    res.json({ loans: [], repayments: [] });
  }
}

async function getMonthly(_req, res) {
  try {
    res.json(await svc.getMonthly());
  } catch (err) {
    logger.error('getMonthly failed', err);
    res.json({ loans: [], repayments: [] });
  }
}

async function getOverdue(_req, res) {
  try {
    res.json(await svc.getOverdue());
  } catch (err) {
    logger.error('getOverdue failed', err);
    res.json([]);
  }
}

module.exports = { getSummary, getRecent, getDaily, getMonthly, getOverdue };
