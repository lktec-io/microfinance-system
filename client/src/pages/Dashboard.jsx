import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiDollarSign, FiCreditCard,
  FiAlertTriangle, FiTrendingUp, FiHome,
  FiRefreshCw, FiCalendar,
} from 'react-icons/fi';
import api        from '../api';
import { fmt }    from '../utils/format';
import { useAuth } from '../context/AuthContext';
import StatCard    from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { SkeletonStats } from '../components/common/Skeleton';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function Dashboard() {
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const [summary, setSummary]     = useState(null);
  const [recent,  setRecent]      = useState({ repayments: [], customers: [], loans: [] });
  const [overdue, setOverdue]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [s, r, o] = await Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/recent'),
      api.get('/reports/overdue'),
    ]);
    setSummary(s.data);
    setRecent(r.data);
    setOverdue(o.data.slice(0, 5));
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    try { await loadData(); } finally { setRefreshing(false); }
  }

  const firstName = user?.name?.split(' ')[0] || 'Admin';

  if (loading) return (
    <div className="page">
      <div className="welcome-banner" style={{ marginBottom: '1.75rem', minHeight: '100px' }}>
        <div className="welcome-shimmer" />
      </div>
      <SkeletonStats count={4} />
    </div>
  );

  return (
    <div className="page">

      {/* ── Welcome Banner ── */}
      <div className="welcome-banner">
        <span className="welcome-shimmer" />
        <div className="welcome-text">
          <p className="welcome-greeting">Welcome Back</p>
          <h2>{greeting()}, <span>{firstName}</span></h2>
          <p className="welcome-date">
            <FiCalendar size={13} /> {todayLabel()}
          </p>
        </div>
        <div className="welcome-actions">
          <button
            className={`welcome-refresh${refreshing ? ' refreshing' : ''}`}
            onClick={handleRefresh}
            title="Refresh dashboard"
            disabled={refreshing}
          >
            <FiRefreshCw size={17} />
          </button>
          <div className="welcome-icon">
            <FiHome size={56} />
          </div>
        </div>
      </div>

      {/* ── Overdue Alert Banner ── */}
      {summary.overdue_loans > 0 && (
        <div className="alert-banner alert-banner--warning"
          onClick={() => navigate('/loans?filter=overdue')}>
          <FiAlertTriangle size={18} />
          <span>
            <strong>{summary.overdue_loans} loan{summary.overdue_loans > 1 ? 's' : ''} overdue</strong>
            {' '}— click to review
          </span>
          <span className="alert-banner-arrow">→</span>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="stat-grid">
        <StatCard
          label="Total Customers" color="blue"
          value={summary.customers}
          sub="Registered clients"
          Icon={FiUsers}
          to="/customers"
        />
        <StatCard
          label="Active Loans" color="green"
          value={summary.active_loans}
          sub={`TZS ${fmt(summary.loans_amount)} issued`}
          Icon={FiDollarSign}
          to="/loans"
        />
        <StatCard
          label="Total Collected" color="teal"
          value={`TZS ${fmt(summary.collected)}`}
          sub={`${summary.repayments} payments`}
          Icon={FiCreditCard}
          to="/repayments"
        />
        <StatCard
          label="Outstanding" color="red"
          value={`TZS ${fmt(summary.outstanding)}`}
          sub={`${summary.overdue_loans} overdue`}
          Icon={FiTrendingUp}
        />
      </div>

      {/* ── Loan Status Pills ── */}
      <div className="loan-status-row">
        {[
          { label: 'Active',  val: summary.loan_status.active,  cls: 'active'  },
          { label: 'Pending', val: summary.loan_status.pending, cls: 'pending' },
          { label: 'Paid',    val: summary.loan_status.paid,    cls: 'paid'    },
          { label: 'Overdue', val: summary.loan_status.overdue, cls: 'overdue' },
        ].map(({ label, val, cls }) => (
          <div key={cls} className={`status-chip status-chip--${cls}`}>
            <span className="status-chip-val">{val || 0}</span>
            <span className="status-chip-lbl">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="dashboard-grid">

        {/* Recent Repayments */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ marginBottom: 0 }}>
              <FiCreditCard size={16} /> Recent Payments
            </h2>
            <button className="link-btn" onClick={() => navigate('/repayments')}>View all →</button>
          </div>
          {recent.repayments.length === 0
            ? <p className="empty-msg">No payments recorded yet</p>
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Customer</th><th>Amount</th><th>Date</th><th>Receipt</th></tr>
                  </thead>
                  <tbody>
                    {recent.repayments.map(r => (
                      <tr key={r.id} className="tr-link"
                        onClick={() => navigate(`/loans/${r.loan_id}`)}>
                        <td><strong>{r.customer_name}</strong></td>
                        <td className="text-green"><strong>TZS {fmt(r.amount)}</strong></td>
                        <td>{r.payment_date?.slice(0, 10)}</td>
                        <td><code>{r.receipt_number}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </section>

        {/* Overdue Loans */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ marginBottom: 0 }}>
              <FiAlertTriangle size={16} style={{ color: 'var(--red)' }} /> Overdue Loans
            </h2>
            {overdue.length > 0 && <span className="badge badge--red">{overdue.length}</span>}
          </div>
          {overdue.length === 0
            ? <p className="empty-msg" style={{ color: 'var(--primary)' }}>✓ No overdue loans</p>
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Customer</th><th>Due Date</th><th>Balance</th></tr>
                  </thead>
                  <tbody>
                    {overdue.map(l => (
                      <tr key={l.id} className="tr-link"
                        onClick={() => navigate(`/loans/${l.id}`)}>
                        <td>
                          <strong>{l.customer_name}</strong><br />
                          <small>{l.customer_phone}</small>
                        </td>
                        <td><span className="badge badge--red">{l.due_date?.slice(0, 10)}</span></td>
                        <td><strong className="text-red">TZS {fmt(l.balance)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </section>

        {/* Recent Customers */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ marginBottom: 0 }}>
              <FiUsers size={16} /> Recent Customers
            </h2>
            <button className="link-btn" onClick={() => navigate('/customers')}>View all →</button>
          </div>
          {recent.customers.length === 0
            ? <p className="empty-msg">No customers yet</p>
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Name</th><th>Phone</th><th>Loans</th><th>Joined</th></tr>
                  </thead>
                  <tbody>
                    {recent.customers.map(c => (
                      <tr key={c.id} className="tr-link"
                        onClick={() => navigate('/customers')}>
                        <td><strong>{c.full_name}</strong></td>
                        <td>{c.phone}</td>
                        <td><span className="badge badge--blue">{c.loan_count}</span></td>
                        <td>{c.registration_date?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </section>

        {/* Recent Loans */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ marginBottom: 0 }}>
              <FiDollarSign size={16} /> Recent Loans
            </h2>
            <button className="link-btn" onClick={() => navigate('/loans')}>View all →</button>
          </div>
          {recent.loans.length === 0
            ? <p className="empty-msg">No loans yet</p>
            : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Customer</th><th>Amount</th><th>Balance</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {recent.loans.map(l => (
                      <tr key={l.id} className="tr-link"
                        onClick={() => navigate(`/loans/${l.id}`)}>
                        <td><strong>{l.customer_name}</strong></td>
                        <td>TZS {fmt(l.loan_amount)}</td>
                        <td>TZS {fmt(l.balance)}</td>
                        <td><StatusBadge status={l.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </section>

      </div>
    </div>
  );
}
