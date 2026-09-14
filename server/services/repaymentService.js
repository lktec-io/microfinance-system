const { pool } = require('../config/database');
const { generateReceiptNumber, nowLocal } = require('../utils/helpers');

const PAYMENT_MODES   = ['cash', 'mobile_money', 'bank'];
const MOBILE_PROVIDERS = ['mpesa', 'tigopesa', 'airtelmoney', 'halopesa'];

async function findAll() {
  const [rows] = await pool.query(`
    SELECT r.*, l.loan_amount, l.total_payable,
           c.full_name AS customer_name,
           u.name      AS recorded_by
    FROM repayments r
    JOIN loans l     ON l.id = r.loan_id
    JOIN customers c ON c.id = l.customer_id
    LEFT JOIN users u ON u.id = r.created_by
    ORDER BY r.payment_date DESC, r.paid_at DESC, r.created_at DESC
  `);
  return rows;
}

async function findByLoan(loanId) {
  const [rows] = await pool.query(
    `SELECT r.*, u.name AS recorded_by
     FROM repayments r
     LEFT JOIN users u ON u.id = r.created_by
     WHERE r.loan_id = ?
     ORDER BY r.payment_date DESC, r.paid_at DESC`,
    [loanId]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(`
    SELECT r.*, l.loan_amount, l.total_payable, l.balance AS loan_balance,
           c.full_name AS customer_name, c.phone AS customer_phone, c.address AS customer_address,
           u.name AS recorded_by
    FROM repayments r
    JOIN loans l     ON l.id = r.loan_id
    JOIN customers c ON c.id = l.customer_id
    LEFT JOIN users u ON u.id = r.created_by
    WHERE r.id = ?
  `, [id]);
  return rows[0] || null;
}

/**
 * Post a repayment.
 *
 * Mobile money: the client sends `amount_sent`; the agent fee (makato) is
 * recorded separately in `agent_fee` and the loan is credited with
 * amount_sent − agent_fee. Fees never count as loan collection.
 *
 * Timestamp: `paid_at` ('YYYY-MM-DD HH:mm:ss', Tanzania time) is stored as-is.
 * When omitted, today's payments get the current time; backdated payments
 * without a time keep a NULL time rather than an invented one.
 */
async function create({
  loan_id, amount, payment_date, paid_at, notes, created_by,
  payment_mode, mobile_provider, amount_sent, agent_fee,
}) {
  const mode      = PAYMENT_MODES.includes(payment_mode) ? payment_mode : 'cash';
  const isMobile  = mode === 'mobile_money';
  const sent      = isMobile ? parseFloat(parseFloat(amount_sent).toFixed(2)) : null;
  const fee       = isMobile ? parseFloat(parseFloat(agent_fee || 0).toFixed(2)) : 0;
  const payAmount = isMobile ? parseFloat((sent - fee).toFixed(2)) : parseFloat(amount);
  const provider  = isMobile && MOBILE_PROVIDERS.includes(mobile_provider) ? mobile_provider : null;

  const localNow  = nowLocal();
  const localDate = localNow.slice(0, 10);
  const paidAt    = paid_at || (!payment_date || payment_date === localDate ? localNow : null);
  const pDate     = paid_at ? paid_at.slice(0, 10) : (payment_date || localDate);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[loan]] = await conn.query('SELECT * FROM loans WHERE id = ? FOR UPDATE', [loan_id]);
    if (!loan)                           throw Object.assign(new Error('Loan not found'), { status: 404 });
    if (loan.status === 'paid')          throw Object.assign(new Error('Loan is already fully paid'), { status: 400 });
    if (!(payAmount > 0))                throw Object.assign(new Error('Amount credited to the loan must be greater than zero'), { status: 400 });
    if (payAmount > parseFloat(loan.balance)) {
      throw Object.assign(
        new Error(`Amount exceeds outstanding balance of ${loan.balance}`),
        { status: 400, balance: loan.balance }
      );
    }

    const receiptNumber  = generateReceiptNumber();
    const newAmountPaid  = parseFloat(loan.amount_paid) + payAmount;
    const newBalance     = Math.max(
      parseFloat((parseFloat(loan.total_payable) - newAmountPaid).toFixed(2)),
      0
    );
    const newStatus      = newBalance <= 0 ? 'paid' : 'active';

    const [repResult] = await conn.query(
      `INSERT INTO repayments
         (loan_id, amount, payment_date, paid_at, receipt_number, notes, created_by,
          payment_mode, mobile_provider, amount_sent, agent_fee)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [loan_id, payAmount, pDate, paidAt, receiptNumber, notes || null, created_by,
       mode, provider, sent, fee]
    );
    await conn.query(
      'UPDATE loans SET amount_paid=?, balance=?, status=? WHERE id=?',
      [newAmountPaid, newBalance, newStatus, loan_id]
    );
    await conn.commit();

    const [[repayment]] = await conn.query('SELECT * FROM repayments WHERE id = ?', [repResult.insertId]);
    return { ...repayment, new_balance: newBalance, loan_status: newStatus };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { PAYMENT_MODES, MOBILE_PROVIDERS, findAll, findByLoan, findById, create };
