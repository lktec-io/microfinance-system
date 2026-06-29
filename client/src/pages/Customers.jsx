import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiUserPlus, FiGrid, FiList, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import api from '../api';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/common/Skeleton';

const gridContainer = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const gridItem = {
  hidden:  { opacity: 0, y: 20, scale: 0.97 },
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

const EMPTY = { full_name: '', phone: '', address: '', id_number: '', registration_date: '' };

export default function Customers() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [editId,    setEditId]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [delId,     setDelId]     = useState(null);
  const [viewMode,  setViewMode]  = useState('list');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get('/customers', { params: search ? { search } : {} });
    setCustomers(data);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  function openAdd() {
    setForm({ ...EMPTY, registration_date: new Date().toISOString().slice(0, 10) });
    setEditId(null); setError(''); setModal('add');
  }

  function openEdit(c) {
    setForm({
      full_name: c.full_name, phone: c.phone,
      address: c.address, id_number: c.id_number || '',
      registration_date: c.registration_date?.slice(0, 10) || '',
    });
    setEditId(c.id); setError(''); setModal('edit');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (modal === 'add') {
        await api.post('/customers', form);
        showToast('Customer added successfully', 'success');
      } else {
        await api.put(`/customers/${editId}`, form);
        showToast('Customer updated', 'success');
      }
      setModal(null);
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    try {
      await api.delete(`/customers/${delId}`);
      setDelId(null);
      showToast('Customer deleted', 'info');
      fetchCustomers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
      setDelId(null);
    }
  }

  return (
    <div className="page">
      <div className="page-toolbar">
        <div className="search-wrap">
          <FiSearch size={18} className="search-icon" />
          <input
            className="search-input search-input--icon"
            placeholder="Search by name, phone or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <div className="view-toggle">
            <button
              className={`view-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List <FiList size={15} />
            </button>
            <button
              className={`view-toggle-btn${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Grid <FiGrid size={15} />
            </button>
          </div>
          <button className="btn btn--primary" onClick={openAdd}>
            <FiUserPlus size={16} /> Add Customer
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card"><Skeleton rows={6} cols={5} /></div>
      ) : viewMode === 'grid' ? (
        customers.length === 0
          ? <div className="card"><p className="empty-msg text-center">No customers found</p></div>
          : (
            <motion.div
              className="customer-grid"
              variants={gridContainer}
              initial="hidden"
              animate="visible"
            >
              {customers.map(c => (
                <motion.div key={c.id} className="customer-card" variants={gridItem} whileHover={{ y: -4, transition: { type: 'spring', stiffness: 340, damping: 26 } }}>
                  <div className="customer-card-avatar">
                    {c.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="customer-card-name">{c.full_name}</div>
                  <div className="customer-card-phone">{c.phone}</div>
                  {c.id_number && (
                    <div style={{ fontSize: '.76rem', color: 'var(--gray-400)' }}>
                      ID: {c.id_number}
                    </div>
                  )}
                  <div className="customer-card-address">{c.address}</div>
                  <span className="badge badge--blue" style={{ marginTop: '.2rem' }}>
                    {c.loan_count} loan{c.loan_count !== 1 ? 's' : ''}
                  </span>
                  <div className="customer-card-actions">
                    <button className="icon-btn icon-btn--edit" onClick={() => openEdit(c)} title="Edit customer">
                      <FiEdit2 size={16} />
                    </button>
                    <button className="icon-btn icon-btn--del" onClick={() => setDelId(c.id)} title="Delete customer">
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>Full Name</th><th>Phone</th>
                  <th>ID Number</th><th>Reg. Date</th><th>Loans</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0
                  ? <tr><td colSpan={7} className="text-center">No customers found</td></tr>
                  : customers.map((c, i) => (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                          <div className="table-avatar">{c.full_name?.[0]?.toUpperCase()}</div>
                          <strong>{c.full_name}</strong>
                        </div>
                      </td>
                      <td>{c.phone}</td>
                      <td>{c.id_number || '—'}</td>
                      <td>{c.registration_date?.slice(0, 10)}</td>
                      <td><span className="badge badge--blue">{c.loan_count}</span></td>
                      <td>
                        <div className="icon-btns">
                          <button className="icon-btn icon-btn--edit" onClick={() => openEdit(c)} title="Edit customer">
                            <FiEdit2 size={15} />
                          </button>
                          <button className="icon-btn icon-btn--del" onClick={() => setDelId(c.id)} title="Delete customer">
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay" variants={modalOverlay} initial="hidden" animate="visible" exit="exit">
            <motion.div className="modal" variants={modalPanel}>
              <div className="modal-header">
                <h2>{modal === 'add' ? 'Add Customer' : 'Edit Customer'}</h2>
                <button className="modal-close" onClick={() => setModal(null)} aria-label="Close"><FiX size={18} /></button>
              </div>
              {error && <div className="alert alert--error">{error}</div>}
              <form onSubmit={handleSave} className="modal-form">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input required value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone *</label>
                    <input required value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>ID Number</label>
                    <input value={form.id_number}
                      onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Address *</label>
                  <textarea required rows={2} value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Registration Date</label>
                  <input type="date" value={form.registration_date}
                    onChange={e => setForm(f => ({ ...f, registration_date: e.target.value }))} />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn--primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {delId && (
          <motion.div className="modal-overlay" variants={modalOverlay} initial="hidden" animate="visible" exit="exit">
            <motion.div className="modal modal--sm" variants={modalPanel}>
              <h2>Delete Customer?</h2>
              <p style={{ margin: '1rem 0', color: 'var(--gray-600)' }}>
                This action cannot be undone. Customers with loans cannot be deleted.
              </p>
              <div className="modal-actions">
                <button className="btn btn--ghost" onClick={() => setDelId(null)}>Cancel</button>
                <button className="btn btn--danger" onClick={handleDelete}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
