const svc     = require('../services/adminService');
const authSvc = require('../services/authService');
const logger  = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { fail } = require('../utils/helpers');

const CONFIRM_PHRASE = 'DELETE';

/* Brute-force guard on the admin password check — per admin account */
const MAX_FAILURES = 5;
const WINDOW_MS    = 15 * 60 * 1000;
const failures     = new Map();

function isLocked(userId) {
  const rec = failures.get(userId);
  if (!rec) return false;
  if (Date.now() - rec.start > WINDOW_MS) {
    failures.delete(userId);
    return false;
  }
  return rec.count >= MAX_FAILURES;
}

function recordFailure(userId) {
  const now = Date.now();
  const rec = failures.get(userId);
  if (!rec || now - rec.start > WINDOW_MS) failures.set(userId, { count: 1, start: now });
  else rec.count += 1;
}

/**
 * POST /api/admin/system-reset
 * Body: { confirm: 'DELETE', password: '<current admin password>' }
 * Admin-only (enforced by the router). Permanently deletes customers, loans,
 * repayments, expenses and SMS logs. User accounts are kept.
 */
const systemReset = asyncHandler(async (req, res) => {
  const { confirm, password } = req.body || {};

  if (confirm !== CONFIRM_PHRASE) {
    return fail(res, `Type ${CONFIRM_PHRASE} exactly to confirm the reset`, 400);
  }
  if (!password) {
    return fail(res, 'Enter your admin password to confirm the reset', 400);
  }
  if (isLocked(req.user.id)) {
    return fail(res, 'Too many failed attempts. Try again in 15 minutes.', 429);
  }

  const admin = await svc.findAdminCredentials(req.user.id);
  if (!admin || !(await authSvc.verifyPassword(password, admin.password))) {
    recordFailure(req.user.id);
    logger.warn(`System reset rejected: password check failed for admin id=${req.user.id}`);
    return fail(res, 'Admin password is incorrect', 403);
  }
  failures.delete(req.user.id);

  logger.warn(`SYSTEM RESET started by admin id=${admin.id}`);
  const { deleted, idsReset } = await svc.resetSystemData();
  logger.warn(`SYSTEM RESET completed by admin id=${admin.id} — rows deleted: ${JSON.stringify(deleted)}`);

  res.json({
    message: 'All business data has been permanently deleted. User accounts were kept.',
    deleted,
    idsReset,
  });
});

module.exports = { systemReset };
