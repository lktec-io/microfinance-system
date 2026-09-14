const { pool } = require('../config/database');

/*
 * Tables wiped by the handover system reset, in foreign-key-safe order
 * (children before parents). The `users` table is never touched, so every
 * staff and admin account survives the reset.
 */
const RESET_TABLES = ['sms_logs', 'repayments', 'loans', 'customers', 'expenses'];

async function findAdminCredentials(userId) {
  const [rows] = await pool.query(
    "SELECT id, password FROM users WHERE id = ? AND role = 'admin' AND is_active = 1",
    [userId]
  );
  return rows[0] || null;
}

/** Only reset tables that exist — optional tables (expenses, sms_logs) come from migrations. */
async function existingResetTables(conn) {
  const [rows] = await conn.query(
    `SELECT TABLE_NAME AS name
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)`,
    [RESET_TABLES]
  );
  const present = new Set(rows.map(r => r.name));
  return RESET_TABLES.filter(t => present.has(t));
}

/**
 * Permanently delete all business data.
 * Rows are deleted inside one transaction (all-or-nothing). ID sequences are
 * restarted afterwards; ALTER TABLE commits implicitly, so that step is
 * best-effort and cannot undo the committed wipe.
 */
async function resetSystemData() {
  const conn = await pool.getConnection();
  try {
    const tables  = await existingResetTables(conn);
    const deleted = {};

    await conn.beginTransaction();
    try {
      for (const table of tables) {
        // Table names come from the fixed RESET_TABLES whitelist above.
        const [result] = await conn.query(`DELETE FROM \`${table}\``);
        deleted[table] = result.affectedRows;
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    const idsReset = [];
    for (const table of tables) {
      try {
        await conn.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
        idsReset.push(table);
      } catch {
        // Non-critical: data is already wiped; IDs simply continue from the old sequence.
      }
    }

    return { deleted, idsReset };
  } finally {
    conn.release();
  }
}

module.exports = { RESET_TABLES, findAdminCredentials, resetSystemData };
