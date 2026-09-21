import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiCreditCard,
  FiUser, FiPhone, FiMapPin,
  FiCalendar, FiDollarSign, FiPercent, FiClock,
  FiTrash2, FiX, FiEdit2, FiRepeat, FiUsers, FiGift, FiCheckCircle,
} from 'react-icons/fi';
import api          from '../api';
import { useToast }  from '../context/ToastContext';
import { useAuth }   from '../context/AuthContext';
import { fmt, fmtTimestamp } from '../utils/format';
import { isoDate, GROUP_REFUND_RATE } from '../utils/finance';
import { frequencyLabel, money, paymentModeLabel, perInterval } from '../utils/labels';
import { t }         from '../i18n/bilingual';
import StatusBadge   from '../components/common/StatusBadge';
import Spinner       from '../components/common/Spinner';
import RecordPaymentModal from '../components/repayments/RecordPaymentModal';
import PlanStatus    from '../components/repayments/PlanStatus';
import SecurityList, { securitiesFromLoan } from '../components/loans/SecurityList';

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
  const { isAdmin } = useAuth();

  const [loan,      setLoan]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [payModal,  setPayModal]  = useState(false);
  const [delModal,  setDelModal]  = useState(false);
  const [editModal,  setEditModal] = useState(false);
  const [editForm,   setEditForm]  = useState({ status: '', due_date: '', purpose: '' });
  const [editSaving, setEditSaving]= useState(false);
  const [editErr,    setEditErr]   = useState('');
  const [refundSaving, setRefundSaving] = useState(false);

  async function fetchLoan() {
    if (!id || id === 'undefined') {
      setLoading(false);
      navigate('/loans', { replace: true });
      return;
    }
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

  /** Admin pays out an earned group refund (PATCH /api/loans/:id/refund). */
  async function markRefundPaid() {
    setRefundSaving(true);
    try {
      await api.patch(`/loans/${id}/refund`);
      showToast('Group refund marked as paid', 'success');
      fetchLoan();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not mark the refund as paid', 'error');
    } finally {
      setRefundSaving(false);
    }
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

  const frequency  = frequencyLabel(loan.repayment_frequency);
  const securities = securitiesFromLoan(loan);

  const isGroupLoan  = loan.loan_type === 'group';
  const refundStatus = loan.refund_status || 'pending';
  const refundTitle  = t('fee.refundTitle', { rate: Number(loan.refund_incentive_rate) || GROUP_REFUND_RATE });
  const refundState  = t(`fee.refundStatus.${refundStatus}`);
  const refundNote   = t('fee.refundNote', { amount: fmt(loan.refund_incentive_amount) });
  const REFUND_BADGE = { pending: 'badge--gray', eligible: 'badge--green', forfeited: 'badge--red', paid: 'badge--blue' };

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
              <InfoRow Icon={isGroupLoan ? FiUsers : FiUser} label="Loan Type"
                value={isGroupLoan
                  ? `Group · Kikundi${loan.group_name ? ` — ${loan.group_name}` : ''}`
                  : 'Individual · Mtu binafsi'} />
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
              <InfoRow Icon={FiDollarSign} label="Processing Fee"
                value={loan.processing_fee != null
                  ? `TZS ${fmt(loan.processing_fee)} · ${Number(loan.processing_fee_rate)}% paid upfront`
                  : '— (booked before processing fees)'}
              />
            </div>

            {/* Dates */}
            <div className="info-section">
              <div className="info-section-title">Schedule</div>
              <InfoRow Icon={FiCalendar} label="Duration"
                value={`${loan.duration_value} ${loan.duration_unit}`}
              />
              <InfoRow Icon={FiRepeat} label="Repayment Frequency" value={`${frequency.en} · ${frequency.sw}`} />
              {loan.installment_count > 0 && (
                <InfoRow Icon={FiCalendar} label="Installments"
                  value={`${loan.installment_count} × TZS ${money(loan.installment_amount)} ${perInterval(loan.repayment_frequency).en}`}
                />
              )}
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

            {/* Installment plan status */}
            <div className="info-section">
              <div className="info-section-title">Installment Status</div>
              <PlanStatus loan={loan} />
            </div>

            {/* Group refundable incentive tracker */}
            {isGroupLoan && (
              <div className="info-section">
                <div className="info-section-title">Group Refund Incentive</div>
                <div className={`mf-refund mf-refund--${refundStatus}`}>
                  <div className="mf-refund__head">
                    <FiGift size={16} aria-hidden="true" />
                    <span className="mf-refund__title">{refundTitle.en}<span className="mf-sw" lang="sw">{refundTitle.sw}</span></span>
                    <b className="mf-refund__amount">TZS {fmt(loan.refund_incentive_amount)}</b>
                  </div>
                  <div className="mf-refund__status">
                    <span className={`badge ${REFUND_BADGE[refundStatus] || 'badge--gray'}`}>{refundState.en}</span>
                    <span className="mf-refund__sw" lang="sw">{refundState.sw}</span>
                  </div>
                  <p className="mf-refund__note">{refundNote.en}</p>
                  {loan.refund_paid_at && (
                    <p className="mf-refund__note">Refunded on <span className="mf-stamp">{fmtTimestamp(loan.refund_paid_at)}</span></p>
                  )}
                  {isAdmin && refundStatus === 'eligible' && (
                    <button type="button" className="mf-btn mf-btn--primary mf-btn--sm" onClick={markRefundPaid} disabled={refundSaving}>
                      <FiCheckCircle size={14} /> {refundSaving ? 'Saving…' : 'Mark refund paid'}
                    </button>
                  )}
                </div>
              </div>
            )}

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
              <button className="btn btn--primary btn--block" onClick={() => setPayModal(true)}
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
                    <button className="btn btn--primary" onClick={() => setPayModal(true)}>
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
                          <span className="badge badge--green" style={{ fontSize: '.72rem' }}>{paymentModeLabel(r)}</span>
                        </div>
                        <div className="repayment-item-meta">
                          <span className="mf-stamp">{fmtTimestamp(r.paid_at) || isoDate(r.payment_date)}</span>
                          <code style={{ fontSize: '.75rem' }}>{r.receipt_number}</code>
                        </div>
                        {Number(r.agent_fee) > 0 && (
                          <div className="repayment-item-note">
                            Sent TZS {fmt(r.amount_sent)} · agent fee (makato) TZS {fmt(r.agent_fee)}
                          </div>
                        )}
                        {r.notes && <div className="repayment-item-note">{r.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </section>

          {/* Guarantors & collateral */}
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Guarantors &amp; Collateral</h2>
              <span className="badge badge--orange">{securities.length}</span>
            </div>
            {securities.length === 0 ? (
              <p className="mf-muted" style={{ fontSize: '.88rem' }}>
                {t('security.none').en}
                <span className="mf-sw" lang="sw">{t('security.none').sw}</span>
              </p>
            ) : (
              <SecurityList items={securities} principal={Number(loan.loan_amount)} />
            )}
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

      {/* ── Record Payment (shared with Repayments page) ── */}
      {payModal && (
        <RecordPaymentModal
          loans={[loan]}
          initialLoanId={loan.id}
          onClose={() => setPayModal(false)}
          onRecorded={data => { showToast(`Payment ${data.receipt_number} recorded`, 'success'); fetchLoan(); }}
          onViewLoan={() => setPayModal(false)}
        />
      )}

      {/* ── Delete Confirm ── */}
      {delModal && (
        <div className="modal-overlay">
          <div className="modal modal--sm">
            <h2>Delete Loan #{id}?</h2>
            <p style={{ margin: '1rem 0', color: 'var(--gray-600)' }}>
              This loan has no payments and will be permanently removed, together with its guarantors and collateral records.
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
    </div>
  );
}
