const { pool } = require('../config/database');
const { calcDueDate, today, calcTotalPayable } = require('../utils/helpers');

async function findAll() {
  const [rows] = await pool.query(`
    SELECT l.*, c.full_name AS customer_name, c.phone AS customer_phone
    FROM loans l
    JOIN customers c ON c.id = l.customer_id
    ORDER BY l.created_at DESC
  `);
  return rows;
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
    'SELECT * FROM repayments WHERE loan_id = ? ORDER BY payment_date DESC',
    [id]
  );
  return { ...rows[0], repayments };
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

async function create({ customer_id, loan_amount, interest_rate, duration_value, duration_unit, start_date, purpose }) {
  const amount   = parseFloat(loan_amount);
  const rate     = parseFloat(interest_rate);
  const total    = calcTotalPayable(amount, rate);
  const sDate    = start_date || today();
  const dueDate  = calcDueDate(sDate, duration_value, duration_unit);

  const [result] = await pool.query(
    `INSERT INTO loans
       (customer_id, loan_amount, interest_rate, duration_value, duration_unit,
        total_payable, balance, status, start_date, due_date, purpose)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [customer_id, amount, rate, parseInt(duration_value), duration_unit,
     total, total, sDate, dueDate, purpose || null]
  );
  const [newRow] = await pool.query('SELECT * FROM loans WHERE id = ?', [result.insertId]);
  return newRow[0];
}

async function update(id, { status, purpose, due_date, loan_amount, interest_rate, duration_value, duration_unit, start_date }) {
  const [rows] = await pool.query(
    'SELECT loan_amount, interest_rate, amount_paid, duration_value, duration_unit, start_date FROM loans WHERE id = ?',
    [id]
  );
  if (!rows.length) return null;
  const cur = rows[0];

  const newAmount = loan_amount  != null ? parseFloat(loan_amount)  : parseFloat(cur.loan_amount);
  const newRate   = interest_rate != null ? parseFloat(interest_rate) : parseFloat(cur.interest_rate);
  const newTotal  = calcTotalPayable(newAmount, newRate);
  const amtPaid   = parseFloat(cur.amount_paid || 0);
  const newBalance = Math.max(0, newTotal - amtPaid);

  await pool.query(
    `UPDATE loans SET
       status=?, purpose=?, due_date=?,
       loan_amount=?, interest_rate=?, total_payable=?, balance=?,
       duration_value=?, duration_unit=?, start_date=?
     WHERE id=?`,
    [
      status, purpose || null, due_date || null,
      newAmount, newRate, newTotal, newBalance,
      duration_value  != null ? parseInt(duration_value)  : cur.duration_value,
      duration_unit   || cur.duration_unit,
      start_date      || cur.start_date,
      id,
    ]
  );
  const [updated] = await pool.query('SELECT * FROM loans WHERE id = ?', [id]);
  return updated[0];
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM loans WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, findByCustomer, customerExists, hasRepayments, create, update, remove };
