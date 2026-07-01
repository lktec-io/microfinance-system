import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion, useMotionValue, useTransform, animate, AnimatePresence,
} from 'framer-motion';
import {
  FiUsers, FiDollarSign, FiCreditCard,
  FiAlertTriangle, FiTrendingUp, FiRefreshCw,
  FiActivity, FiArrowRight, FiPercent, FiBarChart2,
} from 'react-icons/fi';
import api            from '../api';
import { fmt }        from '../utils/format';
import { useAuth }    from '../context/AuthContext';
import StatCard       from '../components/common/StatCard';
import { SkeletonStats } from '../components/common/Skeleton';

/* ── Animation variants ─────────────────────────────────────────────── */
const pageIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const fadeUp = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 26 } },
};
const sectionReveal = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0, 0, 0.2, 1] } },
};

/* ── Hero floating icons config ──────────────────────────────────────── */
const FLOAT_ICONS = [
  { Icon: FiDollarSign, top: '12%',  right: '12%', opacity: 0.09, delay: 0 },
  { Icon: FiTrendingUp, top: '52%',  right: '6%',  opacity: 0.07, delay: 1.2 },
  { Icon: FiCreditCard, top: '22%',  right: '28%', opacity: 0.06, delay: 0.6 },
  { Icon: FiPercent,    top: '68%',  right: '20%', opacity: 0.08, delay: 1.8 },
  { Icon: FiActivity,   top: '80%',  right: '38%', opacity: 0.05, delay: 0.9 },
];

/* ── Data defaults ───────────────────────────────────────────────────── */
const SUMMARY_DEFAULT = {
  customers: 0, total_loans: 0, loans_amount: 0,
  repayments: 0, collected: 0, outstanding: 0,
  active_loans: 0, overdue_loans: 0,
  loan_status: { active: 0, pending: 0, paid: 0, overdue: 0 },
};
const RECENT_DEFAULT = { repayments: [], customers: [], loans: [] };

/* ════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════════════ */

/* ── Live clock ────────────────────────────────────────────────────── */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="hero-clock">
      {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

/* ── Animated integer counter ──────────────────────────────────────── */
function AnimatedNumber({ value }) {
  const mv   = useMotionValue(0);
  const disp = useTransform(mv, v => Math.round(v).toLocaleString());
  useEffect(() => {
    const n    = typeof value === 'number' ? value : 0;
    const ctrl = animate(mv, n, { duration: 1.3, ease: [0.16, 1, 0.3, 1] });
    return ctrl.stop;
  }, [value, mv]);
  return <motion.span>{disp}</motion.span>;
}

/* ── Abbreviated currency counter (TZS 23.4M) ─────────────────────── */
function HeroCountShort({ value }) {
  const mv   = useMotionValue(0);
  const disp = useTransform(mv, v => {
    if (v >= 1_000_000) return `TZS ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `TZS ${(v / 1_000).toFixed(0)}K`;
    return `TZS ${Math.round(v).toLocaleString()}`;
  });
  useEffect(() => {
    const ctrl = animate(mv, typeof value === 'number' ? value : 0, {
      duration: 1.5, ease: [0.16, 1, 0.3, 1],
    });
    return ctrl.stop;
  }, [value, mv]);
  return <motion.span>{disp}</motion.span>;
}

/* ── Premium SVG Pie Chart ─────────────────────────────────────────── */
function PieChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const total = data.reduce((s, d) => s + (d.value || 0), 0);

  if (!total) {
    return <div className="pie-empty">No loan data available yet</div>;
  }

  const CX = 100, CY = 100, R = 76;
  let cumAngle = -Math.PI / 2;

  const segments = data
    .filter(d => d.value > 0)
    .map(d => {
      const frac       = d.value / total;
      const startAngle = cumAngle;
      const endAngle   = cumAngle + frac * 2 * Math.PI;
      cumAngle         = endAngle;
      const bisector   = (startAngle + endAngle) / 2;
      const x1         = CX + R * Math.cos(startAngle);
      const y1         = CY + R * Math.sin(startAngle);
      const x2         = CX + R * Math.cos(endAngle);
      const y2         = CY + R * Math.sin(endAngle);
      const largeArc   = frac > 0.5 ? 1 : 0;
      const path       = `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      const labelR     = R * 0.6;
      const lx         = CX + labelR * Math.cos(bisector);
      const ly         = CY + labelR * Math.sin(bisector);
      return { ...d, frac, bisector, path, lx, ly };
    });

  return (
    <>
      <div className="pie-chart-wrap">
        <svg viewBox="0 0 200 200"
          style={{ width: '100%', maxWidth: '200px', display: 'block', overflow: 'visible' }}>
          {segments.map((s, i) => {
            const isHov = hovered === i;
            const tx    = isHov ? Math.cos(s.bisector) * 9 : 0;
            const ty    = isHov ? Math.sin(s.bisector) * 9 : 0;
            return (
              <motion.g
                key={s.label}
                animate={{ x: tx, y: ty }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                onHoverStart={() => setHovered(i)}
                onHoverEnd={() => setHovered(null)}
                style={{
                  filter: isHov
                    ? `drop-shadow(0 0 10px ${s.color}99)`
                    : 'drop-shadow(0 2px 4px rgba(0,0,0,.12))',
                  transition: 'filter .25s',
                }}
              >
                <motion.path
                  d={s.path}
                  fill={s.color}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />
                {s.frac >= 0.07 && (
                  <text
                    x={s.lx} y={s.ly}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#fff" fontSize="8.5" fontWeight="700"
                    fontFamily="Poppins,sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    {Math.round(s.frac * 100)}%
                  </text>
                )}
              </motion.g>
            );
          })}
          {/* Centre hole */}
          <circle cx={CX} cy={CY} r={30} fill="var(--surface)" />
          <text x={CX} y={CY - 5} textAnchor="middle" fill="var(--gray-800)"
            style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'Poppins,sans-serif' }}>
            {total}
          </text>
          <text x={CX} y={CY + 10} textAnchor="middle" fill="var(--gray-400)"
            style={{ fontSize: '.52rem', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'Poppins,sans-serif' }}>
            Loans
          </text>
        </svg>
      </div>

      <div className="pie-legend">
        {segments.map((s, i) => (
          <div key={s.label} className="pie-legend-item"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}>
            <span className="pie-legend-dot" style={{ background: s.color }} />
            <span className="pie-legend-label">{s.label}</span>
            <span className="pie-legend-val">{s.value}</span>
            <span className="pie-legend-pct">({Math.round(s.frac * 100)}%)</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Activity Card ─────────────────────────────────────────────────── */
function ActivityCard({ rep, index, onNavigate }) {
  const initials = rep.customer_name
    ? rep.customer_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';
  const statusKey = (rep.status || 'paid').toLowerCase();
  const badgeCls  = statusKey === 'paid' ? 'active'
    : statusKey === 'overdue' ? 'overdue'
    : statusKey === 'partial' ? 'pending'
    : 'active';

  return (
    <motion.div
      className="activity-card"
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.055, duration: 0.3, ease: [0, 0, 0.2, 1] }}
      onClick={() => rep.loan_id && onNavigate(`/loans/${rep.loan_id}`)}
      style={{ cursor: rep.loan_id ? 'pointer' : 'default' }}
    >
      <div className="activity-avatar">{initials}</div>
      <div className="activity-card-body">
        <div className="activity-card-top">
          <span className="activity-customer">{rep.customer_name || '—'}</span>
          <span className="activity-amount">TZS {fmt(rep.amount || 0)}</span>
        </div>
        <div className="activity-card-meta">
          {rep.receipt_number && (
            <span className="activity-receipt">{rep.receipt_number}</span>
          )}
          <span className={`badge badge--${badgeCls}`} style={{ fontSize: '.68rem', padding: '.12rem .52rem' }}>
            {rep.status || 'paid'}
          </span>
          {(rep.paid_at || rep.created_at) && (
            <span className="activity-date">
              {new Date(rep.paid_at || rep.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short',
              })}
            </span>
          )}
        </div>
      </div>
      {rep.loan_id && <FiArrowRight size={14} className="activity-arrow" />}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [summary,     setSummary]     = useState(SUMMARY_DEFAULT);
  const [recent,      setRecent]      = useState(RECENT_DEFAULT);
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

      if (settled[1].status === 'fulfilled') {
        const raw = settled[1].value?.data;
        setRecent({
          repayments: raw?.repayments || [],
          customers:  raw?.customers  || [],
          loans:      raw?.loans      || [],
        });
      }

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

  const firstName     = user?.name?.split(' ')[0] || 'Admin';
  const avatarLetters = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 5)  return 'Good Night';
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    if (h < 21) return 'Good Evening';
    return 'Good Night';
  }

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="page">
        <div className="dashboard-hero" style={{ minHeight: 180 }}>
          <div className="hero-beam" aria-hidden="true" />
          <div className="hero-blob hero-blob--1" aria-hidden="true" />
        </div>
        <SkeletonStats count={6} />
      </div>
    );
  }

  const ls = summary?.loan_status ?? {};
  const pieData = [
    { label: 'Active',  value: Number(ls.active  || 0), color: 'var(--primary)'  },
    { label: 'Paid',    value: Number(ls.paid    || 0), color: 'var(--green)'    },
    { label: 'Pending', value: Number(ls.pending || 0), color: 'var(--yellow)'   },
    { label: 'Overdue', value: Number(ls.overdue || 0), color: 'var(--red)'      },
  ];

  return (
    <motion.div className="page" variants={pageIn} initial="hidden" animate="visible">

      {/* ── Error banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="alert alert--error"
            style={{ marginBottom: '1.25rem' }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            <FiAlertTriangle size={16} />
            {error}
            <button className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }}
              onClick={handleRefresh}>Retry</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════════════════════════ */}
      <motion.div
        className="dashboard-hero"
        variants={sectionReveal}
      >
        {/* Decorative background elements */}
        <div className="hero-beam" aria-hidden="true" />
        <div className="hero-blob hero-blob--1" aria-hidden="true" />
        <div className="hero-blob hero-blob--2" aria-hidden="true" />

        {/* Floating finance icons */}
        {FLOAT_ICONS.map(({ Icon, top, right, opacity, delay }, i) => (
          <motion.div key={i} className="hero-float-icon"
            style={{ top, right, opacity }}
            animate={{ y: [0, -11, 0] }}
            transition={{ duration: 4 + i * 0.6, repeat: Infinity, ease: 'easeInOut', delay }}
            aria-hidden="true"
          >
            <Icon size={20} />
          </motion.div>
        ))}

        <div className="hero-content">
          {/* Top row */}
          <div className="hero-top">
            <div className="hero-user">
              <div className="hero-avatar">{avatarLetters}</div>
              <div>
                <div className="hero-eyebrow">Microfinance Management</div>
                <div className="hero-greeting">
                  {getGreeting()},{' '}
                  <span className="hero-name">{firstName}</span>
                </div>
                <div className="hero-datetime">
                  <span className="hero-date">
                    {new Date().toLocaleDateString('en-GB', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                  <span className="hero-time-sep">•</span>
                  <LiveClock />
                </div>
              </div>
            </div>

            <div className="hero-actions">
              <button
                className={`hero-refresh-btn${refreshing ? ' refreshing' : ''}`}
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh dashboard"
              >
                <FiRefreshCw size={15} />
              </button>
              <button className="hero-view-btn" onClick={() => navigate('/loans')}>
                <FiDollarSign size={14} /> View Loans
              </button>
            </div>
          </div>

          {/* Quick metrics strip */}
          <div className="hero-metrics">
            <div className="hero-metric">
              <div className="hero-metric-icon"><FiUsers size={14} /></div>
              <div className="hero-metric-val">
                <AnimatedNumber value={summary?.customers ?? 0} />
              </div>
              <div className="hero-metric-lbl">Customers</div>
            </div>
            <div className="hero-metric-divider" />
            <div className="hero-metric">
              <div className="hero-metric-icon"><FiDollarSign size={14} /></div>
              <div className="hero-metric-val hero-metric-val--green">
                <HeroCountShort value={summary?.collected ?? 0} />
              </div>
              <div className="hero-metric-lbl">Total Collected</div>
            </div>
            <div className="hero-metric-divider" />
            <div className="hero-metric">
              <div className="hero-metric-icon"><FiCreditCard size={14} /></div>
              <div className="hero-metric-val">
                <AnimatedNumber value={summary?.active_loans ?? 0} />
              </div>
              <div className="hero-metric-lbl">Active Loans</div>
            </div>
            <div className="hero-metric-divider" />
            <div className="hero-metric">
              <div className="hero-metric-icon"><FiTrendingUp size={14} /></div>
              <div className="hero-metric-val">
                <HeroCountShort value={summary?.outstanding ?? 0} />
              </div>
              <div className="hero-metric-lbl">Outstanding</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Overdue alert ── */}
      <AnimatePresence>
        {(summary?.overdue_loans || 0) > 0 && (
          <motion.div
            className="alert-banner alert-banner--warning"
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            onClick={() => navigate('/loans?filter=overdue')}
            style={{ cursor: 'pointer', marginBottom: '1.5rem' }}
            whileHover={{ scale: 1.005 }}
          >
            <FiAlertTriangle size={17} />
            <span>
              <strong>{summary.overdue_loans} loan{summary.overdue_loans !== 1 ? 's' : ''} overdue</strong>
              {' '}— click to review
            </span>
            <FiArrowRight size={15} style={{ marginLeft: 'auto' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════
          6 KPI STAT CARDS
          ════════════════════════════════════════════════════════════════ */}
      <motion.div className="stat-grid" variants={pageIn}>
        <StatCard
          label="Total Customers" color="blue"
          value={summary?.customers ?? 0}
          sub="Registered clients"
          Icon={FiUsers} to="/customers"
          variants={fadeUp}
        />
        <StatCard
          label="Active Loans" color="green"
          value={summary?.active_loans ?? 0}
          sub={`TZS ${fmt(summary?.loans_amount ?? 0)} issued`}
          Icon={FiDollarSign} to="/loans"
          variants={fadeUp}
        />
        <StatCard
          label="Pending Loans" color="yellow"
          value={ls?.pending ?? 0}
          sub="Awaiting disbursement"
          Icon={FiBarChart2} to="/loans"
          variants={fadeUp}
        />
        <StatCard
          label="Overdue Loans" color="red"
          value={summary?.overdue_loans ?? 0}
          sub="Require follow-up"
          Icon={FiAlertTriangle}
          variants={fadeUp}
        />
        <StatCard
          label="Total Collected" color="teal"
          value={`TZS ${fmt(summary?.collected ?? 0)}`}
          sub={`${summary?.repayments ?? 0} payments`}
          Icon={FiCreditCard} to="/repayments"
          variants={fadeUp}
        />
        <StatCard
          label="Outstanding" color="orange"
          value={`TZS ${fmt(summary?.outstanding ?? 0)}`}
          sub="Balance remaining"
          Icon={FiTrendingUp}
          variants={fadeUp}
        />
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════
          PIE CHART + ACTIVITY FEED
          ════════════════════════════════════════════════════════════════ */}
      <div className="dashboard-bottom">

        {/* Pie chart card */}
        <motion.section className="card pie-chart-section" variants={sectionReveal}>
          <div className="card-header">
            <h2 className="card-title"><FiBarChart2 size={15} /> Loan Status</h2>
          </div>
          <PieChart data={pieData} />
        </motion.section>

        {/* Recent repayments activity feed */}
        <motion.section className="card" variants={sectionReveal}>
          <div className="card-header">
            <h2 className="card-title"><FiActivity size={15} /> Recent Activity</h2>
            <button className="link-btn" onClick={() => navigate('/repayments')}>
              View all →
            </button>
          </div>
          <div className="activity-feed-list">
            {recent.repayments?.length > 0 ? (
              recent.repayments.slice(0, 10).map((rep, i) => (
                <ActivityCard
                  key={rep.id || i}
                  rep={rep}
                  index={i}
                  onNavigate={navigate}
                />
              ))
            ) : (
              <p className="empty-msg" style={{ padding: '2rem 0', textAlign: 'center' }}>
                No repayments recorded yet
              </p>
            )}
          </div>
        </motion.section>

      </div>

    </motion.div>
  );
}
