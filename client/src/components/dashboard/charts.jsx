import { useId, useState } from 'react';
import { motion } from 'framer-motion';

/*
 * Dashboard charts — inline SVG + Framer Motion, no charting dependency.
 *
 * All three take real series from the dashboard API. Colour and type come from
 * CSS classes (never hard-coded attributes) so the charts follow the design
 * tokens, and every SVG scales through a viewBox so nothing can overflow its
 * container at any width.
 */

const VB = { w: 720, h: 240 };                 // viewBox the charts draw into
const PAD = { l: 8, r: 8, t: 18, b: 26 };
const niceMax = v => {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
};

/* ── Dot / line trend ───────────────────────────────────────────────────
   One dot per period. Hovering (or focusing) a dot reveals its value.     */
export function TrendDots({ points = [], format = String, label = 'Trend', tone = 'orange' }) {
  const [hover, setHover] = useState(null);
  const gid = useId().replace(/:/g, '');

  if (!points.length) return <div className="mf-chart mf-chart--empty">No activity yet</div>;

  const max = niceMax(Math.max(...points.map(p => p.value)));
  const innerW = VB.w - PAD.l - PAD.r;
  const innerH = VB.h - PAD.t - PAD.b;
  const x = i => PAD.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = v => PAD.t + innerH - (v / max) * innerH;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${PAD.t + innerH} L${x(0).toFixed(1)},${PAD.t + innerH} Z`;
  const active = hover == null ? null : points[hover];

  return (
    <div className={`mf-chart mf-chart--dots mf-chart--${tone}`}>
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="mf-chart__svg" role="img"
        aria-label={`${label}: ${points.map(p => `${p.label} ${format(p.value)}`).join(', ')}`}>
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="mf-chart__grad-from" />
            <stop offset="100%" className="mf-chart__grad-to" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map(f => (
          <line key={f} className="mf-chart__grid" x1={PAD.l} x2={VB.w - PAD.r}
            y1={PAD.t + innerH * f} y2={PAD.t + innerH * f} />
        ))}

        <motion.path d={area} fill={`url(#fill-${gid})`} className="mf-chart__area"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .6, delay: .25 }} />
        <motion.path d={line} className="mf-chart__line"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} />

        {points.map((p, i) => (
          <g key={p.key} className={`mf-chart__point${hover === i ? ' is-hover' : ''}`}>
            {hover === i && <line className="mf-chart__cursor" x1={x(i)} x2={x(i)} y1={PAD.t} y2={PAD.t + innerH} />}
            <motion.circle className="mf-chart__dot" cx={x(i)} cy={y(p.value)} r={hover === i ? 6.5 : 4}
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: .3 + i * 0.035, type: 'spring', stiffness: 420, damping: 22 }} />
            {/* generous invisible hit area — easy to hit with a thumb */}
            <rect className="mf-chart__hit" x={x(i) - innerW / (points.length * 2)} y={PAD.t}
              width={innerW / points.length} height={innerH}
              tabIndex={0} role="button" aria-label={`${p.label}: ${format(p.value)}`}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
          </g>
        ))}

        {points.map((p, i) => (
          <text key={p.key} className={`mf-chart__xlabel${i % 2 ? ' is-odd' : ''}`}
            x={x(i)} y={VB.h - 6} textAnchor="middle">{p.label}</text>
        ))}
      </svg>

      <div className={`mf-chart__tip${active ? ' is-visible' : ''}`} aria-hidden="true"
        style={active ? { left: `${(x(hover) / VB.w) * 100}%` } : undefined}>
        <span className="mf-chart__tip-label">{active?.label}</span>
        <span className="mf-chart__tip-value">{active ? format(active.value) : ''}</span>
      </div>
    </div>
  );
}

/* ── Grouped bar trend ─────────────────────────────────────────────────── */
export function BarTrend({ points = [], series = [], format = String, label = 'Trend' }) {
  const [hover, setHover] = useState(null);

  if (!points.length) return <div className="mf-chart mf-chart--empty">No activity yet</div>;

  const max = niceMax(Math.max(1, ...points.flatMap(p => series.map(s => p[s.key] || 0))));
  const innerW = VB.w - PAD.l - PAD.r;
  const innerH = VB.h - PAD.t - PAD.b;
  const slot = innerW / points.length;
  const barW = Math.min(16, (slot - 8) / series.length);

  return (
    <div className="mf-chart mf-chart--bars">
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="mf-chart__svg" role="img"
        aria-label={`${label}: ${points.map(p => `${p.label} ${series.map(s => `${s.label} ${format(p[s.key] || 0)}`).join(' / ')}`).join('; ')}`}>
        {[0, 0.5, 1].map(f => (
          <line key={f} className="mf-chart__grid" x1={PAD.l} x2={VB.w - PAD.r}
            y1={PAD.t + innerH * f} y2={PAD.t + innerH * f} />
        ))}

        {points.map((p, i) => {
          const groupX = PAD.l + slot * i + slot / 2;
          const total = series.length * barW + (series.length - 1) * 3;
          return (
            <g key={p.key} className={`mf-chart__group${hover === i ? ' is-hover' : ''}`}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}
              role="button" aria-label={`${p.label}: ${series.map(s => `${s.label} ${format(p[s.key] || 0)}`).join(', ')}`}>
              <rect className="mf-chart__slot" x={groupX - slot / 2} y={PAD.t} width={slot} height={innerH} />
              {series.map((s, si) => {
                const v = p[s.key] || 0;
                const h = Math.max(v > 0 ? 2 : 0, (v / max) * innerH);
                return (
                  <motion.rect
                    key={s.key}
                    className={`mf-chart__bar is-${s.tone}`}
                    x={groupX - total / 2 + si * (barW + 3)}
                    width={barW}
                    initial={{ height: 0, y: PAD.t + innerH }}
                    animate={{ height: h, y: PAD.t + innerH - h }}
                    transition={{ duration: .7, delay: .15 + i * 0.04 + si * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    rx="2"
                  />
                );
              })}
            </g>
          );
        })}

        {points.map((p, i) => (
          <text key={p.key} className={`mf-chart__xlabel${i % 2 ? ' is-odd' : ''}`}
            x={PAD.l + slot * i + slot / 2} y={VB.h - 6} textAnchor="middle">{p.label}</text>
        ))}
      </svg>

      <div className={`mf-chart__tip${hover != null ? ' is-visible' : ''}`} aria-hidden="true"
        style={hover != null ? { left: `${((PAD.l + slot * hover + slot / 2) / VB.w) * 100}%` } : undefined}>
        <span className="mf-chart__tip-label">{hover != null ? points[hover].label : ''}</span>
        {series.map(s => (
          <span key={s.key} className="mf-chart__tip-row">
            <i className={`mf-chart__swatch is-${s.tone}`} />{s.label}
            <b>{hover != null ? format(points[hover][s.key] || 0) : ''}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Donut ──────────────────────────────────────────────────────────────
   Hovering a segment (or its legend row) highlights the arc and writes the
   category and value into the middle.                                     */
export function Donut({ segments = [], total: totalProp, centerLabel = 'Total', format = String }) {
  const [hover, setHover] = useState(null);
  const total = totalProp ?? segments.reduce((s, x) => s + (Number(x.value) || 0), 0);

  const R = 56;
  const C = 2 * Math.PI * R;
  const live = segments.filter(s => Number(s.value) > 0);
  const active = hover == null ? null : segments[hover];

  let offset = 0;
  const arcs = live.map(s => {
    const share = total > 0 ? (Number(s.value) || 0) / total : 0;
    const arc = { ...s, share, dash: share * C, offset };
    offset += arc.dash;
    return arc;
  });

  return (
    <div className="mf-donut">
      <div className="mf-donut__ring">
        <svg viewBox="0 0 160 160" className="mf-donut__svg" role="img"
          aria-label={`${centerLabel} ${format(total)}. ${segments.map(s => `${s.label} ${s.value}`).join(', ')}`}>
          <circle className="mf-donut__track" cx="80" cy="80" r={R} />
          {arcs.map(a => {
            const i = segments.findIndex(s => s.key === a.key);
            return (
              <motion.circle
                key={a.key}
                className={`mf-donut__arc is-${a.tone}${hover === i ? ' is-hover' : ''}${hover != null && hover !== i ? ' is-dim' : ''}`}
                cx="80" cy="80" r={R}
                strokeDasharray={`${a.dash} ${C - a.dash}`}
                strokeDashoffset={-a.offset}
                initial={{ opacity: 0, strokeDasharray: `0 ${C}` }}
                animate={{ opacity: 1, strokeDasharray: `${a.dash} ${C - a.dash}` }}
                transition={{ duration: .8, ease: [0.16, 1, 0.3, 1], delay: .1 }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        <div className="mf-donut__center">
          <span className="mf-donut__center-value">{active ? active.value : format(total)}</span>
          <span className="mf-donut__center-label">{active ? active.label : centerLabel}</span>
        </div>
      </div>

      <ul className="mf-donut__legend">
        {segments.map((s, i) => {
          const share = total > 0 ? Math.round(((Number(s.value) || 0) / total) * 100) : 0;
          return (
            <li key={s.key}>
              <button type="button"
                className={`mf-donut__row${hover === i ? ' is-hover' : ''}`}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                onClick={s.onSelect}
                aria-label={`${s.label}: ${s.value} (${share}%)`}>
                <i className={`mf-donut__swatch is-${s.tone}`} aria-hidden="true" />
                <span className="mf-donut__row-label">{s.label}</span>
                <span className="mf-donut__row-value">{s.value}</span>
                <span className="mf-donut__row-share">{share}%</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
