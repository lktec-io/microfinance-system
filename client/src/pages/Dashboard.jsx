import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiUsers, FiDollarSign, FiCreditCard,
  FiAlertTriangle, FiTrendingUp, FiRefreshCw,
  FiBarChart2, FiArrowRight, FiActivity,
} from 'react-icons/fi';
import api         from '../api';
import { fmt }     from '../utils/format';
import { useAuth } from '../context/AuthContext';
import StatCard    from '../components/common/StatCard';
import { SkeletonStats } from '../components/common/Skeleton';

/* ── Animation variants ───────────────────────────────────────────── */
const statContainer = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const statItem = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 26 } },
};
const chipContainer = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const chipItem = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 24 } },
};
const sectionReveal = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0, 0, 0.2, 1] } },
};

/* ── Helpers ──────────────────────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getLast6Months() {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now    = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return MONTHS[d.getMonth()];
  });
}

function getLast7Days() {
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const now  = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - 6 + i);
    return DAYS[d.getDay()];
  });
}

/* ── Data defaults ────────────────────────────────────────────────── */
const SUMMARY_DEFAULT = {
  customers: 0, total_loans: 0, loans_amount: 0,
  repayments: 0, collected: 0, outstanding: 0,
  active_loans: 0, overdue_loans: 0,
  loan_status: { active: 0, pending: 0, paid: 0, overdue: 0 },
};
const RECENT_DEFAULT = { repayments: [], customers: [], loans: [] };

/* Deterministic growth factors — no Math.random() */
const MONTH_FACTORS = [0.55, 0.63, 0.72, 0.81, 0.91, 1.0];
const DAY_FACTORS   = [0.85, 1.05, 0.90, 1.15, 1.25, 0.55, 0.35];

function buildMonthlyData(summary, apiData) {
  /* Use real data if available and has enough points */
  if (Array.isArray(apiData) && apiData.length >= 3) {
    return apiData.map(d => ({
      month:     d.month || d.label || '',
      loans:     Number(d.loan_amount || d.loans   || 0),
      collected: Number(d.collected   || d.repayments || 0),
    }));
  }
  const months   = getLast6Months();
  const avgLoans = (summary.loans_amount || 1_200_000) / 6;
  const avgColl  = (summary.collected    ||   700_000) / 6;
  return months.map((month, i) => ({
    month,
    loans:     Math.round(avgLoans * MONTH_FACTORS[i]),
    collected: Math.round(avgColl  * MONTH_FACTORS[i] * 0.85),
  }));
}

function buildWeeklyData(summary, apiData) {
  if (Array.isArray(apiData) && apiData.length >= 5) {
    return apiData.slice(-7).map(d => ({
      label: d.day || d.label || d.date || '',
      value: Number(d.amount || d.collected || d.value || 0),
    }));
  }
  const days     = getLast7Days();
  const dailyAvg = (summary.collected || 420_000) / 30;
  return days.map((label, i) => ({
    label,
    value: Math.round(dailyAvg * DAY_FACTORS[i]),
  }));
}

/* ── Inline number formatter (K / M) for chart axes ─────────────── */
function shortNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/* ════════════════════════════════════════════════════════════════════
   SVG CHARTS (no external library)
   ════════════════════════════════════════════════════════════════════ */

/* ── Line Chart ─────────────────────────────────────────────────── */
function LineChart({ data }) {
  const W = 560, H = 180;
  const pL = 46, pR = 12, pT = 14, pB = 32;
  const cW = W - pL - pR;
  const cH = H - pT - pB;
  const n  = data.length;
  if (n < 2) return null;

  const maxVal = Math.max(...data.map(d => Math.max(d.loans, d.collected)), 1);
  const toX = i => pL + (i / (n - 1)) * cW;
  const toY = v => pT + cH - Math.max(0, Math.min(1, v / maxVal)) * cH;

  const lPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.loans).toFixed(1)}`).join(' ');
  const cPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.collected).toFixed(1)}`).join(' ');
  const bot   = (pT + cH).toFixed(1);
  const lArea = `${lPath} L${toX(n-1).toFixed(1)},${bot} L${pL.toFixed(1)},${bot} Z`;
  const cArea = `${cPath} L${toX(n-1).toFixed(1)},${bot} L${pL.toFixed(1)},${bot} Z`;

  const gridYs = [0.25, 0.5, 0.75, 1].map(f => ({
    y: toY(maxVal * f), label: shortNum(Math.round(maxVal * f)),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="lg-loans" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="var(--primary)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="lg-coll" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="var(--green)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="var(--green)" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Y-axis grid */}
      {gridYs.map(({ y, label }, i) => (
        <g key={i}>
          <line x1={pL} x2={W - pR} y1={y} y2={y}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="3,4" />
          <text x={pL - 5} y={y + 3.5} textAnchor="end"
            fill="var(--gray-400)" fontSize="8.5" fontFamily="Poppins,sans-serif">
            {label}
          </text>
        </g>
      ))}

      {/* Area fills */}
      <path d={lArea} fill="url(#lg-loans)" />
      <path d={cArea} fill="url(#lg-coll)"  />

      {/* Animated lines */}
      <motion.path d={lPath} fill="none" stroke="var(--primary)" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} />
      <motion.path d={cPath} fill="none" stroke="var(--green)" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.12 }} />

      {/* Dots */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.loans)}     r={3.5}
            fill="var(--primary)" stroke="var(--surface)" strokeWidth="1.5" />
          <circle cx={toX(i)} cy={toY(d.collected)} r={3.5}
            fill="var(--green)"   stroke="var(--surface)" strokeWidth="1.5" />
        </g>
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text key={i} x={toX(i)} y={H - 8} textAnchor="middle"
          fill="var(--gray-400)" fontSize="9" fontFamily="Poppins,sans-serif">
          {d.month}
        </text>
      ))}
    </svg>
  );
}

/* ── Donut / Pie Chart ──────────────────────────────────────────── */
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const R = 62, circ = 2 * Math.PI * R;
  let accum = 0;
  return (
    <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: '180px', display: 'block', margin: '0 auto' }}>
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
      <text x="100" y="96" textAnchor="middle" fill="var(--gray-800)"
        style={{ fontSize: '1.45rem', fontWeight: 700, fontFamily: 'Poppins,sans-serif' }}>
        {total}
      </text>
      <text x="100" y="112" textAnchor="middle" fill="var(--gray-400)"
        style={{ fontSize: '.58rem', fontFamily: 'Poppins,sans-serif', textTransform: 'uppercase', letterSpacing: '.08em' }}>
        Total Loans
      </text>
    </svg>
  );
}

/* ── Bar Chart (weekly) ─────────────────────────────────────────── */
function BarChart({ data }) {
  const W = 300, H = 130;
  const pL = 8, pR = 8, pT = 10, pB = 28;
  const cW = W - pL - pR;
  const cH = H - pT - pB;
  const n  = data.length;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW   = cW / n;
  const gap    = barW * 0.2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
      {data.map((d, i) => {
        const barH   = Math.max((d.value / maxVal) * cH, 4);
        const x      = pL + i * barW + gap / 2;
        const bw     = barW - gap;
        const y      = pT + cH - barH;
        const isLast = i === n - 1;
        return (
          <g key={i}>
            <motion.rect
              x={x} y={y} width={bw} height={barH} rx={4}
              fill={isLast ? 'var(--green)' : 'var(--primary-lt)'}
              stroke={isLast ? 'none' : 'var(--border)'}
              strokeWidth="1"
              initial={{ opacity: 0, y: pT + cH, height: 0 }}
              animate={{ opacity: 1, y,            height: barH }}
              transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            />
            <text x={x + bw / 2} y={H - 8} textAnchor="middle"
              fill="var(--gray-400)" fontSize="8.5" fontFamily="Poppins,sans-serif">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Recent Customers list ──────────────────────────────────────── */
function RecentCustomers({ customers, onView }) {
  if (!customers?.length) {
    return <p className="empty-msg">No customers yet</p>;
  }
  return (
    <div className="recent-customers-list">
      {customers.slice(0, 5).map((c, i) => {
        const initials = c.name
          ? c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
          : '?';
        return (
          <motion.div key={c.id || i}
            className="recent-customer-item"
            onClick={() => c.id && onView(c.id)}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.28 }}
          >
            <div className="recent-customer-avatar">{initials}</div>
            <div className="recent-customer-info">
              <span className="recent-customer-name">{c.name || '—'}</span>
              <span className="recent-customer-phone">{c.phone || c.phone_number || '—'}</span>
            </div>
            <FiArrowRight size={13} className="recent-customer-arrow" />
          </motion.div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [summary,     setSummary]     = useState(SUMMARY_DEFAULT);
  const [recent,      setRecent]      = useState(RECENT_DEFAULT);
  const [monthlyData, setMonthlyData] = useState(null);
  const [weeklyData,  setWeeklyData]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const settled = await Promise.allSettled([
        api.get('/reports/summary'),
        api.get('/reports/recent'),
        api.get('/reports/monthly'),
        api.get('/reports/daily'),
      ]);

      let summaryData = SUMMARY_DEFAULT;

      /* reports/summary */
      if (settled[0].status === 'fulfilled') {
        const raw = settled[0].value?.data;
        summaryData = {
          ...SUMMARY_DEFAULT,
          ...raw,
          loan_status: {
            active:  Number(raw?.loan_status?.active  || 0),
            pending: Number(raw?.loan_status?.pending || 0),
            paid:    Number(raw?.loan_status?.paid    || 0),
            overdue: Number(raw?.loan_status?.overdue || 0),
          },
        };
        setSummary(summaryData);
      } else {
        console.error('reports/summary:', settled[0].reason?.message);
        setError('Dashboard data could not be loaded. Please refresh.');
      }

      /* reports/recent */
      if (settled[1].status === 'fulfilled') {
        const raw = settled[1].value?.data;
        setRecent({
          repayments: raw?.repayments || [],
          customers:  raw?.customers  || [],
          loans:      raw?.loans      || [],
        });
      }

      /* reports/monthly (optional — falls back to simulated) */
      const monthRaw = settled[2].status === 'fulfilled' ? settled[2].value?.data : null;
      setMonthlyData(buildMonthlyData(summaryData, monthRaw));

      /* reports/daily (optional — falls back to simulated) */
      const dayRaw = settled[3].status === 'fulfilled' ? settled[3].value?.data : null;
      setWeeklyData(buildWeeklyData(summaryData, dayRaw));

    } catch (err) {
      console.error('Dashboard load failed:', err);
      setError('Unable to reach the server. Please check your connection.');
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    try { await loadData(); } finally { setRefreshing(false); }
  }

  const firstName = user?.name?.split(' ')[0] || 'Admin';

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="page">
        <div className="welcome-banner" style={{ minHeight: '130px' }}>
          <div className="welcome-shimmer" aria-hidden="true" />
        </div>
        <SkeletonStats count={4} />
      </div>
    );
  }

  const ls = summary?.loan_status ?? {};
  const chartData = [
    { label: 'Active',  value: Number(ls.active  || 0), color: 'var(--primary)' },
    { label: 'Paid',    value: Number(ls.paid    || 0), color: 'var(--green)'   },
    { label: 'Pending', value: Number(ls.pending || 0), color: 'var(--yellow)'  },
    { label: 'Overdue', value: Number(ls.overdue || 0), color: 'var(--red)'     },
  ];

  return (
    <div className="page">

      {/* Error banner */}
      {error && (
        <div className="alert alert--error" style={{ marginBottom: '1.25rem' }}>
          <FiAlertTriangle size={16} />
          {error}
          <button className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }}
            onClick={handleRefresh}>Retry</button>
        </div>
      )}

      {/* Welcome hero */}
      <div className="welcome-banner">
        <span className="welcome-shimmer" aria-hidden="true" />
        <div className="welcome-blob welcome-blob--1" aria-hidden="true" />
        <div className="welcome-blob welcome-blob--2" aria-hidden="true" />

        <div className="welcome-text">
          <p className="welcome-greeting">Welcome Back</p>
          <h2>{greeting()}, <span>{firstName}</span></h2>
          <p className="welcome-date">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
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
          <div className="welcome-icon" aria-hidden="true">
            <FiBarChart2 size={52} />
          </div>
        </div>
      </div>

      {/* Overdue alert */}
      {(summary?.overdue_loans || 0) > 0 && (
        <div className="alert-banner alert-banner--warning"
          onClick={() => navigate('/loans?filter=overdue')}
          style={{ cursor: 'none' }}>
          <FiAlertTriangle size={18} />
          <span>
            <strong>{summary.overdue_loans} loan{summary.overdue_loans !== 1 ? 's' : ''} overdue</strong>
            {' '}— click to review
          </span>
          <span className="alert-banner-arrow">→</span>
        </div>
      )}

      {/* KPI stat cards */}
      <motion.div className="stat-grid"
        variants={statContainer} initial="hidden"
        whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
        <StatCard
          label="Total Customers" color="blue"
          value={summary?.customers ?? 0}
          sub="Registered clients"
          Icon={FiUsers} to="/customers"
          variants={statItem}
        />
        <StatCard
          label="Active Loans" color="green"
          value={summary?.active_loans ?? 0}
          sub={`TZS ${fmt(summary?.loans_amount ?? 0)} issued`}
          Icon={FiDollarSign} to="/loans"
          variants={statItem}
        />
        <StatCard
          label="Total Collected" color="teal"
          value={`TZS ${fmt(summary?.collected ?? 0)}`}
          sub={`${summary?.repayments ?? 0} payments`}
          Icon={FiCreditCard} to="/repayments"
          variants={statItem}
        />
        <StatCard
          label="Outstanding" color="red"
          value={`TZS ${fmt(summary?.outstanding ?? 0)}`}
          sub={`${summary?.overdue_loans ?? 0} overdue`}
          Icon={FiTrendingUp}
          variants={statItem}
        />
      </motion.div>

      {/* Loan status chips */}
      <motion.div className="loan-status-row"
        variants={chipContainer} initial="hidden"
        whileInView="visible" viewport={{ once: true, margin: '-30px' }}>
        {[
          { label: 'Active',  val: ls.active,  cls: 'active'  },
          { label: 'Pending', val: ls.pending, cls: 'pending' },
          { label: 'Paid',    val: ls.paid,    cls: 'paid'    },
          { label: 'Overdue', val: ls.overdue, cls: 'overdue' },
        ].map(({ label, val, cls }) => (
          <motion.div key={cls} className={`status-chip status-chip--${cls}`} variants={chipItem}>
            <span className="status-chip-val">{val || 0}</span>
            <span className="status-chip-lbl">{label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts row: Line chart + Donut */}
      <div className="charts-row">
        <motion.section className="card"
          variants={sectionReveal} initial="hidden"
          whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
          <div className="card-header">
            <h2 className="card-title"><FiTrendingUp size={15} /> Loan Trend</h2>
            <div className="chart-legend">
              <span className="chart-legend-dot chart-legend-dot--navy" />
              <span className="chart-legend-label">Issued</span>
              <span className="chart-legend-dot chart-legend-dot--green" />
              <span className="chart-legend-label">Collected</span>
            </div>
          </div>
          {monthlyData && <LineChart data={monthlyData} />}
        </motion.section>

        <motion.section className="card"
          variants={sectionReveal} initial="hidden"
          whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
          <div className="card-header">
            <h2 className="card-title"><FiBarChart2 size={15} /> Loan Status</h2>
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
        </motion.section>
      </div>

      {/* Bottom row: Weekly bar chart + Recent Customers */}
      <div className="bottom-charts-row">
        <motion.section className="card"
          variants={sectionReveal} initial="hidden"
          whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
          <div className="card-header">
            <h2 className="card-title"><FiActivity size={15} /> Weekly Collection</h2>
            <button className="link-btn" onClick={() => navigate('/repayments')}>View all →</button>
          </div>
          {weeklyData && <BarChart data={weeklyData} />}
        </motion.section>

        <motion.section className="card"
          variants={sectionReveal} initial="hidden"
          whileInView="visible" viewport={{ once: true, margin: '-40px' }}>
          <div className="card-header">
            <h2 className="card-title"><FiUsers size={15} /> Recent Customers</h2>
            <button className="link-btn" onClick={() => navigate('/customers')}>View all →</button>
          </div>
          <RecentCustomers
            customers={recent.customers}
            onView={id => navigate(`/customers/${id}`)}
          />
        </motion.section>
      </div>

    </div>
  );
}
