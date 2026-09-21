const { pool } = require('../config/database');
const {
  calcDueDate, today, calcTotalPayable,
  FREQUENCIES, countInstallments, calcInstallmentAmount,
} = require('../utils/helpers');

/** Strip tags and trim free text coming from nested payloads (not covered by sanitizeBody). */
function clean(value, max = 255) {
  if (value == null) return null;
  const s = String(value).replace(/<[^>]*>/g, '').trim().slice(0, max);
  return s || null;
}

function installmentPlan({ total, startDate, dueDate, frequency }) {
  if (!FREQUENCIES[frequency]) return { frequency: null, count: null, amount: null };
  const count = countInstallments(startDate, dueDate, frequency);
  return { frequency, count, amount: calcInstallmentAmount(total, count) };
}

async function findAll() {
  const [rows] = await pool.query(`
    SELECT l.*, c.full_name AS customer_name, c.phone AS customer_phone
    FROM loans l
    JOIN customers c ON c.id = l.customer_id
    ORDER BY l.created_at DESC
  `);
  return rows;
}

async function findSecurities(loanId) {
  try {
    const [guarantors]  = await pool.query('SELECT * FROM loan_guarantors WHERE loan_id = ? ORDER BY id', [loanId]);
    const [collaterals] = await pool.query('SELECT * FROM loan_collaterals WHERE loan_id = ? ORDER BY id', [loanId]);
    return { guarantors, collaterals };
  } catch (err) {
    // Tables are created by migrations; never break loan detail if they are missing
    if (err.code === 'ER_NO_SUCH_TABLE') return { guarantors: [], collaterals: [] };
    throw err;
  }
}

async function findById(id) {
  const [rows] = await pool.query(`
    SELECT l.*,
           c.full_name AS customer_name,
           c.phone     AS customer_phone,
           c.address   AS customer_address
    FROM loans l
    JOIN customers c ON c.id = l.customer_id
    WHERE l.id = ?
  `, [id]);
  if (!rows.length) return null;

  const [repayments] = await pool.query(
    'SELECT * FROM repayments WHERE loan_id = ? ORDER BY payment_date DESC, paid_at DESC, id DESC',
    [id]
  );
  const securities = await findSecurities(id);
  return { ...rows[0], repayments, ...securities };
}

async function findByCustomer(customerId) {
  const [rows] = await pool.query(
    'SELECT * FROM loans WHERE customer_id = ? ORDER BY created_at DESC',
    [customerId]
  );
  return rows;
}

async function customerExists(id) {
  const [rows] = await pool.query('SELECT id FROM customers WHERE id = ?', [id]);
  return rows.length > 0;
}

async function hasRepayments(loanId) {
  const [rows] = await pool.query('SELECT id FROM repayments WHERE loan_id = ?', [loanId]);
  return rows.length > 0;
}

/**
 * Create a loan and its guarantors / collateral in ONE transaction:
 * either everything is saved or nothing is.
 */
async function create({
  customer_id, loan_amount, interest_rate, duration_value, duration_unit,
  start_date, purpose, repayment_frequency, securities = [],
}) {
  const amount   = parseFloat(loan_amount);
  const rate     = parseFloat(interest_rate);
  const total    = calcTotalPayable(amount, rate);
  const sDate    = start_date || today();
  const dueDate  = calcDueDate(sDate, duration_value, duration_unit);
  const plan     = installmentPlan({ total, startDate: sDate, dueDate, frequency: repayment_frequency });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO loans
         (customer_id, loan_amount, interest_rate, duration_value, duration_unit,
          total_payable, balance, status, start_date, due_date, purpose,
          repayment_frequency, installment_count, installment_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
      [customer_id, amount, rate, parseInt(duration_value), duration_unit,
       total, total, sDate, dueDate, purpose || null,
       plan.frequency, plan.count, plan.amount]
    );
    const loanId = result.insertId;

    for (const item of Array.isArray(securities) ? securities : []) {
      if (item?.type === 'guarantor') {
        await conn.query(
          'INSERT INTO loan_guarantors (loan_id, full_name, phone, relationship, id_number) VALUES (?, ?, ?, ?, ?)',
          [loanId, clean(item.full_name, 100), clean(item.phone, 20), clean(item.relationship, 60), clean(item.id_number, 50)]
        );
      } else if (item?.type === 'collateral') {
        await conn.query(
          'INSERT INTO loan_collaterals (loan_id, description, serial_number, item_condition, estimated_value) VALUES (?, ?, ?, ?, ?)',
          [loanId, clean(item.description, 255), clean(item.serial_number, 100), clean(item.condition, 60),
           parseFloat(parseFloat(item.estimated_value || 0).toFixed(2)) || 0]
        );
      }
    }

    await conn.commit();
    const [newRow] = await conn.query('SELECT * FROM loans WHERE id = ?', [loanId]);
    return newRow[0];
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Guarantor ID number: NIDA digits are stored compact, other ID formats as typed (upper-case). */
function normalizeIdNumber(value) {
  const s = clean(value, 50);
  if (!s) return null;
  const compact = s.replace(/[\s-]/g, '');
  return /^\d+$/.test(compact) ? compact : s.toUpperCase();
}

/**
 * Guarantor change sent by the Edit Loan form, applied inside the caller's transaction:
 *   { id, name, phone, nida, assets_description }       → update that guarantor
 *   { id: null, name, phone, … }                        → attach a new guarantor
 *   { id: null, replaces: <id>, name, phone, … }        → swap: detach <id>, attach the new one
 *   { id, remove: true }                                → detach that guarantor
 * Every id must belong to this loan; anything else is a 404 and the whole edit rolls back.
 */
async function applyGuarantorChange(db, loanId, g) {
  const assertOnLoan = async guarantorId => {
    const [rows] = await db.query(
      'SELECT id FROM loan_guarantors WHERE id = ? AND loan_id = ? FOR UPDATE',
      [guarantorId, loanId]
    );
    if (!rows.length) throw Object.assign(new Error('Guarantor not found on this loan'), { status: 404 });
  };

  if (g.remove) {
    await assertOnLoan(g.id);
    await db.query('DELETE FROM loan_guarantors WHERE id = ? AND loan_id = ?', [g.id, loanId]);
    return;
  }

  const values = [clean(g.name, 100), clean(g.phone, 20), normalizeIdNumber(g.nida), clean(g.assets_description, 1000)];
  if (g.id) {
    await assertOnLoan(g.id);
    await db.query(
      'UPDATE loan_guarantors SET full_name = ?, phone = ?, id_number = ?, assets_description = ? WHERE id = ? AND loan_id = ?',
      [...values, g.id, loanId]
    );
    return;
  }
  if (g.replaces) {
    await assertOnLoan(g.replaces);
    await db.query('DELETE FROM loan_guarantors WHERE id = ? AND loan_id = ?', [g.replaces, loanId]);
  }
  await db.query(
    'INSERT INTO loan_guarantors (loan_id, full_name, phone, id_number, assets_description) VALUES (?, ?, ?, ?, ?)',
    [loanId, ...values]
  );
}

/**
 * Update a loan. When the Edit Loan form also sends a `guarantor` change, the loan
 * update and the guarantor change run in ONE transaction — both are saved or neither.
 * Callers that do not send `guarantor` (e.g. the Loan Detail edit) keep the original path.
 */
async function update(id, fields) {
  if (fields.guarantor === undefined) return writeLoanUpdate(pool, id, fields);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const loan = await writeLoanUpdate(conn, id, fields);
    if (!loan) {
      await conn.rollback();
      return null;
    }
    await applyGuarantorChange(conn, id, fields.guarantor);
    await conn.commit();
    return loan;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function writeLoanUpdate(db, id, {
  status, purpose, due_date, loan_amount, interest_rate,
  duration_value, duration_unit, start_date, repayment_frequency,
}) {
  const [rows] = await db.query(
    `SELECT loan_amount, interest_rate, amount_paid, duration_value, duration_unit,
            start_date, repayment_frequency
     FROM loans WHERE id = ?`,
    [id]
  );
  if (!rows.length) return null;
  const cur = rows[0];

  const newAmount = loan_amount  != null ? parseFloat(loan_amount)  : parseFloat(cur.loan_amount);
  const newRate   = interest_rate != null ? parseFloat(interest_rate) : parseFloat(cur.interest_rate);
  const newTotal  = calcTotalPayable(newAmount, newRate);
  const amtPaid   = parseFloat(cur.amount_paid || 0);
  const newBalance = Math.max(0, newTotal - amtPaid);

  const newStart  = start_date || cur.start_date;
  const frequency = repayment_frequency !== undefined
    ? (FREQUENCIES[repayment_frequency] ? repayment_frequency : null)
    : cur.repayment_frequency;
  const plan = installmentPlan({ total: newTotal, startDate: newStart, dueDate: due_date || null, frequency });

  await db.query(
    `UPDATE loans SET
       status=?, purpose=?, due_date=?,
       loan_amount=?, interest_rate=?, total_payable=?, balance=?,
       duration_value=?, duration_unit=?, start_date=?,
       repayment_frequency=?, installment_count=?, installment_amount=?
     WHERE id=?`,
    [
      status, purpose || null, due_date || null,
      newAmount, newRate, newTotal, newBalance,
      duration_value  != null ? parseInt(duration_value)  : cur.duration_value,
      duration_unit   || cur.duration_unit,
      newStart,
      plan.frequency, plan.count, plan.amount,
      id,
    ]
  );
  const [updated] = await db.query('SELECT * FROM loans WHERE id = ?', [id]);
  return updated[0];
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM loans WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, findByCustomer, customerExists, hasRepayments, create, update, remove };
