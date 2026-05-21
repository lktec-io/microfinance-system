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

/* ── SVG Donut Chart ─────────────────────────────────────────────── */
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const R = 64, circ = 2 * Math.PI * R;
  let accum = 0;
  return (
    <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: '200px', display: 'block', margin: '0 auto' }}>
      {/* Track */}
      <circle cx="100" cy="100" r={R} fill="none" stroke="var(--gray-100)" strokeWidth="22" />
      {/* Segments */}
      {total > 0 && data.map(d => {
        if (!d.value) return null;
        const dash   = (d.value / total) * circ - 2;
        const offset = circ * 0.25 - (accum / total) * circ;
        accum += d.value;
        return (
          <circle key={d.label} cx="100" cy="100" r={R}
            fill="none" stroke={d.color} strokeWidth="22"
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={offset}
            strokeLinecap="butt" />
        );
      })}
      {/* Center */}
      <text x="100" y="95" textAnchor="middle" fill="var(--gray-800)"
        style={{ fontSize: '1.55rem', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
        {total}
      </text>
      <text x="100" y="114" textAnchor="middle" fill="var(--gray-400)"
        style={{ fontSize: '.62rem', fontFamily: 'Poppins, sans-serif', textTransform: 'uppercase', letterSpacing: '.07em' }}>
        Total Loans
      </text>
    </svg>
  );
}

export default function Dashboard() {
  const navigate         = useNavigate();
  const { user }         = useAuth();
  const [summary, setSummary]     = useState(null);
  const [recent,  setRecent]      = useState({ repayments: [] });
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [s, r] = await Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/recent'),
    ]);
    setSummary(s.data);
    setRecent(r.data);
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
      <div className="welcome-banner" style={{ marginBottom: '2rem', minHeight: '120px' }}>
        <div className="welcome-shimmer" />
      </div>
      <SkeletonStats count={4} />
    </div>
  );

  const chartData = [
    { label: 'Active',  value: summary.loan_status.active  || 0, color: '#059669' },
    { label: 'Pending', value: summary.loan_status.pending || 0, color: '#d97706' },
    { label: 'Paid',    value: summary.loan_status.paid    || 0, color: '#3b82f6' },
    { label: 'Overdue', value: summary.loan_status.overdue || 0, color: '#ef4444' },
  ];

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
          <div className="welcome-btns">
            <button
              className={`welcome-refresh${refreshing ? ' refreshing' : ''}`}
              onClick={handleRefresh}
              title="Refresh dashboard"
              disabled={refreshing}
            >
              <FiRefreshCw size={17} />
            </button>
            <button className="welcome-view-btn" onClick={() => navigate('/loans')}>
              <FiDollarSign size={14} /> Loans
            </button>
          </div>
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

      {/* ── Overview Grid ── */}
      <div className="overview-grid">

        {/* Loan Distribution */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ marginBottom: 0 }}>
              <FiTrendingUp size={16} /> Loan Distribution
            </h2>
          </div>
          <div className="donut-wrap">
            <DonutChart data={chartData} />
            <div className="donut-legend">
              {chartData.map(d => (
                <div key={d.label} className="donut-legend-item">
                  <span className="donut-dot" style={{ background: d.color }} />
                  <span className="donut-legend-label">{d.label}</span>
                  <span className="donut-legend-val">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Payments */}
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

      </div>
    </div>
  );
}
