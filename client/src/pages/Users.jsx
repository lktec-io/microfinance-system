import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiUserPlus, FiShield, FiUser,
  FiEye, FiEyeOff, FiEdit2, FiTrash2, FiX, FiSearch,
} from 'react-icons/fi';
import api           from '../api';
import { useAuth }   from '../context/AuthContext';
import { useToast }  from '../context/ToastContext';
import Skeleton      from '../components/common/Skeleton';

const EMPTY = { name: '', email: '', password: '', role: 'staff', is_active: 1 };

const cardContainer = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};
const cardItem = {
  hidden:  { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 26 },
  },
};

export default function Users() {
  const { user: me }  = useAuth();
  const { showToast } = useToast();

  /* ── State (all business logic preserved) ─────────────────────── */
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(null);
  const [form,         setForm]         = useState(EMPTY);
  const [editId,       setEditId]       = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [delId,        setDelId]        = useState(null);
  const [showPw,       setShowPw]       = useState(false);
  const [search,       setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  /* ── Data fetching ─────────────────────────────────────────────── */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get('/auth/users');
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* ── CRUD handlers (unchanged) ─────────────────────────────────── */
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

  /* ── Derived stats ─────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total:    users.length,
    admins:   users.filter(u => u.role === 'admin').length,
    staff:    users.filter(u => u.role === 'staff').length,
    active:   users.filter(u => u.is_active).length,
  }), [users]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter(u => {
      if (q && !(u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))) return false;
      if (activeFilter === 'admin')    return u.role === 'admin';
      if (activeFilter === 'staff')    return u.role === 'staff';
      if (activeFilter === 'active')   return  u.is_active;
      if (activeFilter === 'inactive') return !u.is_active;
      return true;
    });
  }, [users, search, activeFilter]);

  const FILTERS = [
    { key: 'all',      label: `All (${stats.total})`                   },
    { key: 'admin',    label: `Admin (${stats.admins})`                 },
    { key: 'staff',    label: `Staff (${stats.staff})`                  },
    { key: 'active',   label: `Active (${stats.active})`                },
    { key: 'inactive', label: `Inactive (${stats.total - stats.active})` },
  ];

  /* ════════════════════════════════════════════════════════════════ */
  return (
    <div className="page">

      {/* ── Page header ── */}
      <div className="users-page-header">
        <div>
          <h1 className="users-page-title">
            <FiUsers size={22} /> Staff Accounts
          </h1>
          <p className="users-page-subtitle">
            Manage system users and access permissions
          </p>
        </div>
        <motion.button
          className="btn btn--primary"
          onClick={openAdd}
          whileHover={{ scale: 1.03, transition: { type: 'spring', stiffness: 340, damping: 26 } }}
          whileTap={{ scale: 0.97 }}
        >
          <FiUserPlus size={16} /> Add User
        </motion.button>
      </div>

      {/* ── Stats bar ── */}
      <motion.div
        className="users-stats-bar"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0, 0, 0.2, 1] }}
      >
        {[
          { label: 'Total Users',    val: stats.total,               color: 'var(--primary)' },
          { label: 'Administrators', val: stats.admins,              color: 'var(--teal)'    },
          { label: 'Staff Members',  val: stats.staff,               color: 'var(--green)'   },
          { label: 'Active',         val: stats.active,              color: '#22C55E'        },
        ].map(s => (
          <div key={s.label} className="users-stat-tile">
            <span className="users-stat-num" style={{ color: s.color }}>{s.val}</span>
            <span className="users-stat-lbl">{s.label}</span>
          </div>
        ))}
      </motion.div>

      {/* ── Search + filter chips ── */}
      <div className="users-search-row">
        <div className="users-search-wrap">
          <FiSearch size={15} className="search-icon" />
          <input
            className="users-search-input"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="users-filter-chips">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`users-filter-chip${activeFilter === f.key ? ' users-filter-chip--active' : ''}`}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── User card grid ── */}
      {loading ? (
        <div className="card"><Skeleton rows={4} cols={5} /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <p className="empty-msg" style={{ padding: '2.5rem', textAlign: 'center' }}>
            {search || activeFilter !== 'all'
              ? 'No users match your filters'
              : 'No users found'}
          </p>
        </div>
      ) : (
        <motion.div
          className="users-grid-premium"
          variants={cardContainer}
          initial="hidden"
          animate="visible"
        >
          {filtered.map(u => {
            const initials = u.name
              ? u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              : '??';
            const isMe = u.id === me?.id;

            return (
              <motion.div
                key={u.id}
                className={`user-card-premium user-card-premium--${u.role}`}
                variants={cardItem}
                whileHover={{
                  y: -5,
                  boxShadow: '0 16px 48px rgba(15,23,42,.14)',
                  transition: { type: 'spring', stiffness: 320, damping: 26 },
                }}
              >
                <div className={`user-avatar-premium user-avatar-premium--${u.role}`}>
                  {u.role === 'admin' ? <FiShield size={18} /> : initials}
                </div>
                <div className="user-name-premium">
                  {u.name}
                  {isMe && <span className="you-tag">you</span>}
                </div>
                <div className="user-email-premium">{u.email}</div>
                <div className="user-badges-premium">
                  <span className={`badge badge--${u.role === 'admin' ? 'blue' : 'gray'}`}>
                    {u.role}
                  </span>
                  <span className={`badge badge--${u.is_active ? 'green' : 'red'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="user-joined-premium">
                  Joined {u.created_at?.slice(0, 10) || '—'}
                </div>
                <div className="user-actions-premium">
                  <motion.button
                    className="icon-btn icon-btn--edit"
                    onClick={() => openEdit(u)}
                    title="Edit user"
                    whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }}
                  >
                    <FiEdit2 size={15} />
                  </motion.button>
                  {!isMe && (
                    <motion.button
                      className="icon-btn icon-btn--del"
                      onClick={() => setDelId(u.id)}
                      title="Delete user"
                      whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }}
                    >
                      <FiTrash2 size={15} />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Add / Edit modal ── */}
      <AnimatePresence>
        {modal && (
          <motion.div className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal"
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{    opacity: 0, scale: 0.92, y: 16  }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <div className="modal-header">
                <h2>{modal === 'add' ? 'Add User' : 'Edit User'}</h2>
                <button className="modal-close" onClick={() => setModal(null)} aria-label="Close">
                  <FiX size={18} />
                </button>
              </div>
              <form onSubmit={handleSave} className="modal-form">
                <div className="modal-body">
                  {error && <div className="alert alert--error" style={{ marginBottom: '.75rem' }}>{error}</div>}
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
                    <label>
                      {modal === 'add' ? 'Password *' : 'New Password (leave blank to keep)'}
                    </label>
                    <div className="pw-wrap">
                      <input
                        type={showPw ? 'text' : 'password'}
                        required={modal === 'add'}
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      />
                      <button type="button" className="pw-toggle"
                        onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                        {showPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-row" style={{ marginBottom: 0 }}>
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
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn--ghost"
                    onClick={() => setModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn--primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirm modal ── */}
      <AnimatePresence>
        {delId && (
          <motion.div className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal modal--sm"
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1,   y: 0  }}
              exit={{    opacity: 0, scale: 0.9           }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            >
              <div className="modal-header">
                <h2>Delete User?</h2>
              </div>
              <div className="modal-body">
                <p style={{ color: 'var(--gray-600)' }}>
                  This will permanently remove the account.
                </p>
              </div>
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
