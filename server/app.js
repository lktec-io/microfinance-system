require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { testConnection, runMigrations } = require('./config/database');
const { startOverdueUpdater } = require('./utils/overdueUpdater');
const { sanitizeBody }        = require('./middleware/validate');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security Headers ─────────────────────────────────────────
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// ── Body parsers + sanitizer ─────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeBody);

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/customers',  require('./routes/customers'));
app.use('/api/loans',      require('./routes/loans'));
app.use('/api/repayments', require('./routes/repayments'));
app.use('/api/reports',    require('./routes/reports'));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV, time: new Date() })
);

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────
testConnection()
  .then(() => runMigrations())
  .then(() => {
    startOverdueUpdater();
    app.listen(PORT, () =>
      console.log(`🚀  Server running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`)
    );
  });
