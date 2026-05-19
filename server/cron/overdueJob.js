const { pool } = require('../config/database');
const logger   = require('../utils/logger');

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function runOverdueCheck() {
  try {
    const [result] = await pool.query(`
      UPDATE loans
      SET status = 'overdue', updated_at = NOW()
      WHERE due_date < CURDATE()
        AND status IN ('active', 'pending')
        AND balance > 0
    `);
    if (result.affectedRows > 0) {
      logger.warn(`Overdue job: marked ${result.affectedRows} loan(s) as overdue`);
    }
  } catch (err) {
    logger.error('Overdue cron job failed', err);
  }
}

function start() {
  runOverdueCheck(); // run immediately on startup
  setInterval(runOverdueCheck, INTERVAL_MS);
  logger.info('Overdue cron job started (runs every hour)');
}

module.exports = { start, runOverdueCheck };
