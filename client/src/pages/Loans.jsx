import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api        from '../api';
import { fmt }    from '../utils/format';
import StatusBadge from '../components/common/StatusBadge';
import Skeleton    from '../components/common/Skeleton';

const EMPTY_FORM = {
  customer_id:    '',
  loan_amount:    '',
  interest_rate:  '',
  duration_value: '',
  duration_unit:  'months',
  start_date:     '',
  purpose:        '',
};

export default function Loans() {
  const navigate = useNavigate();
  const [loans,     setLoans]     = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [preview,   setPreview]   = useState(null);
  const [filter,    setFilter]    = useState('all');

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    const [l, c] = await Promise.all([api.get('/loans'), api.get('/customers')]);
    setLoans(l.data);
    setCustomers(c.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  function calcPreview(f) {
    const amount = parseFloat(f.loan_amount);
    const rate   = parseFloat(f.interest_rate);
    if (!amount || isNaN(rate)) return null;
    return { interest: (amount * rate / 100).toFixed(2), total: (amount + amount * rate / 100).toFixed(2) };
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm(f => { const u = { ...f, [name]: value }; setPreview(calcPreview(u)); return u; });
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, start_date: new Date().toISOString().slice(0, 10) });
    setPreview(null); setError(''); setModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/loans', form);
      setModal(false);
      fetchLoans();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create loan');
    } finally { setSaving(false); }
  }

  const filtered = filter === 'all' ? loans : loans.filter(l => l.status === filter);

  return (
    <div className="page">
      <div className="page-toolbar">
        <div className="filter-tabs">
          {['all','active','pending','paid','overdue'].map(s => (
            <button key={s}
              className={`filter-tab${filter === s ? ' filter-tab--active' : ''}`}
              onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>
        <button className="btn btn--primary" onClick={openAdd}>+ New Loan</button>
      </div>

      {loading ? (
        <div className="card"><Skeleton rows={6} cols={7} /></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>Customer</th><th>Amount</th>
                  <th>Interest</th><th>Total</th><th>Paid</th>
                  <th>Balance</th><th>Due Date</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={10} className="text-center">No loans found</td></tr>
                  : filtered.map((l, i) => (
                    <tr key={l.id}>
                      <td>{i + 1}</td>
                      <td>
                        <strong>{l.customer_name}</strong>
                        <br /><small>{l.customer_phone}</small>
                      </td>
                      <td>TZS {fmt(l.loan_amount)}</td>
                      <td>{l.interest_rate}%</td>
                      <td>TZS {fmt(l.total_payable)}</td>
                      <td>TZS {fmt(l.amount_paid)}</td>
                      <td><strong>TZS {fmt(l.balance)}</strong></td>
                      <td>{l.due_date?.slice(0, 10) || '—'}</td>
                      <td><StatusBadge status={l.status} /></td>
                      <td>
                        <button className="btn-sm btn-sm--edit"
                          onClick={() => navigate(`/loans/${l.id}`)}>View</button>
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
          <div className="modal modal--lg">
            <div className="modal-header">
              <h2>Create New Loan</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert--error">{error}</div>}
            <form onSubmit={handleSave} className="modal-form">
              <div className="form-group">
                <label>Customer *</label>
                <select required name="customer_id" value={form.customer_id}
                  onChange={handleFormChange}>
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
                    <span>Interest</span>
                    <strong>TZS {fmt(preview.interest)}</strong>
                  </div>
                  <div className="loan-preview-item loan-preview-total">
                    <span>Total Payable</span>
                    <strong>TZS {fmt(preview.total)}</strong>
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
              <div className="form-group">
                <label>Purpose</label>
                <textarea rows={2} name="purpose" value={form.purpose} onChange={handleFormChange} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn--ghost"
                  onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
