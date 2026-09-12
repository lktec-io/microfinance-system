import { useState } from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import api from '../../api';
import { Modal, Field } from '../ui';
import LoanTermsFields from './LoanTermsFields';
import { loanQuote } from '../../utils/finance';
import { fmt } from '../../utils/format';

const STATUSES = ['pending', 'active', 'paid', 'overdue'];

/** Edit loan — same fields and PUT /api/loans/:id payload as the previous UI. */
export default function EditLoanModal({ loan, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    loan_amount:    loan.loan_amount,
    interest_rate:  loan.interest_rate,
    duration_value: loan.duration_value,
    duration_unit:  loan.duration_unit || 'months',
    start_date:     loan.start_date?.slice(0, 10) || '',
    due_date:       loan.due_date?.slice(0, 10) || '',
    status:         loan.status,
    purpose:        loan.purpose || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const quote      = loanQuote(form);
  const paid       = Number(loan.amount_paid) || 0;
  const newBalance = quote ? Math.max(0, quote.total - paid) : null;

  const set = key => e => {
    const value = e.target.value;
    setForm(f => ({ ...f, [key]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.put(`/loans/${loan.id}`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update loan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      size="lg"
      eyebrow={`Loan #${loan.id}`}
      title="Edit loan"
      subtitle={`${loan.customer_name} · ${loan.customer_phone || ''}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="mf-btn mf-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="edit-loan-form" className="mf-btn mf-btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      <form id="edit-loan-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <dl className="mf-stat-row">
          <div><dt>Original principal</dt><dd>{fmt(loan.loan_amount)}</dd></div>
          <div><dt>Total payable</dt><dd>{fmt(loan.total_payable)}</dd></div>
          <div><dt>Paid to date</dt><dd className="mf-tone--emerald">{fmt(paid)}</dd></div>
          <div><dt>Balance</dt><dd>{fmt(loan.balance)}</dd></div>
        </dl>

        {error && <div className="mf-alert mf-alert--error" role="alert"><FiAlertCircle size={15} /> {error}</div>}

        <LoanTermsFields form={form} setForm={setForm} showPurpose={false} />

        {quote && (
          <div className="mf-alert mf-alert--info">
            <span>
              Recalculated total payable <strong className="mf-mono">TZS {fmt(quote.total)}</strong>
              {' '}· new balance <strong className="mf-mono">TZS {fmt(newBalance)}</strong>
            </span>
          </div>
        )}

        <div className="mf-form-grid">
          <Field label="Due date">
            <input type="date" className="mf-input" value={form.due_date} onChange={set('due_date')} />
          </Field>
          <Field label="Status" required>
            <select className="mf-select" required value={form.status} onChange={set('status')}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Notes / purpose" span>
            <textarea className="mf-textarea" rows={2} value={form.purpose} onChange={set('purpose')}
              placeholder="Optional notes about this loan…" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
