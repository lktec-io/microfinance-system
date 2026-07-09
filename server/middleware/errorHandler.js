const logger = require('../utils/logger');

// Central async error wrapper — removes try/catch boilerplate from controllers
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Global Express error middleware (must have 4 params)
function globalErrorHandler(err, req, res, _next) {
  // Always log the full error with stack so pm2 logs show the real cause
  console.error(`[${req.method} ${req.originalUrl}] ${err.message}`);
  if (err.stack) console.error(err.stack);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Duplicate entry — record already exists' });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({ message: 'Cannot delete — record has dependent data' });
  }

  const status = err.status || err.statusCode || 500;
  // Never leak MySQL error messages, stack traces, or DB schema to the client
  const message = status >= 500
    ? 'Internal server error'
    : (err.message || 'Request failed');
  res.status(status).json({ message });
}

module.exports = { asyncHandler, globalErrorHandler };
