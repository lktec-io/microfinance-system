import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiDollarSign, FiCreditCard,
  FiAlertTriangle, FiTrendingUp, FiHome,
  FiRefreshCw, FiCalendar, FiMessageSquare,
} from 'react-icons/fi';
import api           from '../api';
import { fmt }       from '../utils/format';
import { useAuth }   from '../context/AuthContext';
import StatCard      from '../components/common/StatCard';
import { SkeletonStats } from '../components/common/Skeleton';

/* ── Helpers ──────────────────────────────────────────────────────── */
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

/* ── Safe defaults (never null) ───────────────────────────────────── */
const SUMMARY_DEFAULT = {
  customers: 0, total_loans: 0, loans_amount: 0,
  repayments: 0, collected: 0, outstanding: 0,
  active_loans: 0, overdue_loans: 0,
  loan_status: { active: 0, pending: 0, paid: 0, overdue: 0 },
};
const RECENT_DEFAULT = { repayments: [], customers: [], loans: [] };

/* ── SVG Donut Chart ─────────────────────────────────────────────── */
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const R = 64, circ = 2 * Math.PI * R;
  let accum = 0;
  return (
    <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: '200px', display: 'block', margin: '0 auto' }}>
      <circle cx="100" cy="100" r={R} fill="none" stroke="var(--gray-100)" strokeWidth="22" />
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

/* ── SMS Stats Widget ─────────────────────────────────────────────── */
function SmsWidget({ stats, onManage }) {
  if (!stats) return null;
  return (
    <div className="sms-dashboard-widget">
      <div className="sms-widget-header">
        <span className="sms-widget-title">
          <FiMessageSquare size={15} /> SMS Notifications
        </span>
        <button className="link-btn" onClick={onManage}>Manage →</button>
      </div>
      <div className="sms-widget-grid">
        <div className="sms-widget-stat">
          <div className="sms-widget-stat-val sms-widget-stat-val--blue">
            {Number(stats.total || 0).toLocaleString()}
          </div>
          <div className="sms-widget-stat-lbl">Total Sent</div>
        </div>
        <div className="sms-widget-stat">
          <div className="sms-widget-stat-val sms-widget-stat-val--green">
            {Number(stats.delivered || 0).toLocaleString()}
          </div>
          <div className="sms-widget-stat-lbl">Delivered</div>
        </div>
        <div className="sms-widget-stat">
          <div className="sms-widget-stat-val">
            {Number(stats.today_sent || 0).toLocaleString()}
          </div>
          <div className="sms-widget-stat-lbl">Sent Today</div>
        </div>
        <div className="sms-widget-stat">
          <div className={`sms-widget-stat-val${(stats.failed || 0) > 0 ? ' sms-widget-stat-val--red' : ''}`}>
            {Number(stats.failed || 0).toLocaleString()}
          </div>
          <div className="sms-widget-stat-lbl">Failed</div>
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────────────── */
export default function Dashboard() {
  const navigate          = useNavigate();
  const { user, isAdmin } = useAuth();

  const [summary,     setSummary]     = useState(SUMMARY_DEFAULT);
  const [recent,      setRecent]      = useState(RECENT_DEFAULT);
  const [smsStats,    setSmsStats]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      // Use allSettled so a partial failure never kills the dashboard
      const settled = await Promise.allSettled([
        api.get('/reports/summary'),
        api.get('/reports/recent'),
        isAdmin ? api.get('/sms/stats') : Promise.resolve(null),
      ]);

      // reports/summary
      if (settled[0].status === 'fulfilled') {
        const raw = settled[0].value?.data;
        setSummary({
          ...SUMMARY_DEFAULT,
          ...raw,
          loan_status: {
            active:  Number(raw?.loan_status?.active  || 0),
            pending: Number(raw?.loan_status?.pending || 0),
            paid:    Number(raw?.loan_status?.paid    || 0),
            overdue: Number(raw?.loan_status?.overdue || 0),
          },
        });
      } else {
        console.error('reports/summary failed:', settled[0].reason?.message);
        setError('Dashboard data could not be loaded. Please refresh.');
      }

      // reports/recent
      if (settled[1].status === 'fulfilled') {
        const raw = settled[1].value?.data;
        setRecent({
          repayments: raw?.repayments || [],
          customers:  raw?.customers  || [],
          loans:      raw?.loans      || [],
        });
      }

      // sms/stats (optional — only for admins, silently ignored on failure)
      if (isAdmin && settled[2].status === 'fulfilled' && settled[2].value !== null) {
        setSmsStats(settled[2].value?.data || null);
      }
    } catch (err) {
      console.error('Dashboard load failed:', err);
      setError('Unable to reach the server. Please check your connection.');
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    try { await loadData(); } finally { setRefreshing(false); }
  }

  const firstName = user?.name?.split(' ')[0] || 'Admin';

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="page">
        <div className="welcome-banner" style={{ marginBottom: '2rem', minHeight: '120px' }}>
          <div className="welcome-shimmer" />
        </div>
        <SkeletonStats count={4} />
      </div>
    );
  }

  /* ── Safe chart data with null guards ── */
  const ls = summary?.loan_status ?? {};
  const chartData = [
    { label: 'Active',  value: Number(ls.active  || 0), color: '#3b82f6' },
    { label: 'Paid',    value: Number(ls.paid    || 0), color: '#10b981' },
    { label: 'Pending', value: Number(ls.pending || 0), color: '#f59e0b' },
    { label: 'Overdue', value: Number(ls.overdue || 0), color: '#ef4444' },
  ];

  return (
    <div className="page">

      {/* ── Error Banner ── */}
      {error && (
        <div className="alert alert--error" style={{ marginBottom: '1.25rem' }}>
          <FiAlertTriangle size={16} />
          {error}
          <button
            className="btn btn--ghost btn--sm"
            style={{ marginLeft: 'auto' }}
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      )}

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
      {(summary?.overdue_loans || 0) > 0 && (
        <div className="alert-banner alert-banner--warning"
          onClick={() => navigate('/loans?filter=overdue')}>
          <FiAlertTriangle size={18} />
          <span>
            <strong>{summary.overdue_loans} loan{summary.overdue_loans !== 1 ? 's' : ''} overdue</strong>
            {' '}— click to review
          </span>
          <span className="alert-banner-arrow">→</span>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="stat-grid">
        <StatCard
          label="Total Customers" color="blue"
          value={summary?.customers ?? 0}
          sub="Registered clients"
          Icon={FiUsers}
          to="/customers"
        />
        <StatCard
          label="Active Loans" color="green"
          value={summary?.active_loans ?? 0}
          sub={`TZS ${fmt(summary?.loans_amount ?? 0)} issued`}
          Icon={FiDollarSign}
          to="/loans"
        />
        <StatCard
          label="Total Collected" color="teal"
          value={`TZS ${fmt(summary?.collected ?? 0)}`}
          sub={`${summary?.repayments ?? 0} payments`}
          Icon={FiCreditCard}
          to="/repayments"
        />
        <StatCard
          label="Outstanding" color="red"
          value={`TZS ${fmt(summary?.outstanding ?? 0)}`}
          sub={`${summary?.overdue_loans ?? 0} overdue`}
          Icon={FiTrendingUp}
        />
      </div>

      {/* ── Loan Status Pills ── */}
      <div className="loan-status-row">
        {[
          { label: 'Active',  val: ls.active,  cls: 'active'  },
          { label: 'Pending', val: ls.pending, cls: 'pending' },
          { label: 'Paid',    val: ls.paid,    cls: 'paid'    },
          { label: 'Overdue', val: ls.overdue, cls: 'overdue' },
        ].map(({ label, val, cls }) => (
          <div key={cls} className={`status-chip status-chip--${cls}`}>
            <span className="status-chip-val">{val || 0}</span>
            <span className="status-chip-lbl">{label}</span>
          </div>
        ))}
      </div>

      {/* ── SMS Statistics Widget (admin only) ── */}
      {isAdmin && (
        <SmsWidget stats={smsStats} onManage={() => navigate('/sms')} />
      )}

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
          {(recent?.repayments?.length ?? 0) === 0
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
                        <td><strong>{r.customer_name || '—'}</strong></td>
                        <td className="text-green"><strong>TZS {fmt(r.amount || 0)}</strong></td>
                        <td>{r.payment_date?.slice(0, 10) || '—'}</td>
                        <td><code>{r.receipt_number || '—'}</code></td>
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
