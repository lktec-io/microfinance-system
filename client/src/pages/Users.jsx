import { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const EMPTY = { name: '', email: '', password: '', role: 'staff', is_active: 1 };

export default function Users() {
  const { user: me } = useAuth();
  const [users,  setUsers]  = useState([]);
  const [loading,setLoading]= useState(true);
  const [modal,  setModal]  = useState(null);
  const [form,   setForm]   = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [delId,  setDelId]  = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get('/auth/users');
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function openAdd() {
    setForm(EMPTY);
    setEditId(null);
    setError('');
    setModal('add');
  }

  function openEdit(u) {
    setForm({ name: u.name, email: u.email, password: '', role: u.role, is_active: u.is_active });
    setEditId(u.id);
    setError('');
    setModal('edit');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (modal === 'add') {
        await api.post('/auth/register', form);
      } else {
        await api.put(`/auth/users/${editId}`, form);
      }
      setModal(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/auth/users/${delId}`);
      setDelId(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  }

  return (
    <div className="page">
      <div className="page-toolbar">
        <h2 className="page-section-title">Staff Accounts</h2>
        <button className="btn btn--primary" onClick={openAdd}>+ Add User</button>
      </div>

      {loading
        ? <div className="page-loader">Loading…</div>
        : (
          <div className="card">
            <table className="table">
              <thead>
                <tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id}>
                    <td>{i + 1}</td>
                    <td><strong>{u.name}</strong>{u.id === me?.id ? ' (you)' : ''}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge badge--${u.role === 'admin' ? 'blue' : 'gray'}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`badge badge--${u.is_active ? 'green' : 'red'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{u.created_at?.slice(0,10)}</td>
                    <td>
                      <button className="btn-sm btn-sm--edit" onClick={() => openEdit(u)}>Edit</button>
                      {u.id !== me?.id && (
                        <button className="btn-sm btn-sm--del" onClick={() => setDelId(u.id)}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{modal === 'add' ? 'Add User' : 'Edit User'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            {error && <div className="alert alert--error">{error}</div>}
            <form onSubmit={handleSave} className="modal-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>{modal === 'add' ? 'Password *' : 'New Password (leave blank to keep)'}</label>
                <input type="password" required={modal === 'add'} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: Number(e.target.value) }))}>
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit"  className="btn btn--primary" disabled={saving}>
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
            <h2>Delete User?</h2>
            <p>This will permanently remove the account.</p>
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
