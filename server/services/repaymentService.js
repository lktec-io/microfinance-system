const { pool } = require('../config/database');
const { generateReceiptNumber, today } = require('../utils/helpers');

async function findAll() {
  const [rows] = await pool.query(`
    SELECT r.*, l.loan_amount, l.total_payable,
           c.full_name AS customer_name,
           u.name      AS recorded_by
    FROM repayments r
    JOIN loans l     ON l.id = r.loan_id
    JOIN customers c ON c.id = l.customer_id
    LEFT JOIN users u ON u.id = r.created_by
    ORDER BY r.payment_date DESC, r.created_at DESC
  `);
  return rows;
}

async function findByLoan(loanId) {
  const [rows] = await pool.query(
    `SELECT r.*, u.name AS recorded_by
     FROM repayments r
     LEFT JOIN users u ON u.id = r.created_by
     WHERE r.loan_id = ?
     ORDER BY r.payment_date DESC`,
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

async function create({ loan_id, amount, payment_date, notes, created_by }) {
  const payAmount = parseFloat(amount);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[loan]] = await conn.query('SELECT * FROM loans WHERE id = ? FOR UPDATE', [loan_id]);
    if (!loan)                           throw Object.assign(new Error('Loan not found'), { status: 404 });
    if (loan.status === 'paid')          throw Object.assign(new Error('Loan is already fully paid'), { status: 400 });
    if (payAmount > parseFloat(loan.balance)) {
      throw Object.assign(
        new Error(`Amount exceeds outstanding balance of ${loan.balance}`),
        { status: 400, balance: loan.balance }
      );
    }

    const receiptNumber  = generateReceiptNumber();
    const pDate          = payment_date || today();
    const newAmountPaid  = parseFloat(loan.amount_paid) + payAmount;
    const newBalance     = Math.max(
      parseFloat((parseFloat(loan.total_payable) - newAmountPaid).toFixed(2)),
      0
    );
    const newStatus      = newBalance <= 0 ? 'paid' : 'active';

    const [repResult] = await conn.query(
      'INSERT INTO repayments (loan_id, amount, payment_date, receipt_number, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [loan_id, payAmount, pDate, receiptNumber, notes || null, created_by]
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

module.exports = { findAll, findByLoan, findById, create };
