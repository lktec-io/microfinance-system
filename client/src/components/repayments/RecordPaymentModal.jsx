import { useMemo, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiExternalLink, FiSearch, FiInfo, FiRotateCcw } from 'react-icons/fi';
import api from '../../api';
import { Modal, SearchField, Avatar, DueChip, Empty, Field } from '../ui';
import StatusBadge from '../common/StatusBadge';
import { daysUntil, todayISO } from '../../utils/finance';
import { fmt, fmtDay } from '../../utils/format';

const LONG_DATE = { day: '2-digit', month: 'short', year: 'numeric' };
const EMPTY_FORM = () => ({ amount: '', payment_date: todayISO(), notes: '' });

/**
 * Post a repayment — same POST /api/repayments payload and client-side
 * checks as the Loan Detail page. The server remains authoritative.
 */
export default function RecordPaymentModal({ loans, initialLoanId, onClose, onRecorded, onViewLoan }) {
  const openLoans = useMemo(() => loans
    .filter(l => l.status !== 'paid' && Number(l.balance) > 0)
    .sort((a, b) => (daysUntil(a.due_date) ?? 1e9) - (daysUntil(b.due_date) ?? 1e9)), [loans]);

  const [loanId, setLoanId]   = useState(initialLoanId ? String(initialLoanId) : '');
  const [query, setQuery]     = useState('');
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [receipt, setReceipt] = useState(null);

  const loan = openLoans.find(l => String(l.id) === String(loanId))
    || loans.find(l => String(l.id) === String(loanId))
    || null;
  const balance = Number(loan?.balance) || 0;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '');
    const list = q
      ? openLoans.filter(l => l.customer_name?.toLowerCase().includes(q) || l.customer_phone?.includes(q) || String(l.id) === q)
      : openLoans;
    return list.slice(0, 80);
  }, [openLoans, query]);

  const amount     = parseFloat(form.amount);
  const hasAmount  = amount > 0;
  const newBalance = hasAmount ? Math.max(0, parseFloat((balance - amount).toFixed(2))) : balance;
  const nextStatus = hasAmount && newBalance <= 0 ? 'paid' : 'active';

  const set = key => e => {
    const value = e.target.value;
    setForm(f => ({ ...f, [key]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!loan) { setError('Select a loan to post the payment against'); return; }
    if (!(amount > 0)) { setError('Amount must be greater than zero'); return; }
    if (amount > balance) { setError(`Amount cannot exceed balance of TZS ${fmt(balance)}`); return; }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/repayments', { loan_id: Number(loan.id), ...form });
      setReceipt({ ...data, loan });
      onRecorded?.(data, loan);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setReceipt(null);
    setLoanId('');
    setForm(EMPTY_FORM());
    setError('');
  }

  if (receipt) {
    return (
      <Modal
        size="md"
        eyebrow="Payment posted"
        title="Repayment recorded"
        onClose={onClose}
        footer={
          <>
            <button type="button" className="mf-btn mf-btn--ghost" onClick={reset}><FiRotateCcw size={13} /> Record another</button>
            <span className="mf-modal__foot-spacer" />
            <button type="button" className="mf-btn mf-btn--ghost" onClick={() => onViewLoan(receipt.loan)}>View loan <FiExternalLink size={13} /></button>
            <button type="button" className="mf-btn mf-btn--primary" onClick={onClose}>Done</button>
          </>
        }
      >
        <div className="mf-receipt">
          <div className="mf-receipt__head">
            <div>
              <div className="mf-summary-bar__label">Receipt no.</div>
              <div className="mf-receipt__no">{receipt.receipt_number}</div>
            </div>
            <FiCheckCircle size={22} className="mf-tone--emerald" />
          </div>
          <div className="mf-receipt__amount">
            <div className="mf-receipt__amount-label">Amount received</div>
            <div className="mf-receipt__amount-value">TZS {fmt(receipt.amount)}</div>
          </div>
          <div className="mf-receipt__body mf-kv">
            <div className="mf-kv__row"><span>Client</span><span>{receipt.loan.customer_name}</span></div>
            <div className="mf-kv__row"><span>Loan</span><span>#{receipt.loan.id}</span></div>
            <div className="mf-kv__row"><span>Payment date</span><span>{fmtDay(receipt.payment_date, LONG_DATE)}</span></div>
            {receipt.notes && <div className="mf-kv__row"><span>Notes</span><span>{receipt.notes}</span></div>}
            <div className="mf-kv__row"><span>Loan status</span><span><StatusBadge status={receipt.loan_status} /></span></div>
            <div className="mf-kv__row mf-kv__row--total"><span>Remaining balance</span><span>TZS {fmt(receipt.new_balance)}</span></div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      size="xl"
      eyebrow="Collections"
      title="Record repayment"
      subtitle="Select the loan, enter the amount received, and post it to the ledger."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="record-payment-form" className="mf-btn mf-btn--primary" disabled={saving || !loan}>
            {saving ? <><span className="mf-spinner-inline" /> Posting…</> : 'Post payment'}
          </button>
        </>
      }
    >
      <div className="mf-pay">
        {/* Loan picker */}
        <div className="mf-picker">
          <div className="mf-section-label" style={{ marginBottom: 0 }}>1 · Select open loan</div>
          <SearchField value={query} onChange={setQuery} placeholder="Client, phone or #loan" maxWidth="none" />
          <div className="mf-picker__list" role="listbox" aria-label="Open loans">
            {results.length === 0 ? (
              <Empty Icon={FiSearch} title="No open loans found" message={query ? `Nothing matches “${query}”.` : 'Every loan is fully repaid.'} />
            ) : results.map(l => {
              const sel = String(l.id) === String(loanId);
              return (
                <button key={l.id} type="button" role="option" aria-selected={sel}
                  className={`mf-picker__item${sel ? ' is-selected' : ''}`}
                  onClick={() => { setLoanId(String(l.id)); setError(''); }}>
                  <Avatar name={l.customer_name} size={32} />
                  <span className="mf-cell-stack">
                    <span className="mf-cell-title">{l.customer_name}</span>
                    <span className="mf-cell-sub mf-mono">#{l.id} · {l.customer_phone}</span>
                  </span>
                  <span className="mf-pay__loan-right">
                    <span className="mf-pay__loan-balance">{fmt(l.balance)}</span>
                    <DueChip date={l.due_date} status={l.status} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment form */}
        <form id="record-payment-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="mf-section-label" style={{ marginBottom: 0 }}>2 · Payment details</div>

          {loan ? (
            <dl className="mf-stat-row">
              <div><dt>Loan</dt><dd>#{loan.id}</dd></div>
              <div><dt>Payable</dt><dd>{fmt(loan.total_payable)}</dd></div>
              <div><dt>Paid</dt><dd className="mf-tone--emerald">{fmt(loan.amount_paid)}</dd></div>
              <div><dt>Balance</dt><dd className="mf-tone--orange">{fmt(balance)}</dd></div>
            </dl>
          ) : (
            <div className="mf-alert mf-alert--info"><FiInfo size={15} /> Choose a loan from the list to continue.</div>
          )}

          {error && <div className="mf-alert mf-alert--error" role="alert"><FiAlertCircle size={15} /> {error}</div>}

          <div className="mf-form-grid">
            <Field label="Amount received (TZS)" required span>
              <span className="mf-pay__amount-row">
                <input type="number" min="1" step="0.01" inputMode="decimal" required
                  className="mf-input mf-input--num" disabled={!loan}
                  max={balance || undefined}
                  placeholder={loan ? `Max ${fmt(balance)}` : '0.00'}
                  value={form.amount} onChange={set('amount')} />
                <button type="button" className="mf-btn mf-btn--ghost" disabled={!loan}
                  onClick={e => { e.preventDefault(); setForm(f => ({ ...f, amount: String(balance) })); }}>
                  Full balance
                </button>
              </span>
            </Field>
            <Field label="Payment date">
              <input type="date" className="mf-input" disabled={!loan} value={form.payment_date} onChange={set('payment_date')} />
            </Field>
            <Field label="Notes" hint="e.g. Cash, M-Pesa, bank transfer">
              <input className="mf-input" disabled={!loan} value={form.notes} onChange={set('notes')} placeholder="Optional" />
            </Field>
          </div>

          {loan && (
            <div className="mf-pay__preview mf-kv" aria-live="polite">
              <div className="mf-kv__row"><span>Current balance</span><span>TZS {fmt(balance)}</span></div>
              <div className="mf-kv__row"><span>Paying now</span><span>{hasAmount ? `− TZS ${fmt(amount)}` : '—'}</span></div>
              <div className="mf-kv__row"><span>Status after posting</span><span>{hasAmount ? (nextStatus === 'paid' ? 'Paid' : 'Active') : '—'}</span></div>
              <div className="mf-kv__row mf-kv__row--total"><span>New balance</span><span>TZS {fmt(newBalance)}</span></div>
            </div>
          )}

          {loan?.status === 'overdue' && hasAmount && nextStatus === 'active' && (
            <div className="mf-alert mf-alert--warning">
              <FiInfo size={15} /> A partial payment moves this overdue loan back to <strong>Active</strong>.
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}
