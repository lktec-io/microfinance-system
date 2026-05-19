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

async function update(id, { status, purpose, due_date }) {
  await pool.query(
    'UPDATE loans SET status=?, purpose=?, due_date=? WHERE id=?',
    [status, purpose, due_date, id]
  );
  const [updated] = await pool.query('SELECT * FROM loans WHERE id = ?', [id]);
  return updated[0];
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM loans WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, findByCustomer, customerExists, hasRepayments, create, update, remove };
