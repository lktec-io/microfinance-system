import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiEye, FiEdit2, FiX,
  FiMessageSquare, FiBell, FiAlertTriangle,
  FiGrid, FiList, FiCalendar, FiDollarSign, FiSearch,
} from 'react-icons/fi';

const gridContainer = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.065, delayChildren: 0.04 } },
};
const gridItem = {
  hidden:  { opacity: 0, y: 18, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 26 } },
};
const modalOverlay = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit:    { opacity: 0, transition: { duration: 0.14 } },
};
const modalPanel = {
  hidden:  { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 28 } },
  exit:    { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } },
};
import api          from '../api';
import { fmt }      from '../utils/format';
import StatusBadge  from '../components/common/StatusBadge';
import Skeleton     from '../components/common/Skeleton';
import SmsSendModal  from '../components/common/SmsSendModal';
import ModalPortal   from '../components/common/ModalPortal';

const EMPTY_FORM = {
  customer_id: '', loan_amount: '', interest_rate: '',
  duration_value: '', duration_unit: 'months', start_date: '', purpose: '',
};
const EDIT_FORM = {
  loan_amount: '', interest_rate: '',
  duration_value: '', duration_unit: 'months',
  start_date: '', due_date: '',
  status: '', purpose: '',
};

const STATUSES = ['pending','active','paid','overdue'];

/* ── Loan Card (grid view) ──────────────────────────────────────── */
function LoanCard({ loan, onView, onEdit, onSms }) {
  const isOverdue = loan.status === 'overdue';
  const isPaid    = loan.status === 'paid';
  return (
    <div className="loan-card">
      {/* Header */}
      <div className="loan-card-header">
        <div className="loan-card-avatar">
          {loan.customer_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="loan-card-info">
          <div className="loan-card-name">{loan.customer_name}</div>
          <div className="loan-card-phone">{loan.customer_phone}</div>
        </div>
        <StatusBadge status={loan.status} />
      </div>

      {/* Financials */}
      <div className="loan-card-body">
        <div className="loan-card-row">
          <span>Principal</span>
          <strong>TZS {fmt(loan.loan_amount)}</strong>
        </div>
        <div className="loan-card-row">
          <span>Total Payable</span>
          <strong>TZS {fmt(loan.total_payable)}</strong>
        </div>
        <div className="loan-card-row">
          <span>Balance</span>
          <strong className={loan.balance > 0 ? 'text-red' : 'text-green'}>
            TZS {fmt(loan.balance)}
          </strong>
        </div>
        <div className="loan-card-row">
          <span><FiCalendar size={12} /> Due Date</span>
          <strong className={isOverdue ? 'text-red' : ''}>
            {loan.due_date?.slice(0, 10) || '—'}
          </strong>
        </div>
      </div>

      {/* Progress bar */}
      {loan.total_payable > 0 && (
        <div className="loan-card-progress">
          <div
            className={`loan-card-progress-fill${isOverdue ? ' loan-card-progress-fill--red' : ''}`}
            style={{ width: `${Math.min(100, (loan.amount_paid / loan.total_payable) * 100)}%` }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="loan-card-actions">
        <button className="icon-btn icon-btn--view" onClick={onView} title="View Details">
          <FiEye size={14} />
        </button>
        <button className="icon-btn icon-btn--edit" onClick={onEdit} title="Edit Loan">
          <FiEdit2 size={14} />
        </button>
        <button
          className="icon-btn icon-btn--sms-ty"
          onClick={() => onSms('thank_you')}
          title="Send Thank You SMS"
        >
          <FiMessageSquare size={14} />
        </button>
        <button
          className="icon-btn icon-btn--sms-rm"
          onClick={() => onSms('reminder')}
          title="Send Reminder SMS"
          disabled={isPaid}
        >
          <FiBell size={14} />
        </button>
        <button
          className="icon-btn icon-btn--sms-ov"
          onClick={() => onSms('overdue')}
          title="Send Overdue SMS"
          disabled={!isOverdue}
        >
          <FiAlertTriangle size={14} />
        </button>
      </div>
    </div>
  );
}

export default function Loans() {
  const navigate = useNavigate();
  const [loans,     setLoans]     = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [viewMode,  setViewMode]  = useState('list');
  const [filter,    setFilter]    = useState('all');

  // Create modal
  const [createModal, setCreateModal] = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [createErr,   setCreateErr]   = useState('');
  const [preview,     setPreview]     = useState(null);

  // Edit modal
  const [editModal,   setEditModal]   = useState(null); // loan object
  const [editForm,    setEditForm]    = useState(EDIT_FORM);
  const [editSaving,  setEditSaving]  = useState(false);
  const [editErr,     setEditErr]     = useState('');
  const [editPreview, setEditPreview] = useState(null);

  // SMS modal
  const [smsModal,  setSmsModal]  = useState(null); // { loan, type }

  // Customer search
  const [search, setSearch] = useState('');

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    const [l, c] = await Promise.all([api.get('/loans'), api.get('/customers')]);
    setLoans(l.data);
    setCustomers(c.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  /* ── Create loan helpers ── */
  function calcPreview(f) {
    const amt  = parseFloat(f.loan_amount);
    const rate = parseFloat(f.interest_rate);
    if (!amt || isNaN(rate)) return null;
    return {
      interest: (amt * rate / 100).toFixed(2),
      total:    (amt + amt * rate / 100).toFixed(2),
    };
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm(f => {
      const u = { ...f, [name]: value };
      setPreview(calcPreview(u));
      return u;
    });
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, start_date: new Date().toISOString().slice(0, 10) });
    setPreview(null); setCreateErr(''); setCreateModal(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true); setCreateErr('');
    try {
      await api.post('/loans', form);
      setCreateModal(false);
      fetchLoans();
    } catch (err) {
      setCreateErr(err.response?.data?.message || 'Failed to create loan');
    } finally { setSaving(false); }
  }

  /* ── Edit loan helpers ── */
  function calcEditPreview(f) {
    const amt  = parseFloat(f.loan_amount);
    const rate = parseFloat(f.interest_rate);
    if (!amt || isNaN(rate)) return null;
    const interest = amt * rate / 100;
    return { interest: interest.toFixed(2), total: (amt + interest).toFixed(2) };
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm(f => {
      const u = { ...f, [name]: value };
      setEditPreview(calcEditPreview(u));
      return u;
    });
  }

  function openEdit(loan) {
    const f = {
      loan_amount:    loan.loan_amount,
      interest_rate:  loan.interest_rate,
      duration_value: loan.duration_value,
      duration_unit:  loan.duration_unit || 'months',
      start_date:     loan.start_date?.slice(0, 10) || '',
      due_date:       loan.due_date?.slice(0, 10) || '',
      status:         loan.status,
      purpose:        loan.purpose || '',
    };
    setEditForm(f);
    setEditPreview(calcEditPreview(f));
    setEditErr('');
    setEditModal(loan);
  }

  async function handleEdit(e) {
    e.preventDefault();
    setEditSaving(true); setEditErr('');
    try {
      await api.put(`/loans/${editModal.id}`, editForm);
      setEditModal(null);
      fetchLoans();
    } catch (err) {
      setEditErr(err.response?.data?.message || 'Failed to update loan');
    } finally { setEditSaving(false); }
  }

  const filtered = loans.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false;
    if (search && !l.customer_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page">

      {/* ── Toolbar ── */}
      <div className="page-toolbar">
        <div className="filter-tabs">
          {['all', ...STATUSES].map(s => (
            <button
              key={s}
              className={`filter-tab${filter === s ? ' filter-tab--active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          {/* View toggle */}
          <div className="view-toggle">
            <button
              className={`view-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <FiList size={14} /> List View
            </button>
            <button
              className={`view-toggle-btn${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <FiGrid size={14} /> Grid View
            </button>
          </div>
          <button className="btn btn--primary" onClick={openCreate}>
            <FiPlus size={16} /> New Loan
          </button>
        </div>
      </div>

      {/* ── Quick Customer Search ── */}
      <motion.div
        className="loan-search-row"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
      >
        <div className="search-wrap" style={{ maxWidth: '420px' }}>
          <FiSearch size={16} className="search-icon" />
          <input
            className="search-input search-input--icon"
            placeholder="Search by customer name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <span style={{ fontSize: '.82rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </motion.div>

      {/* ── Content ── */}
      {loading ? (
        <div className="card"><Skeleton rows={6} cols={7} /></div>

      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FiDollarSign size={36} style={{ color: 'var(--gray-200)' }} />
            <p>No loans found{filter !== 'all' ? ` with status "${filter}"` : ''}</p>
          </div>
        </div>

      ) : viewMode === 'grid' ? (
        <motion.div
          className="loan-grid"
          variants={gridContainer}
          initial="hidden"
          animate="visible"
        >
          {filtered.map(l => (
            <motion.div key={l.id} variants={gridItem} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 340, damping: 26 } }}>
              <LoanCard
                loan={l}
                onView={() => l.id && navigate(`/loans/${l.id}`)}
                onEdit={() => openEdit(l)}
                onSms={(type) => setSmsModal({ loan: l, type })}
              />
            </motion.div>
          ))}
        </motion.div>

      ) : (
        /* ── List view ── */
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>Customer</th><th>Amount</th>
                  <th>Interest</th><th>Total</th><th>Balance</th>
                  <th>Due Date</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={l.id}>
                    <td style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <div className="table-avatar">{l.customer_name?.[0]?.toUpperCase()}</div>
                        <div>
                          <strong>{l.customer_name}</strong>
                          <div style={{ fontSize: '.76rem', color: 'var(--gray-400)' }}>{l.customer_phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>TZS {fmt(l.loan_amount)}</td>
                    <td>{l.interest_rate}%</td>
                    <td>TZS {fmt(l.total_payable)}</td>
                    <td><strong className={l.balance > 0 ? 'text-red' : 'text-green'}>TZS {fmt(l.balance)}</strong></td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '.84rem' }}>{l.due_date?.slice(0, 10) || '—'}</td>
                    <td><StatusBadge status={l.status} /></td>
                    <td>
                      <div className="icon-btns">
                        <button
                          className="icon-btn icon-btn--view"
                          onClick={() => l.id && navigate(`/loans/${l.id}`)}
                          title="View Details"
                        ><FiEye size={14} /></button>
                        <button
                          className="icon-btn icon-btn--edit"
                          onClick={() => openEdit(l)}
                          title="Edit Loan"
                        ><FiEdit2 size={14} /></button>
                        <button
                          className="icon-btn icon-btn--sms-ty"
                          onClick={() => setSmsModal({ loan: l, type: 'thank_you' })}
                          title="Thank You SMS"
                        ><FiMessageSquare size={14} /></button>
                        <button
                          className="icon-btn icon-btn--sms-rm"
                          onClick={() => setSmsModal({ loan: l, type: 'reminder' })}
                          title="Reminder SMS"
                          disabled={l.status === 'paid'}
                        ><FiBell size={14} /></button>
                        <button
                          className="icon-btn icon-btn--sms-ov"
                          onClick={() => setSmsModal({ loan: l, type: 'overdue' })}
                          title="Overdue SMS"
                          disabled={l.status !== 'overdue'}
                        ><FiAlertTriangle size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ModalPortal>
        {/* ── Create Loan Modal ── */}
        <AnimatePresence>
          {createModal && (
            <motion.div className="modal-overlay" variants={modalOverlay} initial="hidden" animate="visible" exit="exit">
              <motion.div className="modal modal--lg" variants={modalPanel}>
                <div className="modal-header">
                  <h2>Create New Loan</h2>
                  <button className="modal-close" onClick={() => setCreateModal(false)}><FiX size={18} /></button>
                </div>
                <form onSubmit={handleCreate} className="modal-form">
                  <div className="modal-body">
                    {createErr && <div className="alert alert--error" style={{ marginBottom: '.75rem' }}>{createErr}</div>}
                    <div className="form-group">
                      <label>Customer *</label>
                      <select required name="customer_id" value={form.customer_id} onChange={handleFormChange}>
                        <option value="">— Select Customer —</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Loan Amount (TZS) *</label>
                        <input type="number" min="1" step="0.01" required
                          name="loan_amount" value={form.loan_amount} onChange={handleFormChange} />
                      </div>
                      <div className="form-group">
                        <label>Interest Rate (%) *</label>
                        <input type="number" min="0" step="0.01" required
                          name="interest_rate" value={form.interest_rate} onChange={handleFormChange} />
                      </div>
                    </div>
                    {preview && (
                      <div className="loan-preview">
                        <div className="loan-preview-item">
                          <span>Interest</span><strong>TZS {fmt(preview.interest)}</strong>
                        </div>
                        <div className="loan-preview-item loan-preview-total">
                          <span>Total Payable</span><strong>TZS {fmt(preview.total)}</strong>
                        </div>
                      </div>
                    )}
                    <div className="form-row">
                      <div className="form-group">
                        <label>Duration *</label>
                        <input type="number" min="1" required
                          name="duration_value" value={form.duration_value} onChange={handleFormChange} />
                      </div>
                      <div className="form-group">
                        <label>Unit *</label>
                        <select name="duration_unit" value={form.duration_unit} onChange={handleFormChange}>
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                          <option value="months">Months</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Start Date</label>
                      <input type="date" name="start_date" value={form.start_date} onChange={handleFormChange} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Purpose</label>
                      <textarea rows={2} name="purpose" value={form.purpose} onChange={handleFormChange} />
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn btn--ghost" onClick={() => setCreateModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn--primary" disabled={saving}>
                      {saving ? 'Creating…' : 'Create Loan'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Edit Loan Modal ── */}
        <AnimatePresence>
          {editModal && (
            <motion.div className="modal-overlay" variants={modalOverlay} initial="hidden" animate="visible" exit="exit">
              <motion.div className="modal modal--lg" variants={modalPanel}>
                <div className="modal-header">
                  <h2>Edit Loan #{editModal.id}</h2>
                  <button className="modal-close" onClick={() => setEditModal(null)}><FiX size={18} /></button>
                </div>
                <form onSubmit={handleEdit} className="modal-form">
                  <div className="modal-body">
                    <div className="alert alert--info" style={{ marginBottom: '.85rem', fontSize: '.84rem' }}>
                      <strong>{editModal.customer_name}</strong>
                      <span style={{ margin: '0 .5rem', opacity: .4 }}>·</span>
                      Original: <strong>TZS {fmt(editModal.loan_amount)}</strong>
                      <span style={{ margin: '0 .5rem', opacity: .4 }}>·</span>
                      Paid: <strong style={{ color: 'var(--green)' }}>TZS {fmt(editModal.amount_paid)}</strong>
                    </div>
                    {editErr && <div className="alert alert--error" style={{ marginBottom: '.75rem' }}>{editErr}</div>}

                    {/* Financial fields */}
                    <div className="form-row">
                      <div className="form-group">
                        <label>Loan Amount (TZS) *</label>
                        <input
                          type="number" min="1" step="0.01" required
                          name="loan_amount"
                          value={editForm.loan_amount}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Interest Rate (%) *</label>
                        <input
                          type="number" min="0" step="0.01" required
                          name="interest_rate"
                          value={editForm.interest_rate}
                          onChange={handleEditChange}
                        />
                      </div>
                    </div>

                    {/* Live recalculation preview */}
                    {editPreview && (
                      <div className="loan-preview" style={{ marginBottom: '.85rem' }}>
                        <div className="loan-preview-item">
                          <span>Interest</span>
                          <strong>TZS {fmt(editPreview.interest)}</strong>
                        </div>
                        <div className="loan-preview-item loan-preview-total">
                          <span>New Total Payable</span>
                          <strong>TZS {fmt(editPreview.total)}</strong>
                        </div>
                      </div>
                    )}

                    {/* Duration */}
                    <div className="form-row">
                      <div className="form-group">
                        <label>Duration</label>
                        <input
                          type="number" min="1"
                          name="duration_value"
                          value={editForm.duration_value}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Unit</label>
                        <select name="duration_unit" value={editForm.duration_unit} onChange={handleEditChange}>
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                          <option value="months">Months</option>
                        </select>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="form-row">
                      <div className="form-group">
                        <label>Start Date</label>
                        <input
                          type="date"
                          name="start_date"
                          value={editForm.start_date}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="form-group">
                        <label>Due Date</label>
                        <input
                          type="date"
                          name="due_date"
                          value={editForm.due_date}
                          onChange={handleEditChange}
                        />
                      </div>
                    </div>

                    {/* Status */}
                    <div className="form-group">
                      <label>Status *</label>
                      <select required name="status" value={editForm.status} onChange={handleEditChange}>
                        {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>

                    {/* Notes */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Notes / Purpose</label>
                      <textarea
                        rows={2}
                        name="purpose"
                        value={editForm.purpose}
                        onChange={handleEditChange}
                        placeholder="Optional notes about this loan…"
                      />
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn btn--ghost" onClick={() => setEditModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn--primary" disabled={editSaving}>
                      {editSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SMS Send Modal ── */}
        {smsModal && (
          <SmsSendModal
            loan={smsModal.loan}
            type={smsModal.type}
            onClose={() => setSmsModal(null)}
          />
        )}
      </ModalPortal>
    </div>
  );
}
