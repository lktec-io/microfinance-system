/*
 * Read-only check that the database has every column, table and foreign key
 * the Sept 2026 feature release needs (KYC type, repayment frequency,
 * payment time / mobile money, guarantors & collateral).
 *
 * Safe on production: it only reads information_schema, writes nothing and
 * never prints connection details. Run it after restarting the backend:
 *
 *   cd server && npm run verify:schema
 *
 * Exit code 0 = ready, 1 = something missing, 2 = could not connect.
 */
const EXPECTED = {
  customers: {
    id_type: 'varchar',
  },
  loans: {
    repayment_frequency: 'varchar',
    installment_count:   'int',
    installment_amount:  'decimal',
  },
  repayments: {
    paid_at:         'datetime',
    payment_mode:    'varchar',
    mobile_provider: 'varchar',
    amount_sent:     'decimal',
    agent_fee:       'decimal',
  },
  loan_guarantors: {
    id:           'int',
    loan_id:      'int',
    full_name:    'varchar',
    phone:        'varchar',
    relationship: 'varchar',
    id_number:    'varchar',
    assets_description: 'text',
    created_at:   'timestamp',
  },
  loan_collaterals: {
    id:              'int',
    loan_id:         'int',
    description:     'varchar',
    serial_number:   'varchar',
    item_condition:  'varchar',
    estimated_value: 'decimal',
    created_at:      'timestamp',
  },
};

const FOREIGN_KEYS = [
  ['loan_guarantors', 'loan_id', 'loans'],
  ['loan_collaterals', 'loan_id', 'loans'],
];

async function verify(pool) {
  const [columns] = await pool.query(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c, DATA_TYPE AS type
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)`,
    [Object.keys(EXPECTED)]
  );
  const [foreignKeys] = await pool.query(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c, REFERENCED_TABLE_NAME AS ref
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_NAME IN (?)`,
    [FOREIGN_KEYS.map(([table]) => table)]
  );

  const lines = [];
  const problems = [];
  for (const [table, wanted] of Object.entries(EXPECTED)) {
    for (const [column, type] of Object.entries(wanted)) {
      const found = columns.find(r => String(r.t).toLowerCase() === table && String(r.c).toLowerCase() === column);
      if (!found) problems.push(`MISSING  ${table}.${column}`);
      else if (String(found.type).toLowerCase() !== type) problems.push(`TYPE     ${table}.${column} is ${found.type}, expected ${type}`);
      else lines.push(`OK       ${table}.${column} (${type})`);
    }
  }
  for (const [table, column, ref] of FOREIGN_KEYS) {
    const ok = foreignKeys.some(r =>
      String(r.t).toLowerCase() === table && String(r.c).toLowerCase() === column && String(r.ref).toLowerCase() === ref);
    if (ok) lines.push(`OK       FK ${table}.${column} → ${ref}.id`);
    else problems.push(`MISSING  FK ${table}.${column} → ${ref}.id`);
  }
  return { lines, problems };
}

async function main() {
  const { pool } = require('../config/database');
  try {
    const { lines, problems } = await verify(pool);
    lines.forEach(line => console.log(line));
    problems.forEach(line => console.log(line));
    console.log(problems.length
      ? `\n${problems.length} problem(s). Restart the backend (pm2) so runMigrations() applies them, then run this again.`
      : '\nSchema is ready for the feature release.');
    process.exitCode = problems.length ? 1 : 0;
  } catch (err) {
    // Only the error code — never connection details
    console.error(`Schema check could not run (${err.code || 'unknown error'}).`);
    process.exitCode = 2;
  } finally {
    await pool.end();
  }
}

if (require.main === module) main();

module.exports = { EXPECTED, FOREIGN_KEYS, verify };
