const logger = require('../utils/logger');

// Central async error wrapper — removes try/catch boilerplate from controllers
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Global Express error middleware (must have 4 params)
function globalErrorHandler(err, req, res, _next) {
  logger.error(`${req.method} ${req.originalUrl}`, err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Duplicate entry — record already exists' });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({ message: 'Cannot delete — record has dependent data' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
}

module.exports = { asyncHandler, globalErrorHandler };
