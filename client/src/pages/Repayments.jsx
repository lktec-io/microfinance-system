import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiFilter, FiFileText, FiExternalLink,
  FiGrid, FiList, FiCalendar, FiUser,
} from 'react-icons/fi';
import api      from '../api';
import { fmt }  from '../utils/format';
import Skeleton from '../components/common/Skeleton';

export default function Repayments() {
  const navigate = useNavigate();
  const [repayments,  setRepayments]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode,    setViewMode]    = useState('list');

  useEffect(() => {
    api.get('/repayments').then(({ data }) => {
      setRepayments(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => repayments.filter(r => {
    const matchSearch = !search ||
      r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.receipt_number?.toLowerCase().includes(search.toLowerCase());
    const rDate     = r.payment_date?.slice(0, 10);
    const matchFrom = !dateFrom || rDate >= dateFrom;
    const matchTo   = !dateTo   || rDate <= dateTo;
    return matchSearch && matchFrom && matchTo;
  }), [repayments, search, dateFrom, dateTo]);

  const totalFiltered = filtered.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const hasFilters    = search || dateFrom || dateTo;

  function clearFilters() { setSearch(''); setDateFrom(''); setDateTo(''); }

  return (
    <div className="page">
      <div className="page-toolbar">
        <div className="search-wrap">
          <FiSearch size={18} className="search-icon" />
          <input
            className="search-input search-input--icon"
            placeholder="Search by customer or receipt…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
          <button
            className={`btn btn--ghost${showFilters ? ' btn--active' : ''}`}
            onClick={() => setShowFilters(f => !f)}>
            <FiFilter size={18} /> Filters
          </button>
          <button className="btn btn--primary" onClick={() => navigate('/loans')}>
            <FiFileText size={16} /> Record Payment
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="form-row" style={{ maxWidth: 480, gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>From Date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>To Date</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          {hasFilters && (
            <button className="btn btn--ghost btn--sm" style={{ marginTop: '.75rem' }}
              onClick={clearFilters}>Clear filters</button>
          )}
        </div>
      )}

      {hasFilters && (
        <div className="results-summary">
          <span>Showing <strong>{filtered.length}</strong> of {repayments.length} payments</span>
          <span className="results-total">Total: <strong>TZS {fmt(totalFiltered)}</strong></span>
        </div>
      )}
      {!hasFilters && !loading && (
        <div className="results-summary">
          <span><strong>{repayments.length}</strong> payments total</span>
          <span className="results-total">
            Grand Total: <strong>TZS {fmt(repayments.reduce((s, r) => s + parseFloat(r.amount || 0), 0))}</strong>
          </span>
        </div>
      )}

      {loading ? (
        <div className="card"><Skeleton rows={6} cols={6} /></div>
      ) : viewMode === 'grid' ? (
        filtered.length === 0
          ? <div className="card"><p className="empty-msg text-center">No payments found</p></div>
          : (
            <div className="repayment-grid">
              {filtered.map(r => (
                <div
                  key={r.id}
                  className="repayment-card"
                  onClick={() => r.loan_id && navigate(`/loans/${r.loan_id}`)}
                  style={r.loan_id ? undefined : { cursor: 'default' }}
                >
                  <div className="repayment-card-top">
                    <div className="repayment-card-avatar">
                      <FiUser size={16} />
                    </div>
                    <div className="repayment-card-receipt">
                      <code>{r.receipt_number}</code>
                    </div>
                  </div>
                  <div className="repayment-card-name">{r.customer_name}</div>
                  <div className="repayment-card-amount">TZS {fmt(r.amount)}</div>
                  <div className="repayment-card-meta">
                    <span><FiCalendar size={12} /> {r.payment_date?.slice(0, 10)}</span>
                    {r.loan_id && (
                      <button
                        className="icon-btn icon-btn--view"
                        onClick={e => { e.stopPropagation(); navigate(`/loans/${r.loan_id}`); }}
                        title="View loan"
                      >
                        <FiExternalLink size={14} />
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
                  <th>#</th>
                  <th>Receipt No.</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount (TZS)</th>
                  <th>Recorded By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state">
                          <FiFileText size={36} style={{ color: 'var(--gray-300)' }} />
                          <p>{hasFilters ? 'No payments match your filters' : 'No payments recorded yet'}</p>
                        </div>
                      </td>
                    </tr>
                  )
                  : filtered.map((r, i) => (
                    <tr
                      key={r.id}
                      className={r.loan_id ? 'tr-link' : ''}
                      onClick={() => r.loan_id && navigate(`/loans/${r.loan_id}`)}
                    >
                      <td style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>{i + 1}</td>
                      <td><code>{r.receipt_number}</code></td>
                      <td><strong>{r.customer_name}</strong></td>
                      <td>{r.payment_date?.slice(0, 10)}</td>
                      <td><span className="amount-cell">TZS {fmt(r.amount)}</span></td>
                      <td>{r.recorded_by || <span style={{ color: 'var(--gray-400)' }}>—</span>}</td>
                      <td onClick={e => e.stopPropagation()}>
                        {r.loan_id && (
                          <button className="icon-btn icon-btn--view"
                            onClick={() => navigate(`/loans/${r.loan_id}`)}
                            title="View loan">
                            <FiExternalLink size={15} />
                          </button>
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
    </div>
  );
}
