import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdSearch, MdFilterList, MdReceipt } from 'react-icons/md';
import api     from '../api';
import { fmt } from '../utils/format';

export default function Repayments() {
  const navigate = useNavigate();
  const [repayments, setRepayments] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [showFilters,setShowFilters]= useState(false);

  useEffect(() => {
    api.get('/repayments').then(({ data }) => {
      setRepayments(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return repayments.filter(r => {
      const matchSearch = !search ||
        r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.receipt_number?.toLowerCase().includes(search.toLowerCase());

      const rDate = r.payment_date?.slice(0, 10);
      const matchFrom = !dateFrom || rDate >= dateFrom;
      const matchTo   = !dateTo   || rDate <= dateTo;

      return matchSearch && matchFrom && matchTo;
    });
  }, [repayments, search, dateFrom, dateTo]);

  const totalFiltered = filtered.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const hasFilters    = search || dateFrom || dateTo;

  function clearFilters() {
    setSearch('');
    setDateFrom('');
    setDateTo('');
  }

  return (
    <div className="page">
      <div className="page-toolbar">
        <div className="search-wrap">
          <MdSearch size={18} className="search-icon" />
          <input
            className="search-input search-input--icon"
            placeholder="Search by customer or receipt…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button
            className={`btn btn--ghost${showFilters ? ' btn--active' : ''}`}
            onClick={() => setShowFilters(f => !f)}
          >
            <MdFilterList size={18} /> Filters
          </button>
          <button className="btn btn--primary" onClick={() => navigate('/loans')}>
            <MdReceipt size={16} /> Record Payment
          </button>
        </div>
      </div>

      {/* ── Date Filters ── */}
      {showFilters && (
        <div className="filter-panel">
          <div className="form-row" style={{ maxWidth: 480, gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>From Date</label>
              <input type="date" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>To Date</label>
              <input type="date" value={dateTo}
                onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          {hasFilters && (
            <button className="btn btn--ghost" style={{ marginTop: '.5rem' }} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Summary Bar ── */}
      {hasFilters && (
        <div className="results-summary">
          <span>Showing <strong>{filtered.length}</strong> of {repayments.length} payments</span>
          <span className="results-total">Total: <strong>MWK {fmt(totalFiltered)}</strong></span>
        </div>
      )}

      {!hasFilters && !loading && (
        <div className="results-summary">
          <span><strong>{repayments.length}</strong> payments total</span>
          <span className="results-total">
            Grand Total: <strong>MWK {fmt(repayments.reduce((s, r) => s + parseFloat(r.amount || 0), 0))}</strong>
          </span>
        </div>
      )}

      {loading
        ? (
          <div className="page-loader">
            <div className="spinner" />
            <span>Loading payments…</span>
          </div>
        )
        : (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Receipt No.</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
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
                          <MdReceipt size={36} style={{ color: 'var(--gray-200)' }} />
                          <p>{hasFilters ? 'No payments match your filters' : 'No payments recorded yet'}</p>
                        </div>
                      </td>
                    </tr>
                  )
                  : filtered.map((r, i) => (
                    <tr key={r.id} className="tr-link" onClick={() => navigate(`/loans/${r.loan_id}`)}>
                      <td style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>{i + 1}</td>
                      <td><code>{r.receipt_number}</code></td>
                      <td>
                        <strong>{r.customer_name}</strong>
                      </td>
                      <td>{r.payment_date?.slice(0, 10)}</td>
                      <td>
                        <span className="amount-cell">MWK {fmt(r.amount)}</span>
                      </td>
                      <td>{r.recorded_by || <span style={{ color: 'var(--gray-400)' }}>—</span>}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn-sm btn-sm--edit"
                          onClick={() => navigate(`/loans/${r.loan_id}`)}>
                          View Loan
                        </button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}
