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
import api                        from '../api';
import { fmt, fmtShort }          from '../utils/format';
import { useAuth }                 from '../context/AuthContext';
import { useProfileImage }         from '../context/ProfileContext';
import StatCard                    from '../components/common/StatCard';
import { SkeletonStats }           from '../components/common/Skeleton';

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

/* ── Hero floating icons ─────────────────────────────────────────────── */
const FLOAT_ICONS = [
  { Icon: FiDollarSign, top: '14%',  right: '10%', opacity: 0.09, delay: 0 },
  { Icon: FiTrendingUp, top: '55%',  right: '5%',  opacity: 0.07, delay: 1.2 },
  { Icon: FiCreditCard, top: '25%',  right: '26%', opacity: 0.06, delay: 0.6 },
  { Icon: FiPercent,    top: '70%',  right: '18%', opacity: 0.08, delay: 1.8 },
  { Icon: FiActivity,   top: '82%',  right: '36%', opacity: 0.05, delay: 0.9 },
];

/* ── SVG Line Chart — Interactive ───────────────────────────────── */
function LineChart({ data = [], yKey = 'total_collected', color = '#22C55E', gradId = 'lcg' }) {
  const W = 500, H = 160, pad = { t: 16, r: 12, b: 34, l: 50 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const [selected, setSelected] = useState(null);
  const [hovered,  setHovered]  = useState(null);

  if (!data.length) return <p className="chart-empty-msg">No data yet</p>;

  const vals = data.map(d => Number(d[yKey]) || 0);
  const maxV = Math.max(...vals, 1);
  const pts  = data.map((d, i) => ({
    x:   pad.l + (data.length > 1 ? i / (data.length - 1) : 0.5) * iW,
    y:   pad.t + iH - (vals[i] / maxV) * iH,
    month: String(d.month || '').slice(5, 7),
    fullMonth: d.month || '',
    value: vals[i],
    pct: i > 0 && vals[i - 1] > 0
      ? ((vals[i] - vals[i - 1]) / vals[i - 1] * 100).toFixed(1)
      : null,
  }));

  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = pts[i - 1], cx = ((prev.x + p.x) / 2).toFixed(1);
    return `${acc} C ${cx} ${prev.y.toFixed(1)} ${cx} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');

  const fillPath = pts.length
    ? `${linePath} L ${pts[pts.length-1].x.toFixed(1)} ${(pad.t+iH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(pad.t+iH).toFixed(1)} Z`
    : '';

  const yTicks   = [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: pad.t + iH*(1-f), label: fmtShort(f*maxV) }));
  const active   = selected !== null ? selected : hovered;
  const activePt = active !== null ? pts[active] : null;

  const slotW = pts.length > 1 ? iW / (pts.length - 1) : iW;

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
          <clipPath id={`clip-${gradId}`}><rect x={pad.l} y={pad.t} width={iW} height={iH} /></clipPath>
          <filter id={`glow-${gradId}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid + Y-axis */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} y1={t.y} x2={pad.l+iW} y2={t.y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />
            <text x={pad.l-5} y={t.y+4} textAnchor="end" fill="var(--gray-400)" fontSize="8">{t.label}</text>
          </g>
        ))}

        {/* Gradient fill */}
        {fillPath && <path d={fillPath} fill={`url(#${gradId})`} clipPath={`url(#clip-${gradId})`} />}

        {/* Vertical highlight line on active point */}
        {activePt && (
          <line x1={activePt.x} y1={pad.t} x2={activePt.x} y2={pad.t+iH}
            stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.45" />
        )}

        {/* Animated line */}
        <motion.path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.3, ease: [0.16,1,0.3,1], delay: 0.15 }} />

        {/* Data-point circles */}
        {pts.map((p, i) => {
          const isActive = active === i;
          return (
            <motion.circle key={i} cx={p.x} cy={p.y}
              r={isActive ? 6 : 3.5}
              fill={color} stroke="var(--surface)" strokeWidth={isActive ? 2.5 : 2}
              filter={isActive ? `url(#glow-${gradId})` : undefined}
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.2 + (i/Math.max(pts.length-1,1))*0.8, duration: 0.25 }}
              style={{ transformOrigin: `${p.x}px ${p.y}px` }}
            />
          );
        })}

        {/* X-axis labels */}
        {pts.filter((_, i) => pts.length <= 6 || i % Math.ceil(pts.length/6) === 0 || i === pts.length-1)
          .map((p, i) => (
            <text key={i} x={p.x} y={H-6} textAnchor="middle" fill={active === pts.indexOf(p) ? color : 'var(--gray-400)'} fontSize="9">{p.month}</text>
          ))}

        {/* Transparent wide hit-areas for click + hover (mobile-friendly) */}
        {pts.map((p, i) => (
          <rect key={i}
            x={Math.max(pad.l, p.x - slotW/2)}
            y={pad.t} width={Math.min(slotW, iW)} height={iH}
            fill="transparent" style={{ cursor: 'pointer' }}
            onClick={() => setSelected(prev => prev === i ? null : i)}
            onPointerEnter={() => setHovered(i)}
            onPointerLeave={() => setHovered(null)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {activePt && (
          <motion.div className="chart-tooltip"
            key={active}
            initial={{ opacity: 0, y: 5, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.92 }}
            transition={{ duration: 0.13 }}
            style={{
              position: 'absolute',
              left: `${((activePt.x / W) * 100).toFixed(1)}%`,
              top:  `${((activePt.y / H) * 100).toFixed(1)}%`,
              transform: 'translate(-50%, calc(-100% - 12px))',
              pointerEvents: 'none',
              zIndex: 10,
            }}>
            <div className="chart-tooltip-month">{activePt.fullMonth}</div>
            <div className="chart-tooltip-value">TZS {fmtShort(activePt.value)}</div>
            {activePt.pct !== null && (
              <div className={`chart-tooltip-pct ${Number(activePt.pct) >= 0 ? 'pos' : 'neg'}`}>
                {Number(activePt.pct) >= 0 ? '▲' : '▼'} {Math.abs(Number(activePt.pct))}%
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── SVG Bar Chart — Interactive ────────────────────────────────── */
function BarChart({ data = [], yKey = 'total_issued', color = '#2563EB', gradId = 'bcg' }) {
  const W = 500, H = 160, pad = { t: 16, r: 12, b: 34, l: 50 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const [selected, setSelected] = useState(null);
  const [hovered,  setHovered]  = useState(null);

  if (!data.length) return <p className="chart-empty-msg">No data yet</p>;

  const vals  = data.map(d => Number(d[yKey]) || 0);
  const maxV  = Math.max(...vals, 1);
  const slotW = iW / data.length;
  const barW  = Math.max(8, slotW * 0.58);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: pad.t + iH*(1-f), label: fmtShort(f*maxV) }));

  const active = selected !== null ? selected : hovered;

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.85" />
            <stop offset="100%" stopColor={color} stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id={`${gradId}-active`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.65" />
          </linearGradient>
        </defs>

        {/* Grid + Y-axis */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} y1={t.y} x2={pad.l+iW} y2={t.y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />
            <text x={pad.l-5} y={t.y+4} textAnchor="end" fill="var(--gray-400)" fontSize="8">{t.label}</text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const h        = (vals[i] / maxV) * iH;
          const x        = pad.l + i * slotW + (slotW - barW) / 2;
          const isActive = active === i;
          const fade     = active !== null && !isActive;
          return (
            <g key={i} style={{ cursor: 'pointer' }}
              onClick={() => setSelected(prev => prev === i ? null : i)}
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered(null)}>
              <motion.rect
                x={x} width={barW} rx="3" ry="3"
                fill={isActive ? `url(#${gradId}-active)` : `url(#${gradId})`}
                stroke={isActive ? color : 'none'} strokeWidth={isActive ? 2 : 0}
                opacity={fade ? 0.45 : 1}
                initial={{ y: pad.t + iH, height: 0 }}
                animate={{ y: pad.t + iH - h, height: h }}
                transition={{ delay: i * 0.06, duration: 0.55, ease: [0.16,1,0.3,1] }}
              />
              {/* Invisible wide hit zone for easy touch */}
              <rect x={pad.l + i * slotW} y={pad.t} width={slotW} height={iH} fill="transparent" />
              {(data.length <= 12 || i % Math.ceil(data.length/6) === 0) && (
                <text x={x + barW/2} y={H-6} textAnchor="middle"
                  fill={isActive ? color : 'var(--gray-400)'} fontSize="9">
                  {String(d.month || '').slice(5,7)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {active !== null && vals[active] > 0 && (() => {
          const h    = (vals[active] / maxV) * iH;
          const barX = pad.l + active * slotW + slotW / 2;
          const barY = pad.t + iH - h;
          return (
            <motion.div className="chart-tooltip"
              key={active}
              initial={{ opacity: 0, y: 5, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.92 }}
              transition={{ duration: 0.13 }}
              style={{
                position: 'absolute',
                left: `${((barX / W) * 100).toFixed(1)}%`,
                top:  `${((barY / H) * 100).toFixed(1)}%`,
                transform: 'translate(-50%, calc(-100% - 10px))',
                pointerEvents: 'none',
                zIndex: 10,
              }}>
              <div className="chart-tooltip-month">{data[active]?.month}</div>
              <div className="chart-tooltip-value">TZS {fmtShort(vals[active])}</div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

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

/* ── Live clock (updates every second) ────────────────────────────── */
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
    const ctrl = animate(mv, n, { duration: 1.4, ease: [0.16, 1, 0.3, 1] });
    return ctrl.stop;
  }, [value, mv]);
  return <motion.span>{disp}</motion.span>;
}

/* ── SVG Pie Chart — Interactive ────────────────────────────────── */
function PieChart({ data }) {
  const [hovered,  setHovered]  = useState(null);
  const [selected, setSelected] = useState(null);
  const [hidden,   setHidden]   = useState(new Set());

  const rawTotal = data.reduce((s, d) => s + (d.value || 0), 0);
  if (!rawTotal) return <div className="pie-empty">No loan data available yet</div>;

  const visibleData = data.filter(d => !hidden.has(d.label));
  const total       = visibleData.reduce((s, d) => s + (d.value || 0), 0) || 1;

  const CX = 100, CY = 100, R = 76;
  let cumAngle = -Math.PI / 2;

  const segments = visibleData
    .filter(d => d.value > 0)
    .map(d => {
      const frac       = d.value / total;
      const startAngle = cumAngle;
      const endAngle   = cumAngle + frac * 2 * Math.PI;
      cumAngle         = endAngle;
      const bisector   = (startAngle + endAngle) / 2;
      const x1 = CX + R * Math.cos(startAngle);
      const y1 = CY + R * Math.sin(startAngle);
      const x2 = CX + R * Math.cos(endAngle);
      const y2 = CY + R * Math.sin(endAngle);
      const path = `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${frac > 0.5 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      const lx = CX + R * 0.6 * Math.cos(bisector);
      const ly = CY + R * 0.6 * Math.sin(bisector);
      return { ...d, frac, bisector, path, lx, ly };
    });

  const activeIdx  = selected !== null ? selected : hovered;
  const selectedSeg = selected !== null ? segments[selected] : null;

  function toggleHidden(label) {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      setSelected(null);
      return next;
    });
  }

  return (
    <>
      <div className="pie-chart-wrap">
        <svg viewBox="0 0 200 200"
          style={{ width: '100%', maxWidth: '200px', display: 'block', overflow: 'visible', cursor: 'pointer' }}>
          {segments.map((s, i) => {
            const isActive = activeIdx === i;
            const offset   = selected === i ? 13 : isActive ? 8 : 0;
            return (
              <motion.g key={s.label}
                animate={{
                  x: offset ? Math.cos(s.bisector) * offset : 0,
                  y: offset ? Math.sin(s.bisector) * offset : 0,
                }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                onClick={() => setSelected(prev => prev === i ? null : i)}
                style={{
                  filter: isActive
                    ? `drop-shadow(0 0 10px ${s.color}aa)`
                    : 'drop-shadow(0 2px 5px rgba(0,0,0,.14))',
                  transition: 'filter .2s',
                  cursor: 'pointer',
                }}>
                <motion.path d={s.path} fill={s.color}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                />
                {s.frac >= 0.07 && (
                  <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle"
                    fill="#fff" fontSize="8.5" fontWeight="700" style={{ pointerEvents: 'none' }}>
                    {Math.round(s.frac * 100)}%
                  </text>
                )}
              </motion.g>
            );
          })}
          <circle cx={CX} cy={CY} r={30} fill="var(--surface)" />
          <text x={CX} y={CY - 5} textAnchor="middle" fill="var(--gray-800)"
            style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            {total}
          </text>
          <text x={CX} y={CY + 10} textAnchor="middle" fill="var(--gray-400)"
            style={{ fontSize: '.52rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Loans
          </text>
        </svg>
      </div>

      {/* Selected-slice detail panel */}
      <AnimatePresence>
        {selectedSeg && (
          <motion.div className="pie-selection-panel"
            initial={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '.35rem', marginBottom: '.5rem' }}
            exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}>
            <div className="pie-sel-dot" style={{ background: selectedSeg.color }} />
            <div className="pie-sel-info">
              <span className="pie-sel-label">{selectedSeg.label}</span>
              <span className="pie-sel-value">{selectedSeg.value} loans</span>
              <span className="pie-sel-pct">{Math.round(selectedSeg.frac * 100)}% of visible</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend — click to toggle visibility */}
      <div className="pie-legend">
        {data.map((d, i) => {
          const seg      = segments.find(s => s.label === d.label);
          const isHidden = hidden.has(d.label);
          const isSelected = selected !== null && seg && segments.indexOf(seg) === selected;
          return (
            <div key={d.label}
              className={`pie-legend-item${isHidden ? ' pie-legend-item--hidden' : ''}${isSelected ? ' pie-legend-item--selected' : ''}`}
              onClick={() => toggleHidden(d.label)}
              onPointerEnter={() => !isHidden && seg && setHovered(segments.indexOf(seg))}
              onPointerLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}>
              <span className="pie-legend-dot" style={{ background: isHidden ? 'var(--gray-300)' : d.color }} />
              <span className="pie-legend-label" style={{ opacity: isHidden ? 0.4 : 1 }}>{d.label}</span>
              <span className="pie-legend-val"   style={{ opacity: isHidden ? 0.4 : 1 }}>{d.value}</span>
              <span className="pie-legend-pct"   style={{ opacity: isHidden ? 0.4 : 1 }}>
                ({Math.round((d.value / rawTotal) * 100)}%)
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── Activity Card (recent repayments) ─────────────────────────────── */
function ActivityCard({ rep, index, onNavigate }) {
  const initials = rep.customer_name
    ? rep.customer_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';
  const statusKey = (rep.status || 'paid').toLowerCase();
  const badgeCls  = statusKey === 'overdue' ? 'overdue'
    : statusKey === 'partial' || statusKey === 'pending' ? 'pending'
    : 'active';

  return (
    <motion.div className="activity-card"
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
          <span className={`badge badge--${badgeCls}`}
            style={{ fontSize: '.68rem', padding: '.1rem .5rem' }}>
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
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const [summary,    setSummary]    = useState(SUMMARY_DEFAULT);
  const [recent,     setRecent]     = useState(RECENT_DEFAULT);
  const [monthly,    setMonthly]    = useState({ loans: [], repayments: [] });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const { profileImg } = useProfileImage();

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

      if (settled[2].status === 'fulfilled') {
        const raw = settled[2].value?.data;
        setMonthly({ loans: raw?.loans || [], repayments: raw?.repayments || [] });
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

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="page">
        <div className="dashboard-hero" style={{ minHeight: 160 }}>
          <div className="hero-beam" aria-hidden="true" />
          <div className="hero-blob hero-blob--1" aria-hidden="true" />
        </div>
        <SkeletonStats count={4} />
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
          <motion.div className="alert alert--error" style={{ marginBottom: '1.25rem' }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <FiAlertTriangle size={16} />
            {error}
            <button className="btn btn--ghost btn--sm" style={{ marginLeft: 'auto' }}
              onClick={handleRefresh}>Retry</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════
          HERO — greeting, date, live time only
          ════════════════════════════════════════════════════════════════ */}
      <motion.div className="dashboard-hero" variants={sectionReveal}>
        {/* Decorative background */}
        <div className="hero-beam" aria-hidden="true" />
        <div className="hero-blob hero-blob--1" aria-hidden="true" />
        <div className="hero-blob hero-blob--2" aria-hidden="true" />

        {/* Floating finance icons */}
        {FLOAT_ICONS.map(({ Icon, top, right, opacity, delay }, i) => (
          <motion.div key={i} className="hero-float-icon"
            style={{ top, right, opacity }}
            animate={{ y: [0, -11, 0] }}
            transition={{ duration: 4 + i * 0.6, repeat: Infinity, ease: 'easeInOut', delay }}
            aria-hidden="true">
            <Icon size={20} />
          </motion.div>
        ))}

        <div className="hero-content">
          <div className="hero-top">
            {/* User identity + greeting */}
            <div className="hero-user">
              <div className="hero-avatar">
                {profileImg
                  ? <img src={profileImg} alt={firstName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : avatarLetters
                }
              </div>
              <div>
                <div className="hero-eyebrow">Welcome Back</div>
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

            {/* Action buttons */}
            <div className="hero-actions">
              <button
                className={`hero-refresh-btn${refreshing ? ' refreshing' : ''}`}
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh dashboard">
                <FiRefreshCw size={15} />
              </button>
              <button className="hero-view-btn" onClick={() => navigate('/loans')}>
                <FiDollarSign size={14} /> View Loans
              </button>
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
            whileHover={{ scale: 1.005 }}>
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
          4 SUMMARY STAT CARDS
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
          sub={`TZS ${fmt(summary?.loans_amount ?? 0)} disbursed`}
          Icon={FiDollarSign} to="/loans"
          variants={fadeUp}
        />
        <StatCard
          label="Total Collected" color="teal"
          value={`TZS ${fmt(summary?.collected ?? 0)}`}
          sub={`${summary?.repayments ?? 0} payments received`}
          Icon={FiCreditCard} to="/repayments"
          variants={fadeUp}
        />
        <StatCard
          label="Outstanding" color="orange"
          value={`TZS ${fmt(summary?.outstanding ?? 0)}`}
          sub={`${summary?.overdue_loans ?? 0} overdue`}
          Icon={FiTrendingUp}
          variants={fadeUp}
        />
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════
          CHARTS — Collection Trend + Monthly Disbursements
          ════════════════════════════════════════════════════════════════ */}
      <div className="dashboard-charts">
        <motion.section className="card" variants={sectionReveal} style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h2 className="card-title"><FiTrendingUp size={15} /> Collection Trend</h2>
            <span style={{ fontSize: '.75rem', color: 'var(--gray-400)', fontWeight: 300 }}>Monthly</span>
          </div>
          <LineChart data={monthly.repayments} yKey="total_collected" color="#22C55E" gradId="col-trend" />
        </motion.section>

        <motion.section className="card" variants={sectionReveal} style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h2 className="card-title"><FiBarChart2 size={15} /> Loan Disbursements</h2>
            <span style={{ fontSize: '.75rem', color: 'var(--gray-400)', fontWeight: 300 }}>Monthly</span>
          </div>
          <BarChart data={monthly.loans} yKey="total_issued" color="#2563EB" gradId="mo-disb" />
        </motion.section>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          PIE CHART + ACTIVITY FEED
          ════════════════════════════════════════════════════════════════ */}
      <div className="dashboard-bottom">

        {/* Loan status pie chart */}
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
            <button className="link-btn" onClick={() => navigate('/repayments')}>View all →</button>
          </div>
          <div className="activity-feed-list">
            {recent.repayments?.length > 0 ? (
              recent.repayments.slice(0, 10).map((rep, i) => (
                <ActivityCard key={rep.id || i} rep={rep} index={i} onNavigate={navigate} />
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
