import { useEffect, useState, useCallback } from 'react';
import {
  MdPeopleAlt, MdPersonAdd, MdAdminPanelSettings, MdPerson,
  MdGridView, MdViewList, MdVisibility, MdVisibilityOff,
  MdEdit, MdDelete,
} from 'react-icons/md';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/common/Skeleton';

const EMPTY = { name: '', email: '', password: '', role: 'staff', is_active: 1 };

export default function Users() {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [editId,   setEditId]   = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [delId,    setDelId]    = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [showPw,   setShowPw]   = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get('/auth/users');
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function openAdd() {
    setForm(EMPTY); setEditId(null); setError(''); setShowPw(false); setModal('add');
  }

  function openEdit(u) {
    setForm({ name: u.name, email: u.email, password: '', role: u.role, is_active: u.is_active });
    setEditId(u.id); setError(''); setShowPw(false); setModal('edit');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError('');
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
    } finally { setSaving(false); }
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
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <div className="view-toggle">
            <button
              className={`view-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
              onClick={() => setViewMode('list')} title="List view"
            >
              <MdViewList size={19} />
            </button>
            <button
              className={`view-toggle-btn${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')} title="Grid view"
            >
              <MdGridView size={19} />
            </button>
          </div>
          <button className="btn btn--primary" onClick={openAdd}>
            <MdPersonAdd size={16} /> Add User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card"><Skeleton rows={4} cols={5} /></div>
      ) : viewMode === 'grid' ? (
        users.length === 0
          ? <div className="card"><p className="empty-msg text-center">No users found</p></div>
          : (
            <div className="users-grid">
              {users.map(u => (
                <div key={u.id} className="user-card">
                  <div className="user-card-avatar">
                    {u.role === 'admin'
                      ? <MdAdminPanelSettings size={22} />
                      : <MdPerson size={22} />
                    }
                  </div>
                  <div className="user-card-name">
                    {u.name}
                    {u.id === me?.id && (
                      <span style={{ marginLeft: '.35rem', fontSize: '.7rem', color: 'var(--primary)', fontWeight: 700 }}>you</span>
                    )}
                  </div>
                  <div className="user-card-email">{u.email}</div>
                  <div className="user-card-badges">
                    <span className={`badge badge--${u.role === 'admin' ? 'blue' : 'gray'}`}>{u.role}</span>
                    <span className={`badge badge--${u.is_active ? 'green' : 'red'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ fontSize: '.74rem', color: 'var(--gray-400)', marginTop: '.1rem' }}>
                    Joined {u.created_at?.slice(0, 10)}
                  </div>
                  <div className="user-card-actions">
                    <button className="icon-btn icon-btn--edit" onClick={() => openEdit(u)} title="Edit user">
                      <MdEdit size={16} />
                    </button>
                    {u.id !== me?.id && (
                      <button className="icon-btn icon-btn--del" onClick={() => setDelId(u.id)} title="Delete user">
                        <MdDelete size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
      ) : (
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
                              <span style={{ marginLeft: '.4rem', fontSize: '.72rem', color: 'var(--primary)', fontWeight: 600 }}>you</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--gray-600)' }}>{u.email}</td>
                      <td>
                        <span className={`badge badge--${u.role === 'admin' ? 'blue' : 'gray'}`}>{u.role}</span>
                      </td>
                      <td>
                        <span className={`badge badge--${u.is_active ? 'green' : 'red'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--gray-500)', fontSize: '.85rem' }}>{u.created_at?.slice(0, 10)}</td>
                      <td>
                        <div className="icon-btns">
                          <button className="icon-btn icon-btn--edit" onClick={() => openEdit(u)} title="Edit user">
                            <MdEdit size={15} />
                          </button>
                          {u.id !== me?.id && (
                            <button className="icon-btn icon-btn--del" onClick={() => setDelId(u.id)} title="Delete user">
                              <MdDelete size={15} />
                            </button>
                          )}
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
                <div className="pw-wrap">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required={modal === 'add'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                    {showPw ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                  </button>
                </div>
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
