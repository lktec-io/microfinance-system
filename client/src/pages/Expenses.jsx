import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiX,
  FiFileText, FiCalendar, FiFilter, FiEye,
} from 'react-icons/fi';
import ModalPortal from '../components/common/ModalPortal';
import api         from '../api';
import { useToast } from '../context/ToastContext';
import Skeleton    from '../components/common/Skeleton';
import { fmt }     from '../utils/format';

/* ── Constants ─────────────────────────────────────────────────── */
const CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Office Supplies',
  'Marketing', 'Travel', 'Equipment', 'Maintenance', 'Other',
];

const EMPTY = {
  name: '', category: '', amount: '',
  expense_date: new Date().toISOString().slice(0, 10), description: '',
};

/* ── Animation variants ─────────────────────────────────────────── */
const pageIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 26 } },
};
const rowVariants = {
  hidden:  { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 320, damping: 28 } },
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

/* ── Category badge color ───────────────────────────────────────── */
const CAT_COLORS = {
  'Rent':            'blue',
  'Utilities':       'teal',
  'Salaries':        'green',
  'Office Supplies': 'yellow',
  'Marketing':       'orange',
  'Travel':          'teal',
  'Equipment':       'blue',
  'Maintenance':     'yellow',
  'Other':           'gray',
};

function CategoryBadge({ cat }) {
  const color = CAT_COLORS[cat] || 'gray';
  return <span className={`badge badge--${color}`}>{cat}</span>;
}

/* ── View Modal (read-only) ─────────────────────────────────────── */
function ViewModal({ expense, onClose }) {
  if (!expense) return null;
  return (
    <ModalPortal>
      <AnimatePresence>
        <motion.div className="modal-overlay" variants={modalOverlay}
          initial="hidden" animate="visible" exit="exit"
          onClick={onClose}>
          <motion.div className="modal" variants={modalPanel}
            initial="hidden" animate="visible" exit="exit"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 className="modal-title"><FiFileText size={16} /> Expense Details</h2>
              <button className="modal-close" onClick={onClose}><FiX size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Expense Name</label>
                  <p className="form-static">{expense.name}</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <CategoryBadge cat={expense.category} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <p className="form-static amount-cell">TZS {fmt(expense.amount)}</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <p className="form-static">{expense.expense_date?.slice(0, 10)}</p>
                </div>
              </div>
              {expense.description && (
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <p className="form-static">{expense.description}</p>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Created By</label>
                <p className="form-static">{expense.created_by_name || '—'}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn--primary" onClick={onClose}>Close</button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </ModalPortal>
  );
}

/* ════════════════════════════════════════════════════════════════
   EXPENSES PAGE
   ════════════════════════════════════════════════════════════════ */
export default function Expenses() {
  const { showToast } = useToast();

  const [expenses,    setExpenses]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [modal,       setModal]       = useState(null); // 'add' | 'edit' | 'view' | 'delete'
  const [form,        setForm]        = useState(EMPTY);
  const [editId,      setEditId]      = useState(null);
  const [viewItem,    setViewItem]    = useState(null);
  const [delId,       setDelId]       = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState('');

  /* ── Fetch ── */
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)    params.search    = search;
      if (filterCat) params.category  = filterCat;
      if (dateFrom)  params.date_from = dateFrom;
      if (dateTo)    params.date_to   = dateTo;
      const { data } = await api.get('/expenses', { params });
      setExpenses(data);
    } catch {
      showToast('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filterCat, dateFrom, dateTo, showToast]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  /* ── Helpers ── */
  function openAdd() {
    setForm({ ...EMPTY, expense_date: new Date().toISOString().slice(0, 10) });
    setEditId(null); setFormErr(''); setModal('add');
  }
  function openEdit(exp) {
    setForm({
      name: exp.name, category: exp.category,
      amount: exp.amount, expense_date: exp.expense_date?.slice(0, 10),
      description: exp.description || '',
    });
    setEditId(exp.id); setFormErr(''); setModal('edit');
  }
  function openView(exp) { setViewItem(exp); setModal('view'); }
  function openDelete(id) { setDelId(id); setModal('delete'); }
  function closeModal() { setModal(null); setViewItem(null); setDelId(null); setFormErr(''); }

  /* ── Save (add/edit) ── */
  async function handleSave(e) {
    e.preventDefault();
    const { name, category, amount, expense_date } = form;
    if (!name.trim() || !category || !amount || !expense_date) {
      setFormErr('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        const { data } = await api.put(`/expenses/${editId}`, form);
        setExpenses(prev => prev.map(x => x.id === editId ? data : x));
        showToast('Expense updated', 'success');
      } else {
        const { data } = await api.post('/expenses', form);
        setExpenses(prev => [data, ...prev]);
        showToast('Expense added', 'success');
      }
      closeModal();
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (!delId) return;
    try {
      await api.delete(`/expenses/${delId}`);
      setExpenses(prev => prev.filter(x => x.id !== delId));
      showToast('Expense deleted', 'success');
      closeModal();
    } catch {
      showToast('Failed to delete expense', 'error');
    }
  }

  /* ── Total ── */
  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  /* ── Render ── */
  return (
    <motion.div className="page" variants={pageIn} initial="hidden" animate="visible">

      {/* ── Page header ── */}
      <motion.div className="page-header" variants={fadeUp}>
        <div className="page-header-left">
          <div className="page-header-icon" style={{ background: 'var(--red-lt)', color: 'var(--red-dk)' }}>
            <FiFileText size={18} />
          </div>
          <div>
            <h1 className="page-title">Expenses</h1>
            <p className="page-subtitle">Track and manage operational costs</p>
          </div>
        </div>
        <motion.button
          className="btn btn--primary"
          onClick={openAdd}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <FiPlus size={15} /> Add Expense
        </motion.button>
      </motion.div>

      {/* ── Summary strip ── */}
      <motion.div className="expense-summary-strip" variants={fadeUp}>
        <div className="expense-summary-item">
          <span className="expense-summary-label">Total Expenses</span>
          <span className="expense-summary-value amount-cell">TZS {fmt(totalAmount)}</span>
        </div>
        <div className="expense-summary-divider" />
        <div className="expense-summary-item">
          <span className="expense-summary-label">Records</span>
          <span className="expense-summary-value">{expenses.length}</span>
        </div>
      </motion.div>

      {/* ── Filters ── */}
      <motion.div className="expense-filters" variants={fadeUp}>
        {/* Search */}
        <div className="filter-search-wrap">
          <FiSearch size={14} className="filter-search-icon" />
          <input
            className="filter-search-input"
            placeholder="Search expenses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="filter-search-clear" onClick={() => setSearch('')}>
              <FiX size={12} />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="filter-select-wrap">
          <FiFilter size={13} className="filter-select-icon" />
          <select
            className="filter-select"
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Date from */}
        <div className="filter-date-wrap">
          <FiCalendar size={13} className="filter-date-icon" />
          <input
            type="date"
            className="filter-date-input"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            placeholder="From"
          />
        </div>

        {/* Date to */}
        <div className="filter-date-wrap">
          <FiCalendar size={13} className="filter-date-icon" />
          <input
            type="date"
            className="filter-date-input"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            placeholder="To"
          />
        </div>

        {/* Clear filters */}
        {(filterCat || dateFrom || dateTo) && (
          <button className="btn btn--ghost btn--sm"
            onClick={() => { setFilterCat(''); setDateFrom(''); setDateTo(''); }}>
            <FiX size={12} /> Clear
          </button>
        )}
      </motion.div>

      {/* ── Table ── */}
      <motion.div className="card" variants={fadeUp} style={{ marginBottom: 0 }}>
        {loading ? (
          <Skeleton count={5} />
        ) : expenses.length === 0 ? (
          <div className="table-empty">
            <FiFileText size={32} style={{ color: 'var(--gray-300)', marginBottom: '.75rem' }} />
            <p>No expenses found</p>
            <span>Add your first expense to get started</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense Name</th>
                  <th>Category</th>
                  <th>Amount (TZS)</th>
                  <th>Description</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={pageIn} initial="hidden" animate="visible">
                {expenses.map((exp, i) => (
                  <motion.tr key={exp.id} variants={rowVariants}
                    custom={i} style={{ animationDelay: `${i * 0.03}s` }}>
                    <td style={{ whiteSpace: 'nowrap' }}>{exp.expense_date?.slice(0, 10)}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{exp.name}</span>
                    </td>
                    <td><CategoryBadge cat={exp.category} /></td>
                    <td>
                      <strong className="amount-cell">TZS {fmt(exp.amount)}</strong>
                    </td>
                    <td style={{ color: 'var(--gray-500)', maxWidth: 220 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exp.description || '—'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--gray-500)' }}>{exp.created_by_name || '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button className="tbl-btn tbl-btn--view"   onClick={() => openView(exp)}   title="View"><FiEye size={13} /></button>
                        <button className="tbl-btn tbl-btn--edit"   onClick={() => openEdit(exp)}   title="Edit"><FiEdit2 size={13} /></button>
                        <button className="tbl-btn tbl-btn--delete" onClick={() => openDelete(exp.id)} title="Delete"><FiTrash2 size={13} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ── View Modal ── */}
      {modal === 'view' && <ViewModal expense={viewItem} onClose={closeModal} />}

      {/* ── Add / Edit Modal ── */}
      <AnimatePresence>
        {(modal === 'add' || modal === 'edit') && (
          <ModalPortal>
            <motion.div className="modal-overlay" variants={modalOverlay}
              initial="hidden" animate="visible" exit="exit"
              onClick={closeModal}>
              <motion.div className="modal" variants={modalPanel}
                initial="hidden" animate="visible" exit="exit"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: 480 }}>

                <div className="modal-header">
                  <h2 className="modal-title">
                    <FiFileText size={16} />
                    {modal === 'add' ? 'Add Expense' : 'Edit Expense'}
                  </h2>
                  <button className="modal-close" onClick={closeModal}><FiX size={16} /></button>
                </div>

                <form onSubmit={handleSave}>
                  <div className="modal-body">

                    {formErr && (
                      <div className="alert alert--error" style={{ marginBottom: '1rem' }}>
                        {formErr}
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Expense Name <span className="form-req">*</span></label>
                      <input
                        className="form-input"
                        placeholder="e.g. Office Rent — August"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Category <span className="form-req">*</span></label>
                        <select
                          className="form-input"
                          value={form.category}
                          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                          required>
                          <option value="">Select category</option>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Amount (TZS) <span className="form-req">*</span></label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="0"
                          min="0"
                          step="0.01"
                          value={form.amount}
                          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Date <span className="form-req">*</span></label>
                      <input
                        type="date"
                        className="form-input"
                        value={form.expense_date}
                        onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-input form-textarea"
                        placeholder="Optional notes…"
                        rows={3}
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      />
                    </div>

                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn--ghost" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn--primary" disabled={saving}>
                      {saving ? 'Saving…' : modal === 'add' ? 'Add Expense' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {modal === 'delete' && (
          <ModalPortal>
            <motion.div className="modal-overlay" variants={modalOverlay}
              initial="hidden" animate="visible" exit="exit"
              onClick={closeModal}>
              <motion.div className="modal" variants={modalPanel}
                initial="hidden" animate="visible" exit="exit"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: 400 }}>
                <div className="modal-header">
                  <h2 className="modal-title" style={{ color: 'var(--red)' }}>
                    <FiTrash2 size={16} /> Delete Expense
                  </h2>
                  <button className="modal-close" onClick={closeModal}><FiX size={16} /></button>
                </div>
                <div className="modal-body">
                  <p style={{ color: 'var(--gray-600)' }}>
                    Are you sure you want to delete this expense? This action cannot be undone.
                  </p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn--ghost" onClick={closeModal}>Cancel</button>
                  <button className="btn btn--danger" onClick={handleDelete}>Delete</button>
                </div>
              </motion.div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
