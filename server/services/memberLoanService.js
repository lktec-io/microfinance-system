const { pool } = require('../config/database');
const { GROUP_REFUND_RATE, percentOf, isoDate, nowLocal } = require('../utils/helpers');

/*
 * Member-level accounting inside a group loan.
 *
 * A group loan stays ONE loan booked to the group's borrower record — balance,
 * status and reports are unchanged. On top of that, each member can carry an
 * agreed share of the total payable; repayments are then attributed to a member
 * and the 5% incentive is earned (or forfeited) per member rather than per loan.
 *
 * Group loans booked before this feature simply have no allocation rows and
 * keep their loan-level refund, so nothing about them changes.
 */

const money = v => Math.round((Number(v) || 0) * 100) / 100;

/** The loan's member allocations with live progress, or [] when the loan has none. */
async function findForLoan(loanId) {
  try {
    const [rows] = await pool.query(
      `SELECT glm.id, glm.loan_id, glm.group_member_id, glm.agreed_share,
              glm.refund_amount, glm.refund_status, glm.refund_paid_at,
              m.full_name, m.phone_number, m.identity_type, m.identity_number,
              l.due_date, l.status AS loan_status,
              (SELECT COALESCE(SUM(r.amount), 0) FROM repayments r
                WHERE r.loan_id = glm.loan_id AND r.group_member_id = glm.group_member_id) AS paid,
              (SELECT COUNT(*) FROM repayments r
                WHERE r.loan_id = glm.loan_id AND r.group_member_id = glm.group_member_id) AS payments,
              (SELECT MAX(r.payment_date) FROM repayments r
                WHERE r.loan_id = glm.loan_id AND r.group_member_id = glm.group_member_id) AS last_payment
         FROM group_loan_members glm
         JOIN group_members m ON m.id = glm.group_member_id
         JOIN loans l         ON l.id = glm.loan_id
        WHERE glm.loan_id = ?
        ORDER BY m.full_name`,
      [loanId]
    );
    return rows.map(r => {
      const share = money(r.agreed_share);
      const paid  = money(r.paid);
      const balance = Math.max(0, money(share - paid));
      const due = isoDate(r.due_date);
      return {
        ...r,
        agreed_share: share,
        paid,
        balance,
        payments: Number(r.payments) || 0,
        progress: share > 0 ? Math.min(100, Math.round((paid / share) * 100)) : 0,
        settled: balance <= 0,
        /* on time = settled, and settled on or before the loan due date */
        on_time: balance <= 0 && (!due || !r.last_payment || isoDate(r.last_payment) <= due),
        refund_amount: r.refund_amount == null ? null : money(r.refund_amount),
      };
    });
  } catch (err) {
    // Feature table arrives with migration 005 — never break loan detail without it
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR') return [];
    throw err;
  }
}

/**
 * Write the agreed shares for a freshly booked group loan.
 * Runs inside the caller's transaction (loanService.create).
 *
 * `shares` is [{ group_member_id, agreed_share }]; the 5% incentive is stored
 * per member as a share of the member's own principal portion.
 */
async function allocate(db, { loanId, shares, principal, totalPayable }) {
  for (const s of shares) {
    const share = money(s.agreed_share);
    // the member's principal portion, pro-rata on their share of the total payable
    const principalShare = totalPayable > 0 ? money((share / totalPayable) * principal) : 0;
    await db.query(
      `INSERT INTO group_loan_members
         (loan_id, group_member_id, agreed_share, refund_amount, refund_status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [loanId, Number(s.group_member_id), share, percentOf(principalShare, GROUP_REFUND_RATE)]
    );
  }
}

/** The allocation row for one member of one loan, or null. */
async function findAllocation(db, loanId, memberId) {
  const [rows] = await db.query(
    'SELECT * FROM group_loan_members WHERE loan_id = ? AND group_member_id = ? FOR UPDATE',
    [loanId, memberId]
  );
  return rows[0] || null;
}

/**
 * After a member's payment is posted, decide that member's incentive.
 * Called inside the repayment transaction.
 *   settled on or before the due date → eligible
 *   due date passed and still short   → forfeited
 * Anything already decided (eligible / forfeited / paid) is left alone.
 */
async function settleMemberRefund(db, { loanId, memberId, dueDate, paymentDate }) {
  const alloc = await findAllocation(db, loanId, memberId);
  if (!alloc || alloc.refund_status !== 'pending') return null;

  const [[totals]] = await db.query(
    'SELECT COALESCE(SUM(amount), 0) AS paid FROM repayments WHERE loan_id = ? AND group_member_id = ?',
    [loanId, memberId]
  );
  const paid = money(totals.paid);
  const share = money(alloc.agreed_share);
  const due = isoDate(dueDate);

  let status = null;
  if (paid >= share && share > 0) status = due && paymentDate > due ? 'forfeited' : 'eligible';
  else if (due && paymentDate > due) status = 'forfeited';
  if (!status) return null;

  await db.query(
    'UPDATE group_loan_members SET refund_status = ? WHERE loan_id = ? AND group_member_id = ?',
    [status, loanId, memberId]
  );
  return status;
}

/** Admin pays out one member's earned incentive. Only 'eligible' can move to 'paid'. */
async function markRefundPaid(loanId, memberId) {
  const [res] = await pool.query(
    `UPDATE group_loan_members SET refund_status = 'paid', refund_paid_at = ?
      WHERE loan_id = ? AND group_member_id = ? AND refund_status = 'eligible'`,
    [nowLocal(), loanId, memberId]
  );
  if (!res.affectedRows) return null;
  const rows = await findForLoan(loanId);
  return rows.find(r => Number(r.group_member_id) === Number(memberId)) || null;
}

module.exports = { findForLoan, allocate, findAllocation, settleMemberRefund, markRefundPaid };
