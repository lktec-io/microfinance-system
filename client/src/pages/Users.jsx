import { useEffect, useState, useCallback } from 'react';
import { MdPeopleAlt, MdPersonAdd, MdAdminPanelSettings, MdPerson } from 'react-icons/md';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/common/Spinner';

const EMPTY = { name: '', email: '', password: '', role: 'staff', is_active: 1 };

export default function Users() {
  const { user: me } = useAuth();
  const { showToast } = useToast();
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
        showToast('User created successfully', 'success');
      } else {
        await api.put(`/auth/users/${editId}`, form);
        showToast('User updated', 'success');
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
      showToast('User deleted', 'info');
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed', 'error');
      setDelId(null);
    }
  }

  return (
    <div className="page">
      <div className="page-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <MdPeopleAlt size={22} style={{ color: 'var(--primary)' }} />
          <h2 className="page-section-title" style={{ margin: 0 }}>Staff Accounts</h2>
        </div>
        <button className="btn btn--primary" onClick={openAdd}>
          <MdPersonAdd size={16} /> Add User
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Email</th>
                  <th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0
                  ? <tr><td colSpan={7} className="text-center">No users found</td></tr>
                  : users.map((u, i) => (
                    <tr key={u.id}>
                      <td style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          <span className="user-avatar-sm">
                            {u.role === 'admin'
                              ? <MdAdminPanelSettings size={14} />
                              : <MdPerson size={14} />
                            }
                          </span>
                          <div>
                            <strong>{u.name}</strong>
                            {u.id === me?.id && (
                              <span style={{
                                marginLeft: '.4rem',
                                fontSize: '.72rem',
                                color: 'var(--primary)',
                                fontWeight: 600,
                              }}>you</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--gray-600)' }}>{u.email}</td>
                      <td>
                        <span className={`badge badge--${u.role === 'admin' ? 'blue' : 'gray'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge--${u.is_active ? 'green' : 'red'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--gray-500)', fontSize: '.85rem' }}>
                        {u.created_at?.slice(0, 10)}
                      </td>
                      <td>
                        <button className="btn-sm btn-sm--edit" onClick={() => openEdit(u)}>Edit</button>
                        {u.id !== me?.id && (
                          <button className="btn-sm btn-sm--del" onClick={() => setDelId(u.id)}>Delete</button>
                        )}
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
            <h2>Delete User?</h2>
            <p style={{ margin: '1rem 0', color: 'var(--gray-600)' }}>
              This will permanently remove the account.
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
