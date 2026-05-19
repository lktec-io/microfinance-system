import { useEffect, useState, useCallback } from 'react';
import { MdSearch, MdPersonAdd } from 'react-icons/md';
import api from '../api';
import { useToast } from '../context/ToastContext';

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
          <MdSearch size={18} className="search-icon" />
          <input
            className="search-input search-input--icon"
            placeholder="Search by name, phone or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn--primary" onClick={openAdd}>
          <MdPersonAdd size={16} /> Add Customer
        </button>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /><span>Loading…</span></div>
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
                      <td>{i + 1}</td>
                      <td><strong>{c.full_name}</strong></td>
                      <td>{c.phone}</td>
                      <td>{c.id_number || '—'}</td>
                      <td>{c.registration_date?.slice(0, 10)}</td>
                      <td><span className="badge badge--blue">{c.loan_count}</span></td>
                      <td>
                        <button className="btn-sm btn-sm--edit" onClick={() => openEdit(c)}>Edit</button>
                        <button className="btn-sm btn-sm--del"  onClick={() => setDelId(c.id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{modal === 'add' ? 'Add Customer' : 'Edit Customer'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
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
          </div>
        </div>
      )}

      {delId && (
        <div className="modal-overlay">
          <div className="modal modal--sm">
            <h2>Delete Customer?</h2>
            <p style={{ margin: '1rem 0', color: 'var(--gray-600)' }}>
              This action cannot be undone. Customers with loans cannot be deleted.
            </p>
            <div className="modal-actions">
              <button className="btn btn--ghost" onClick={() => setDelId(null)}>Cancel</button>
              <button className="btn btn--danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
