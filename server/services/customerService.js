const { pool } = require('../config/database');
const { today } = require('../utils/helpers');

const ID_TYPES = ['nida', 'voter', 'driving', 'none'];

/** Normalise the verification type + number pair before saving. */
function identity(id_type, id_number) {
  const type = ID_TYPES.includes(id_type) ? id_type : null;
  if (type === 'none') return { type, number: null };
  if (type === 'nida') return { type, number: String(id_number || '').replace(/[\s-]/g, '') || null };
  if (type === 'voter' || type === 'driving') {
    return { type, number: String(id_number || '').replace(/\s+/g, '').toUpperCase() || null };
  }
  return { type: null, number: id_number || null };
}

async function findAll(search) {
  let sql = `
    SELECT c.*,
      (SELECT COUNT(*) FROM loans l WHERE l.customer_id = c.id) AS loan_count
    FROM customers c
  `;
  const params = [];
  if (search) {
    sql += ' WHERE c.full_name LIKE ? OR c.phone LIKE ? OR c.id_number LIKE ?';
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY c.created_at DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
  return rows[0] || null;
}

async function hasLoans(id) {
  const [rows] = await pool.query('SELECT id FROM loans WHERE customer_id = ?', [id]);
  return rows.length > 0;
}

async function create({ full_name, phone, address, id_type, id_number, registration_date }) {
  const idn = identity(id_type, id_number);
  const [result] = await pool.query(
    'INSERT INTO customers (full_name, phone, address, id_type, id_number, registration_date) VALUES (?, ?, ?, ?, ?, ?)',
    [full_name, phone, address, idn.type, idn.number, registration_date || today()]
  );
  const [newRow] = await pool.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);
  return newRow[0];
}

/**
 * `id_type` omitted (older clients, or an unchanged legacy record) keeps the
 * stored type; `id_number` is written exactly as before.
 */
async function update(id, { full_name, phone, address, id_type, id_number, registration_date }) {
  if (id_type === undefined || id_type === null || id_type === '') {
    await pool.query(
      'UPDATE customers SET full_name=?, phone=?, address=?, id_number=?, registration_date=? WHERE id=?',
      [full_name, phone, address, id_number || null, registration_date, id]
    );
  } else {
    const idn = identity(id_type, id_number);
    await pool.query(
      'UPDATE customers SET full_name=?, phone=?, address=?, id_type=?, id_number=?, registration_date=? WHERE id=?',
      [full_name, phone, address, idn.type, idn.number, registration_date, id]
    );
  }
  const [updated] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
  return updated[0];
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { ID_TYPES, findAll, findById, hasLoans, create, update, remove };
