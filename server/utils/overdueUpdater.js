const { pool } = require('../config/database');

async function markOverdueLoans() {
  try {
    const [result] = await pool.query(`
      UPDATE loans
      SET status = 'overdue', updated_at = NOW()
      WHERE due_date < CURDATE()
        AND status IN ('active', 'pending')
        AND balance > 0
    `);
    if (result.affectedRows > 0) {
      console.log(`⚠️  Overdue updater: marked ${result.affectedRows} loan(s) as overdue`);
    }
  } catch (err) {
    console.error('Overdue updater error:', err.message);
  }
}

// Run once on startup, then every hour
function startOverdueUpdater() {
  markOverdueLoans();
  setInterval(markOverdueLoans, 60 * 60 * 1000);
}

module.exports = { markOverdueLoans, startOverdueUpdater };
