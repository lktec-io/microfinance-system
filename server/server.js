require('dotenv').config();

// ── Process-level safety net — prevents server crash on unhandled errors ──
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message, err.stack);
  // Do NOT exit — keep serving requests
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason instanceof Error ? reason.message : reason);
  // Do NOT exit — keep serving requests
});

const express    = require('express');
const cors       = require('cors');
const { testConnection, runMigrations } = require('./config/database');
const { sanitizeBody }      = require('./middleware/validate');
const { globalErrorHandler } = require('./middleware/errorHandler');
const logger                = require('./utils/logger');
const overdueJob            = require('./cron/overdueJob');
const smsJobs               = require('./cron/smsJobs');

const app  = express();
const PORT = process.env.PORT || 8004;

// ── Trust proxy (for rate-limiter IP detection behind Nginx) ─
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin:  process.env.CLIENT_URL || 'https://microfinance.nardio.online',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// ── Body parsing + input sanitization ────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeBody);

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/customers',  require('./routes/customers'));
app.use('/api/loans',      require('./routes/loans'));
app.use('/api/repayments', require('./routes/repayments'));
app.use('/api/reports',    require('./routes/reports'));
app.use('/api/sms',        require('./routes/sms'));

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development', uptime: process.uptime() })
);

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────
app.use(globalErrorHandler);

// ── Start ─────────────────────────────────────────────────────
testConnection()
  .then(() => runMigrations())
  .then(() => {
    overdueJob.start();
    smsJobs.start();
    app.listen(PORT, () =>
      logger.success(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
    );
  })
  .catch((err) => {
    logger.error('Fatal startup error', err);
    process.exit(1);
  });

module.exports = app; // for testing
