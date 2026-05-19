const svc = require('../services/reportService');
const { asyncHandler } = require('../middleware/errorHandler');

const getSummary = asyncHandler(async (_req, res) => { res.json(await svc.getSummary()); });
const getRecent  = asyncHandler(async (_req, res) => { res.json(await svc.getRecent()); });
const getDaily   = asyncHandler(async (_req, res) => { res.json(await svc.getDaily()); });
const getMonthly = asyncHandler(async (_req, res) => { res.json(await svc.getMonthly()); });
const getOverdue = asyncHandler(async (_req, res) => { res.json(await svc.getOverdue()); });

module.exports = { getSummary, getRecent, getDaily, getMonthly, getOverdue };
