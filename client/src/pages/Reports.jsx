import { useEffect, useState } from 'react';
import api       from '../api';
import { fmt }   from '../utils/format';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState({ loans: [], repayments: [] });
  const [daily,   setDaily]   = useState({ loans: [], repayments: [] });
  const [overdue, setOverdue] = useState([]);
  const [tab,     setTab]     = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/monthly'),
      api.get('/reports/daily'),
      api.get('/reports/overdue'),
    ]).then(([s, m, d, o]) => {
      setSummary(s.data);
      setMonthly(m.data);
      setDaily(d.data);
      setOverdue(o.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader">Loading reports…</div>;

  return (
    <div className="page">
      {/* Summary Cards */}
      <div className="stat-grid">
        <div className="stat-card stat-card--blue">
          <div className="stat-value">{summary.customers}</div>
          <div className="stat-label">Total Customers</div>
        </div>
        <div className="stat-card stat-card--green">
          <div className="stat-value">{summary.total_loans}</div>
          <div className="stat-label">Total Loans</div>
          <div className="stat-sub">MWK {fmt(summary.loans_amount)}</div>
        </div>
        <div className="stat-card stat-card--teal">
          <div className="stat-value">MWK {fmt(summary.collected)}</div>
          <div className="stat-label">Total Collected</div>
          <div className="stat-sub">{summary.repayments} payments</div>
        </div>
        <div className="stat-card stat-card--red">
          <div className="stat-value">MWK {fmt(summary.outstanding)}</div>
          <div className="stat-label">Outstanding</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['monthly','daily','overdue'].map(t => (
          <button key={t} className={`tab${tab===t?' tab--active':''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'monthly' && (
        <div className="dashboard-grid">
          <div className="card">
            <h3 className="card-title">Loans Issued — Monthly</h3>
            <table className="table">
              <thead><tr><th>Month</th><th>Count</th><th>Amount</th></tr></thead>
              <tbody>
                {monthly.loans.length === 0
                  ? <tr><td colSpan={3} className="text-center">No data</td></tr>
                  : monthly.loans.map(r => (
                    <tr key={r.month}>
                      <td>{r.month}</td>
                      <td>{r.loans_issued}</td>
                      <td>MWK {fmt(r.total_issued)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          <div className="card">
            <h3 className="card-title">Repayments — Monthly</h3>
            <table className="table">
              <thead><tr><th>Month</th><th>Count</th><th>Collected</th></tr></thead>
              <tbody>
                {monthly.repayments.length === 0
                  ? <tr><td colSpan={3} className="text-center">No data</td></tr>
                  : monthly.repayments.map(r => (
                    <tr key={r.month}>
                      <td>{r.month}</td>
                      <td>{r.payments}</td>
                      <td>MWK {fmt(r.total_collected)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'daily' && (
        <div className="dashboard-grid">
          <div className="card">
            <h3 className="card-title">Loans Issued — Last 30 Days</h3>
            <table className="table">
              <thead><tr><th>Date</th><th>Count</th><th>Amount</th></tr></thead>
              <tbody>
                {daily.loans.length === 0
                  ? <tr><td colSpan={3} className="text-center">No data</td></tr>
                  : daily.loans.map(r => (
                    <tr key={r.date}>
                      <td>{r.date?.slice(0,10)}</td>
                      <td>{r.loans_issued}</td>
                      <td>MWK {fmt(r.total_issued)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          <div className="card">
            <h3 className="card-title">Repayments — Last 30 Days</h3>
            <table className="table">
              <thead><tr><th>Date</th><th>Count</th><th>Collected</th></tr></thead>
              <tbody>
                {daily.repayments.length === 0
                  ? <tr><td colSpan={3} className="text-center">No data</td></tr>
                  : daily.repayments.map(r => (
                    <tr key={r.date}>
                      <td>{r.date?.slice(0,10)}</td>
                      <td>{r.payments}</td>
                      <td>MWK {fmt(r.total_collected)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'overdue' && (
        <div className="card">
          <h3 className="card-title">Overdue Loans</h3>
          <table className="table">
            <thead>
              <tr><th>#</th><th>Customer</th><th>Phone</th><th>Amount</th><th>Balance</th><th>Due Date</th></tr>
            </thead>
            <tbody>
              {overdue.length === 0
                ? <tr><td colSpan={6} className="text-center">No overdue loans</td></tr>
                : overdue.map((l, i) => (
                  <tr key={l.id}>
                    <td>{i+1}</td>
                    <td>{l.customer_name}</td>
                    <td>{l.customer_phone}</td>
                    <td>MWK {fmt(l.loan_amount)}</td>
                    <td><strong>MWK {fmt(l.balance)}</strong></td>
                    <td><span className="badge badge--red">{l.due_date?.slice(0,10)}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
