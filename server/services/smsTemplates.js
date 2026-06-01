function n(v) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d) {
  if (!d) return '—';
  return String(d).slice(0, 10);
}

function loanApproved(customerName, loan) {
  return (
    `Dear ${customerName}, your loan of TZS ${n(loan.loan_amount)} has been approved. ` +
    `Interest: ${loan.interest_rate}%. Total repayable: TZS ${n(loan.total_payable)}. ` +
    `Due date: ${fmtDate(loan.due_date)}. ` +
    `- Baraka Microcredit`
  );
}

function repaymentRecorded(customerName, amount, newBalance, receipt) {
  if (parseFloat(newBalance) <= 0) {
    return (
      `Dear ${customerName}, payment of TZS ${n(amount)} received. ` +
      `Your loan is now FULLY PAID. Receipt: ${receipt}. ` +
      `Thank you! - Baraka Microcredit`
    );
  }
  return (
    `Dear ${customerName}, payment of TZS ${n(amount)} received. ` +
    `Remaining balance: TZS ${n(newBalance)}. ` +
    `Receipt: ${receipt}. - Baraka Microcredit`
  );
}

function repaymentReminder(customerName, balance, dueDate) {
  return (
    `Dear ${customerName}, your loan balance of TZS ${n(balance)} ` +
    `is due on ${fmtDate(dueDate)}. ` +
    `Please ensure timely payment to avoid penalties. ` +
    `- Baraka Microcredit`
  );
}

function overdueNotice(customerName, balance, dueDate) {
  return (
    `Dear ${customerName}, your loan payment of TZS ${n(balance)} ` +
    `was due on ${fmtDate(dueDate)} and is now OVERDUE. ` +
    `Please contact us immediately to avoid further action. ` +
    `- Baraka Microcredit`
  );
}

module.exports = { loanApproved, repaymentRecorded, repaymentReminder, overdueNotice };
