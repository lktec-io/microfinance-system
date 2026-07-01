import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiPrinter, FiCreditCard,
  FiUser, FiPhone, FiMapPin,
  FiCalendar, FiDollarSign, FiPercent, FiClock,
  FiTrash2, FiX, FiMessageSquare, FiBell, FiAlertTriangle, FiEdit2,
} from 'react-icons/fi';
import api          from '../api';
import { useToast }  from '../context/ToastContext';
import { fmt }       from '../utils/format';
import StatusBadge   from '../components/common/StatusBadge';
import Spinner       from '../components/common/Spinner';
import SmsSendModal  from '../components/common/SmsSendModal';

function InfoRow({ Icon, label, value, valueClass }) {
  return (
    <div className="info-row">
      <span className="info-row-label">
        {Icon && <Icon size={14} />}
        {label}
      </span>
      <span className={`info-row-value ${valueClass || ''}`}>{value}</span>
    </div>
  );
}

export default function LoanDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { showToast } = useToast();

  const [loan,      setLoan]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [payModal,  setPayModal]  = useState(false);
  const [form,      setForm]      = useState({ amount: '', payment_date: '', notes: '' });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [receipt,   setReceipt]   = useState(null);
  const [delModal,  setDelModal]  = useState(false);
  // null | 'thank_you' | 'reminder' | 'overdue'
  const [smsType,    setSmsType]   = useState(null);
  const [editModal,  setEditModal] = useState(false);
  const [editForm,   setEditForm]  = useState({ status: '', due_date: '', purpose: '' });
  const [editSaving, setEditSaving]= useState(false);
  const [editErr,    setEditErr]   = useState('');

  async function fetchLoan() {
    if (!id || id === 'undefined') return;
    try {
      const { data } = await api.get(`/loans/${id}`);
      setLoan(data);
    } catch {
      showToast('Failed to load loan details', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id || id === 'undefined') {
      navigate('/loans', { replace: true });
      return;
    }
    fetchLoan();
  }, [id]);

  function openPayment() {
    setForm({ amount: '', payment_date: new Date().toISOString().slice(0, 10), notes: '' });
    setError('');
    setPayModal(true);
  }

  async function handlePayment(e) {
    e.preventDefault();
    if (parseFloat(form.amount) <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    if (parseFloat(form.amount) > parseFloat(loan.balance)) {
      setError(`Amount cannot exceed balance of TZS ${fmt(loan.balance)}`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/repayments', { loan_id: Number(id), ...form });
      setPayModal(false);
      setReceipt(data);
      showToast('Payment recorded successfully', 'success');
      fetchLoan();
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLoan() {
    try {
      await api.delete(`/loans/${id}`);
      showToast('Loan deleted', 'success');
      navigate('/loans');
    } catch (err) {
      showToast(err.response?.data?.message || 'Cannot delete loan', 'error');
      setDelModal(false);
    }
  }

  function openEdit() {
    setEditForm({
      status:   loan.status,
      due_date: loan.due_date?.slice(0, 10) || '',
      purpose:  loan.purpose || '',
    });
    setEditErr('');
    setEditModal(true);
  }

  async function handleEdit(e) {
    e.preventDefault();
    setEditSaving(true); setEditErr('');
    try {
      await api.put(`/loans/${id}`, editForm);
      setEditModal(false);
      fetchLoan();
    } catch (err) {
      setEditErr(err.response?.data?.message || 'Failed to update loan');
    } finally { setEditSaving(false); }
  }

  if (loading) return <Spinner text="Loading loan details…" />;
  if (!loan) return <div className="page"><p>Loan not found.</p></div>;

  const pct = loan.total_payable > 0
    ? Math.min(100, (loan.amount_paid / loan.total_payable) * 100).toFixed(1)
    : 0;

  const isOverdue  = loan.status === 'overdue';
  const daysLeft   = loan.due_date
    ? Math.ceil((new Date(loan.due_date) - new Date()) / 86400000)
    : null;

  return (
    <div className="page">

      {/* ── Page Header ── */}
      <div className="page-top-bar">
        <button className="btn btn--ghost btn--icon" onClick={() => navigate('/loans')}>
          <FiArrowLeft size={18} /> Back
        </button>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn--ghost" onClick={openEdit}>
            <FiEdit2 size={15} /> Edit
          </button>
          <button className="btn btn--ghost btn--sms-ty" onClick={() => setSmsType('thank_you')}>
            <FiMessageSquare size={15} /> Thank You
          </button>
          <button
            className="btn btn--ghost btn--sms-rm"
            onClick={() => setSmsType('reminder')}
            disabled={loan.status === 'paid'}
          >
            <FiBell size={15} /> Reminder
          </button>
          <button
            className="btn btn--ghost"
            style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
            onClick={() => setSmsType('overdue')}
            disabled={loan.status !== 'overdue'}
            title={loan.status !== 'overdue' ? 'Only available for overdue loans' : 'Send overdue notice'}
          >
            <FiAlertTriangle size={15} /> Overdue SMS
          </button>
          {loan.status !== 'paid' && loan.repayments?.length === 0 && (
            <button className="btn btn--ghost btn--danger-ghost" onClick={() => setDelModal(true)}>
              <FiTrash2 size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* ── Overdue Alert ── */}
      {isOverdue && (
        <div className="alert-banner alert-banner--danger">
          <FiClock size={18} />
          <span>This loan is <strong>overdue</strong> — due date was {loan.due_date?.slice(0, 10)}</span>
        </div>
      )}

      <div className="detail-grid">

        {/* ── Left: Loan Info Card ── */}
        <div>
          <section className="card">
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '.78rem', color: 'var(--gray-600)', marginBottom: '.2rem' }}>
                  LOAN #{loan.id}
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{loan.customer_name}</h2>
              </div>
              <StatusBadge status={loan.status} large />
            </div>

            {/* Customer Info */}
            <div className="info-section">
              <div className="info-section-title">Customer</div>
              <InfoRow Icon={FiUser}   label="Name"    value={loan.customer_name} />
              <InfoRow Icon={FiPhone}  label="Phone"   value={loan.customer_phone} />
              <InfoRow Icon={FiMapPin} label="Address" value={loan.customer_address} />
            </div>

            {/* Loan Amounts */}
            <div className="info-section">
              <div className="info-section-title">Financials</div>
              <InfoRow Icon={FiDollarSign} label="Principal"     value={`TZS ${fmt(loan.loan_amount)}`} />
              <InfoRow Icon={FiPercent}   label="Interest Rate" value={`${loan.interest_rate}%`} />
              <InfoRow Icon={FiDollarSign} label="Total Payable" value={`TZS ${fmt(loan.total_payable)}`} />
              <InfoRow Icon={FiCreditCard} label="Amount Paid"
                value={`TZS ${fmt(loan.amount_paid)}`}
                valueClass="text-green"
              />
              <InfoRow Icon={FiDollarSign} label="Balance"
                value={`TZS ${fmt(loan.balance)}`}
                valueClass={loan.balance > 0 ? 'text-red' : 'text-green'}
              />
            </div>

            {/* Dates */}
            <div className="info-section">
              <div className="info-section-title">Schedule</div>
              <InfoRow Icon={FiCalendar} label="Duration"
                value={`${loan.duration_value} ${loan.duration_unit}`}
              />
              <InfoRow Icon={FiCalendar} label="Start Date"  value={loan.start_date?.slice(0, 10) || '—'} />
              <InfoRow Icon={FiCalendar} label="Due Date"
                value={loan.due_date?.slice(0, 10) || '—'}
                valueClass={isOverdue ? 'text-red' : ''}
              />
              {daysLeft !== null && loan.status !== 'paid' && (
                <InfoRow Icon={FiClock} label="Days Left"
                  value={daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days`}
                  valueClass={daysLeft < 0 ? 'text-red' : daysLeft < 7 ? 'text-orange' : ''}
                />
              )}
              {loan.purpose && (
                <InfoRow Icon={FiDollarSign} label="Purpose" value={loan.purpose} />
              )}
            </div>

            {/* Progress */}
            <div className="progress-section">
              <div className="progress-header">
                <span>Repayment Progress</span>
                <span className="progress-pct">{pct}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill${isOverdue ? ' progress-fill--red' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="progress-meta">
                <span>TZS {fmt(loan.amount_paid)} paid</span>
                <span>TZS {fmt(loan.balance)} remaining</span>
              </div>
            </div>

            {loan.status !== 'paid' && (
              <button className="btn btn--primary btn--block" onClick={openPayment}
                style={{ marginTop: '1.25rem' }}>
                <FiCreditCard size={18} /> Record Payment
              </button>
            )}
            {loan.status === 'paid' && (
              <div className="fully-paid-badge">
                ✓ Fully Paid
              </div>
            )}
          </section>
        </div>

        {/* ── Right: Payment History ── */}
        <div>
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Payment History</h2>
              <span className="badge badge--blue">{loan.repayments?.length || 0} payments</span>
            </div>

            {(!loan.repayments || loan.repayments.length === 0)
              ? (
                <div className="empty-state">
                  <FiCreditCard size={40} style={{ color: 'var(--gray-200)' }} />
                  <p>No payments recorded yet</p>
                  {loan.status !== 'paid' && (
                    <button className="btn btn--primary" onClick={openPayment}>
                      Record First Payment
                    </button>
                  )}
                </div>
              )
              : (
                <div className="repayment-list">
                  {loan.repayments.map((r, i) => (
                    <div key={r.id} className="repayment-item">
                      <div className="repayment-item-num">{loan.repayments.length - i}</div>
                      <div className="repayment-item-body">
                        <div className="repayment-item-top">
                          <strong>TZS {fmt(r.amount)}</strong>
                          <span className="badge badge--green" style={{ fontSize: '.72rem' }}>paid</span>
                        </div>
                        <div className="repayment-item-meta">
                          <span>{r.payment_date?.slice(0, 10)}</span>
                          <code style={{ fontSize: '.75rem' }}>{r.receipt_number}</code>
                        </div>
                        {r.notes && <div className="repayment-item-note">{r.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </section>

          {/* Loan Summary Box */}
          <section className="card loan-summary-box">
            <h3 className="card-title" style={{ marginBottom: '.75rem' }}>Loan Summary</h3>
            <div className="summary-row">
              <span>Principal</span>
              <span>TZS {fmt(loan.loan_amount)}</span>
            </div>
            <div className="summary-row">
              <span>Interest ({loan.interest_rate}%)</span>
              <span>TZS {fmt(loan.total_payable - loan.loan_amount)}</span>
            </div>
            <div className="summary-row summary-row--total">
              <span>Total Payable</span>
              <span>TZS {fmt(loan.total_payable)}</span>
            </div>
            <div className="summary-row text-green">
              <span>Paid</span>
              <span>TZS {fmt(loan.amount_paid)}</span>
            </div>
            <div className={`summary-row summary-row--balance ${loan.balance > 0 ? 'text-red' : 'text-green'}`}>
              <span>Balance</span>
              <span><strong>TZS {fmt(loan.balance)}</strong></span>
            </div>
          </section>
        </div>
      </div>

      {/* ── Payment Modal ── */}
      {payModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Record Payment — Loan #{id}</h2>
              <button className="modal-close" onClick={() => setPayModal(false)} aria-label="Close"><FiX size={18} /></button>
            </div>

            <div className="alert alert--info" style={{ marginBottom: '1rem' }}>
              Outstanding Balance: <strong>TZS {fmt(loan.balance)}</strong>
            </div>

            {error && <div className="alert alert--error">{error}</div>}

            <form onSubmit={handlePayment} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (TZS) *</label>
                  <input
                    type="number" min="1" step="0.01" required
                    max={loan.balance}
                    value={form.amount}
                    placeholder={`Max: ${fmt(loan.balance)}`}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Payment Date</label>
                  <input type="date" value={form.payment_date}
                    onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <input placeholder="e.g. Cash payment, Mobile money…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {form.amount && (
                <div className="payment-preview">
                  <div>
                    <span>Paying:</span>
                    <strong>TZS {fmt(form.amount)}</strong>
                  </div>
                  <div>
                    <span>New balance:</span>
                    <strong className={Math.max(0, loan.balance - form.amount) > 0 ? 'text-red' : 'text-green'}>
                      TZS {fmt(Math.max(0, parseFloat(loan.balance) - parseFloat(form.amount || 0)))}
                    </strong>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setPayModal(false)}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Processing…' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {delModal && (
        <div className="modal-overlay">
          <div className="modal modal--sm">
            <h2>Delete Loan #{id}?</h2>
            <p style={{ margin: '1rem 0', color: 'var(--gray-600)' }}>
              This loan has no payments and will be permanently removed.
            </p>
            <div className="modal-actions">
              <button className="btn btn--ghost" onClick={() => setDelModal(false)}>Cancel</button>
              <button className="btn btn--danger" onClick={handleDeleteLoan}>Delete Loan</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Loan Modal ── */}
      {editModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Loan #{id}</h2>
              <button className="modal-close" onClick={() => setEditModal(false)}><FiX size={18} /></button>
            </div>
            <div className="alert alert--info" style={{ marginBottom: '1rem', fontSize: '.84rem' }}>
              Customer: <strong>{loan.customer_name}</strong> — Principal: <strong>TZS {fmt(loan.loan_amount)}</strong>
            </div>
            {editErr && <div className="alert alert--error">{editErr}</div>}
            <form onSubmit={handleEdit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Status *</label>
                  <select required value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                    {['pending','active','paid','overdue'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={editForm.due_date}
                    onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Purpose</label>
                <textarea rows={2} value={editForm.purpose}
                  onChange={e => setEditForm(f => ({ ...f, purpose: e.target.value }))} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SMS Send Modal ── */}
      {smsType && (
        <SmsSendModal
          loan={loan}
          type={smsType}
          onClose={() => setSmsType(null)}
        />
      )}

      {/* ── Receipt Modal ── */}
      {receipt && (
        <div className="modal-overlay">
          <div className="modal receipt-modal" id="receipt-print">
            <div className="receipt-header">
              <div className="receipt-logo">BC</div>
              <h2>Baraka Microcredit</h2>
              <p>Official Payment Receipt</p>
            </div>

            <div className="receipt-divider">— — — — — — — — — — — — — —</div>

            <div className="receipt-body">
              <div className="receipt-row">
                <span>Receipt No.</span>
                <strong>{receipt.receipt_number}</strong>
              </div>
              <div className="receipt-row">
                <span>Payment Date</span>
                <strong>{receipt.payment_date?.slice(0, 10)}</strong>
              </div>
              <div className="receipt-row">
                <span>Customer</span>
                <strong>{loan.customer_name}</strong>
              </div>
              <div className="receipt-row">
                <span>Customer Phone</span>
                <strong>{loan.customer_phone}</strong>
              </div>
              <div className="receipt-row">
                <span>Loan Reference</span>
                <strong>#{id}</strong>
              </div>
              <div className="receipt-row">
                <span>Loan Amount</span>
                <strong>TZS {fmt(loan.loan_amount)}</strong>
              </div>
            </div>

            <div className="receipt-divider">— — — — — — — — — — — — — —</div>

            <div className="receipt-amount-box">
              <span>AMOUNT PAID</span>
              <strong>TZS {fmt(receipt.amount)}</strong>
            </div>

            <div className="receipt-divider">— — — — — — — — — — — — — —</div>

            <div className="receipt-body">
              <div className="receipt-row">
                <span>Remaining Balance</span>
                <strong className={receipt.new_balance > 0 ? 'text-red' : 'text-green'}>
                  TZS {fmt(receipt.new_balance)}
                </strong>
              </div>
              <div className="receipt-row">
                <span>Loan Status</span>
                <StatusBadge status={receipt.loan_status} />
              </div>
              {receipt.notes && (
                <div className="receipt-row">
                  <span>Notes</span>
                  <span>{receipt.notes}</span>
                </div>
              )}
            </div>

            <div className="receipt-footer">
              <p>Thank you for your payment</p>
              <p style={{ fontSize: '.72rem', opacity: .6 }}>
                Printed on {new Date().toLocaleDateString()}
              </p>
            </div>

            <div className="modal-actions no-print" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn--ghost" onClick={() => setReceipt(null)}>Close</button>
              <button className="btn btn--primary" onClick={() => window.print()}>
                <FiPrinter size={16} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
