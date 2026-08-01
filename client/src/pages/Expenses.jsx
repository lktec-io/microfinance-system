import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiSearch, FiEdit2, FiTrash2, FiX,
  FiFileText, FiCalendar, FiFilter, FiEye,
  FiTrendingDown, FiTag, FiChevronDown, FiCheck,
} from 'react-icons/fi';
import ModalPortal  from '../components/common/ModalPortal';
import api          from '../api';
import { useToast } from '../context/ToastContext';
import Skeleton     from '../components/common/Skeleton';
import { fmt }      from '../utils/format';

/* ── Base categories (always available) ─────────────────────────── */
const BASE_CATS = [
  'Rent', 'Utilities', 'Salaries', 'Office Supplies',
  'Marketing', 'Travel', 'Equipment', 'Maintenance',
  'Fuel', 'Internet', 'Transport', 'Other',
];

const LS_CATS_KEY = 'mf_expense_cats';

function loadCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_CATS_KEY) || '[]');
    return [...new Set([...BASE_CATS, ...saved])];
  } catch { return BASE_CATS; }
}

function saveCustomCategory(cat, all) {
  const extras = all.filter(c => !BASE_CATS.includes(c));
  if (!extras.includes(cat) && !BASE_CATS.includes(cat)) extras.push(cat);
  try { localStorage.setItem(LS_CATS_KEY, JSON.stringify(extras)); } catch {}
}

/* ── Category badge color map ───────────────────────────────────── */
const CAT_COLOR = {
  'Rent':            'blue',   'Utilities':       'teal',
  'Salaries':        'green',  'Office Supplies': 'yellow',
  'Marketing':       'orange', 'Travel':          'teal',
  'Equipment':       'blue',   'Maintenance':     'yellow',
  'Fuel':            'orange', 'Internet':        'teal',
  'Transport':       'blue',   'Other':           'gray',
};
function catColor(c) { return CAT_COLOR[c] || 'blue'; }

/* ── Animation variants ─────────────────────────────────────────── */
const pageIn    = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.055, delayChildren: 0.03 } } };
const fadeUp    = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 290, damping: 26 } } };
const fadeSlide = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 320, damping: 28 } } };
const mOverlay  = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.18 } }, exit: { opacity: 0, transition: { duration: 0.14 } } };
const mPanel    = { hidden: { opacity: 0, y: 28, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 28 } }, exit: { opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } } };

/* ════════════════════════════════════════════════════════════════
   QUICK CATEGORY COMBOBOX
   ════════════════════════════════════════════════════════════════ */
function CategoryCombobox({ value, onChange, categories, setCategories }) {
  const [query,    setQuery]    = useState(value || '');
  const [open,     setOpen]     = useState(false);
  const [focused,  setFocused]  = useState(0);
  const inputRef   = useRef(null);
  const listRef    = useRef(null);

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase();
    return categories.filter(c => c.toLowerCase().includes(q));
  }, [query, categories]);

  const showAdd = query.trim() &&
    !categories.find(c => c.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => { setQuery(value || ''); }, [value]);

  function pick(cat) {
    onChange(cat);
    setQuery(cat);
    setOpen(false);
    setFocused(0);
  }

  function addNew() {
    const cat = query.trim();
    if (!cat) return;
    const updated = [...categories, cat];
    setCategories(updated);
    saveCustomCategory(cat, updated);
    pick(cat);
  }

  function handleKeyDown(e) {
    const total = filtered.length + (showAdd ? 1 : 0);
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => (f + 1) % total); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocused(f => (f - 1 + total) % total); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (showAdd && focused === filtered.length) addNew();
      else if (filtered[focused]) pick(filtered[focused]);
    }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="exp-combobox" ref={listRef}>
      <div className="exp-combobox-field">
        <FiTag size={13} className="exp-combobox-icon" />
        <input
          ref={inputRef}
          className="form-input exp-combobox-input"
          placeholder="Select or type a category…"
          value={query}
          onFocus={() => { setOpen(true); setFocused(0); }}
          onBlur={() => setTimeout(() => setOpen(false), 170)}
          onChange={e => { setQuery(e.target.value); setOpen(true); onChange(''); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <FiChevronDown size={13} className={`exp-combobox-caret${open ? ' open' : ''}`} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="exp-combobox-dropdown"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.1 } }}
          >
            {filtered.map((c, i) => (
              <button
                key={c}
                type="button"
                className={`exp-combobox-opt${i === focused ? ' focused' : ''}${value === c ? ' selected' : ''}`}
                onMouseDown={() => pick(c)}
                onMouseEnter={() => setFocused(i)}
              >
                <span className={`badge badge--${catColor(c)}`} style={{ fontSize: '.68rem' }}>{c}</span>
                {value === c && <FiCheck size={12} style={{ marginLeft: 'auto', color: 'var(--green)', flexShrink: 0 }} />}
              </button>
            ))}
            {showAdd && (
              <button
                type="button"
                className={`exp-combobox-opt exp-combobox-opt--new${focused === filtered.length ? ' focused' : ''}`}
                onMouseDown={addNew}
                onMouseEnter={() => setFocused(filtered.length)}
              >
                <FiPlus size={12} /> Add &ldquo;{query.trim()}&rdquo;
              </button>
            )}
            {filtered.length === 0 && !showAdd && (
              <div className="exp-combobox-empty">No categories found</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Summary stat card ──────────────────────────────────────────── */
function ExpStat({ label, value, sub, color, Icon }) {
  return (
    <motion.div className={`exp-stat exp-stat--${color}`} variants={fadeUp}>
      <div className="exp-stat-icon"><Icon size={18} /></div>
      <div className="exp-stat-body">
        <div className="exp-stat-value">{value}</div>
        <div className="exp-stat-label">{label}</div>
        {sub && <div className="exp-stat-sub">{sub}</div>}
      </div>
    </motion.div>
  );
}

/* ── Expense mobile card ────────────────────────────────────────── */
function ExpMobileCard({ exp, onView, onEdit, onDelete }) {
  return (
    <motion.div className="exp-card" variants={fadeSlide}>
      <div className="exp-card-head">
        <div className="exp-card-name">{exp.name}</div>
        <div className="exp-card-amount">TZS {fmt(exp.amount)}</div>
      </div>
      <div className="exp-card-meta">
        <span className={`badge badge--${catColor(exp.category)}`}>{exp.category}</span>
        <span className="exp-card-date">{(exp.expense_date ?? '').slice(0, 10)}</span>
      </div>
      {exp.description && <p className="exp-card-desc">{exp.description}</p>}
      <div className="exp-card-actions">
        <button className="tbl-btn tbl-btn--view"   onClick={() => onView(exp)}      title="View"><FiEye size={13} /></button>
        <button className="tbl-btn tbl-btn--edit"   onClick={() => onEdit(exp)}      title="Edit"><FiEdit2 size={13} /></button>
        <button className="tbl-btn tbl-btn--delete" onClick={() => onDelete(exp.id)} title="Delete"><FiTrash2 size={13} /></button>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════ */
const EMPTY_FORM = { name: '', category: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), description: '' };

export default function Expenses() {
  const { showToast } = useToast();

  const [expenses,    setExpenses]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [modal,       setModal]       = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [editId,      setEditId]      = useState(null);
  const [viewItem,    setViewItem]    = useState(null);
  const [delId,       setDelId]       = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState('');
  const [categories,  setCategories]  = useState(loadCategories);

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

  /* ── Summary computations ── */
  const now       = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const totalAmt  = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const monthAmt  = expenses.filter(e => (e.expense_date ?? '').slice(0, 7) === thisMonth)
                            .reduce((s, e) => s + Number(e.amount || 0), 0);
  const today     = now.toISOString().slice(0, 10);
  const todayAmt  = expenses.filter(e => (e.expense_date ?? '').slice(0, 10) === today)
                            .reduce((s, e) => s + Number(e.amount || 0), 0);

  /* ── Handlers ── */
  function openAdd()    { setForm({ ...EMPTY_FORM, expense_date: today }); setEditId(null); setFormErr(''); setModal('add'); }
  function openEdit(e)  { setForm({ name: e.name, category: e.category, amount: e.amount, expense_date: (e.expense_date ?? '').slice(0, 10), description: e.description || '' }); setEditId(e.id); setFormErr(''); setModal('edit'); }
  function openView(e)  { setViewItem(e); setModal('view'); }
  function openDel(id)  { setDelId(id); setModal('delete'); }
  function closeModal() { setModal(null); setViewItem(null); setDelId(null); setFormErr(''); }

  async function handleSave(ev) {
    ev.preventDefault();
    const { name, category, amount, expense_date } = form;
    if (!name.trim() || !category || !amount || !expense_date) { setFormErr('Please fill in all required fields.'); return; }
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

  async function handleDelete() {
    if (!delId) return;
    try {
      await api.delete(`/expenses/${delId}`);
      setExpenses(prev => prev.filter(x => x.id !== delId));
      showToast('Expense deleted', 'success');
      closeModal();
    } catch { showToast('Failed to delete expense', 'error'); }
  }

  const hasFilters = !!(filterCat || dateFrom || dateTo);

  /* ── Render ── */
  return (
    <motion.div className="page" variants={pageIn} initial="hidden" animate="visible">

      {/* ── Page header ── */}
      <motion.div className="page-header" variants={fadeUp}>
        <div className="page-header-left">
          <div className="page-header-icon" style={{ background: 'var(--red-lt)', color: 'var(--red-dk)' }}>
            <FiTrendingDown size={18} />
          </div>
          <div>
            <h1 className="page-title">Expenses</h1>
            <p className="page-subtitle">Track &amp; manage operational costs</p>
          </div>
        </div>
        <motion.button className="btn btn--primary" onClick={openAdd}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <FiPlus size={15} /> Add Expense
        </motion.button>
      </motion.div>

      {/* ── Summary cards ── */}
      <motion.div className="exp-stat-grid" variants={pageIn}>
        <ExpStat label="Total Expenses"  value={`TZS ${fmt(totalAmt)}`}  sub={`${expenses.length} records`}      color="red"   Icon={FiTrendingDown} />
        <ExpStat label="This Month"      value={`TZS ${fmt(monthAmt)}`}  sub={now.toLocaleString('default', { month: 'long', year: 'numeric' })} color="orange" Icon={FiCalendar} />
        <ExpStat label="Today"           value={`TZS ${fmt(todayAmt)}`}  sub={today} color="blue" Icon={FiFileText} />
      </motion.div>

      {/* ── Filters ── */}
      <motion.div className="exp-filters" variants={fadeUp}>
        <div className="exp-search-wrap">
          <FiSearch size={14} className="exp-search-icon" />
          <input className="exp-search-input" placeholder="Search expenses…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button className="exp-search-clear" onClick={() => setSearch('')}><FiX size={12} /></button>
          )}
        </div>

        <div className="exp-filter-selects">
          <div className="exp-filter-item">
            <FiFilter size={12} className="exp-filter-icon" />
            <select className="exp-filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="exp-filter-item exp-filter-item--date">
            <FiCalendar size={12} className="exp-filter-icon" />
            <input type="date" className="exp-filter-select" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} title="From date" />
          </div>

          <div className="exp-filter-item exp-filter-item--date">
            <span className="exp-filter-sep">—</span>
            <input type="date" className="exp-filter-select" value={dateTo}
              onChange={e => setDateTo(e.target.value)} title="To date" />
          </div>

          {hasFilters && (
            <button className="btn btn--ghost btn--sm exp-clear-btn"
              onClick={() => { setFilterCat(''); setDateFrom(''); setDateTo(''); }}>
              <FiX size={11} /> Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Desktop table ── */}
      <motion.div className="card exp-table-card" variants={fadeUp} style={{ marginBottom: 0 }}>
        {loading ? (
          <Skeleton count={5} />
        ) : expenses.length === 0 ? (
          <div className="table-empty">
            <FiTrendingDown size={32} style={{ color: 'var(--gray-300)', marginBottom: '.75rem' }} />
            <p>No expenses found</p>
            <span>Add your first expense to get started</span>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="table-wrap exp-desktop-table">
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
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--gray-500)', fontSize: '.83rem' }}>
                        {(exp.expense_date ?? '').slice(0, 10)}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{exp.name}</span>
                      </td>
                      <td>
                        <span className={`badge badge--${catColor(exp.category)}`}>{exp.category}</span>
                      </td>
                      <td>
                        <strong className="amount-cell">TZS {fmt(exp.amount)}</strong>
                      </td>
                      <td style={{ color: 'var(--gray-500)', maxWidth: 200 }}>
                        <span className="exp-desc-cell">{exp.description || '—'}</span>
                      </td>
                      <td style={{ color: 'var(--gray-500)', fontSize: '.83rem' }}>
                        {exp.created_by_name || '—'}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="tbl-btn tbl-btn--view"   onClick={() => openView(exp)}    title="View"><FiEye size={13} /></button>
                          <button className="tbl-btn tbl-btn--edit"   onClick={() => openEdit(exp)}    title="Edit"><FiEdit2 size={13} /></button>
                          <button className="tbl-btn tbl-btn--delete" onClick={() => openDel(exp.id)}  title="Delete"><FiTrash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <motion.div className="exp-mobile-cards" variants={pageIn} initial="hidden" animate="visible">
              {expenses.map(exp => (
                <ExpMobileCard key={exp.id} exp={exp}
                  onView={openView} onEdit={openEdit} onDelete={openDel} />
              ))}
            </motion.div>
          </>
        )}
      </motion.div>

      {/* ══════════════════════════════════════════════════════════
          VIEW MODAL
          ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {modal === 'view' && viewItem && (
          <ModalPortal>
            <motion.div className="modal-overlay" variants={mOverlay} initial="hidden" animate="visible" exit="exit" onClick={closeModal}>
              <motion.div className="modal" variants={mPanel} initial="hidden" animate="visible" exit="exit"
                onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                <div className="modal-header">
                  <h2 className="modal-title"><FiFileText size={16} /> Expense Details</h2>
                  <button className="modal-close" onClick={closeModal}><FiX size={16} /></button>
                </div>
                <div className="modal-body">
                  <div className="exp-view-grid">
                    <div className="form-group">
                      <label className="form-label">Expense Name</label>
                      <p className="form-static">{viewItem.name}</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <span className={`badge badge--${catColor(viewItem.category)}`}>{viewItem.category}</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Amount</label>
                      <p className="form-static amount-cell">TZS {fmt(viewItem.amount)}</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <p className="form-static">{(viewItem.expense_date ?? '').slice(0, 10)}</p>
                    </div>
                  </div>
                  {viewItem.description && (
                    <div className="form-group" style={{ marginTop: '.75rem' }}>
                      <label className="form-label">Description</label>
                      <p className="form-static">{viewItem.description}</p>
                    </div>
                  )}
                  <div className="form-group" style={{ marginTop: '.75rem' }}>
                    <label className="form-label">Created By</label>
                    <p className="form-static">{viewItem.created_by_name || '—'}</p>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn--primary" onClick={closeModal}>Close</button>
                </div>
              </motion.div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════
          ADD / EDIT MODAL
          ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {(modal === 'add' || modal === 'edit') && (
          <ModalPortal>
            <motion.div className="modal-overlay" variants={mOverlay} initial="hidden" animate="visible" exit="exit" onClick={closeModal}>
              <motion.div className="modal" variants={mPanel} initial="hidden" animate="visible" exit="exit"
                onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>

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
                      <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{formErr}</div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Expense Name <span className="form-req">*</span></label>
                      <input className="form-input" placeholder="e.g. Office Rent — August"
                        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>

                    {/* Quick Category Combobox */}
                    <div className="form-group">
                      <label className="form-label">Category <span className="form-req">*</span></label>
                      <CategoryCombobox
                        value={form.category}
                        onChange={cat => setForm(f => ({ ...f, category: cat }))}
                        categories={categories}
                        setCategories={setCategories}
                      />
                      {!form.category && (
                        <p className="exp-cat-hint">
                          <FiTag size={11} /> Select existing or type to create a new category
                        </p>
                      )}
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Amount (TZS) <span className="form-req">*</span></label>
                        <input type="number" className="form-input" placeholder="0" min="0" step="0.01"
                          value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Date <span className="form-req">*</span></label>
                        <input type="date" className="form-input"
                          value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} required />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea className="form-input form-textarea" placeholder="Optional notes…" rows={3}
                        value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancel</button>
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

      {/* ══════════════════════════════════════════════════════════
          DELETE CONFIRM MODAL
          ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {modal === 'delete' && (
          <ModalPortal>
            <motion.div className="modal-overlay" variants={mOverlay} initial="hidden" animate="visible" exit="exit" onClick={closeModal}>
              <motion.div className="modal" variants={mPanel} initial="hidden" animate="visible" exit="exit"
                onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                <div className="modal-header">
                  <h2 className="modal-title" style={{ color: 'var(--red)' }}><FiTrash2 size={16} /> Delete Expense</h2>
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
