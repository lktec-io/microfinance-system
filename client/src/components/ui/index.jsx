/*
 * Core UI primitives for the fintech design system.
 * Pure CSS (see styles/app/elements.css + patterns.css) — no UI libraries.
 */
import { useEffect } from 'react';
import { FiCheck, FiSearch, FiX } from 'react-icons/fi';
import ModalPortal from '../common/ModalPortal';
import { daysUntil } from '../../utils/finance';
import { fmtShort, initials } from '../../utils/format';

/* ── Page header ───────────────────────────────────────────────────── */
export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="mf-page-head">
      <div className="mf-page-head__text">
        {eyebrow && <div className="mf-eyebrow">{eyebrow}</div>}
        <h1 className="mf-page-title">{title}</h1>
        {subtitle && <p className="mf-page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="mf-page-head__actions">{actions}</div>}
    </header>
  );
}

/* ── Metric card ───────────────────────────────────────────────────── */
export function MetricCard({ label, value, unit, sub, Icon, tone = 'neutral', tracker, onClick, loading, compact, title }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`mf-metric mf-metric--${tone}${onClick ? ' mf-metric--link' : ''}${compact ? ' mf-metric--compact' : ''}`}
      onClick={onClick}
      title={title}
    >
      <div className="mf-metric__top">
        <span className="mf-metric__label">{label}</span>
        {Icon && <span className="mf-metric__icon"><Icon size={13} /></span>}
      </div>
      <div className="mf-metric__value">
        {loading
          ? <span className="skeleton mf-metric__sk" />
          : <>{unit && <span className="mf-metric__unit">{unit}</span>}<span>{value}</span></>}
      </div>
      {sub && <div className="mf-metric__sub">{loading ? <span className="skeleton" style={{ width: '55%' }} /> : sub}</div>}
      {tracker && !loading && <div className="mf-metric__tracker">{tracker}</div>}
    </Tag>
  );
}

/* ── CSS trackers ──────────────────────────────────────────────────── */
export function MiniBars({ values = [], labels = [], format = fmtShort }) {
  const max = Math.max(0, ...values);
  if (!values.length || max <= 0) return <div className="mf-bars mf-bars--empty">No activity yet</div>;
  return (
    <div className="mf-bars" aria-hidden="true">
      {values.map((v, i) => (
        <span
          key={i}
          className={`mf-bars__bar${i === values.length - 1 ? ' is-current' : ''}`}
          style={{ '--h': `${Math.max(5, (v / max) * 100)}%`, animationDelay: `${i * 30}ms` }}
          title={labels[i] ? `${labels[i]} · ${format(v)}` : format(v)}
        />
      ))}
    </div>
  );
}

export function StackBar({ segments = [], tall }) {
  const total = segments.reduce((s, x) => s + (Number(x.value) || 0), 0);
  if (!total) return <div className={`mf-stack mf-stack--empty${tall ? ' mf-stack--tall' : ''}`} />;
  return (
    <div className={`mf-stack${tall ? ' mf-stack--tall' : ''}`} role="img"
      aria-label={segments.map(s => `${s.label} ${s.value}`).join(', ')}>
      {segments.filter(s => s.value > 0).map(s => (
        <span key={s.label} className={`mf-stack__seg mf-tone-bg--${s.tone}`}
          style={{ flexGrow: s.value }} title={`${s.label}: ${s.display ?? s.value}`} />
      ))}
    </div>
  );
}

export function Meter({ value, tone = 'orange', scale = true }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div>
      <div className="mf-meter" role="meter" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
        <span className={`mf-meter__fill mf-tone-bg--${tone}`} style={{ width: `${v}%` }} />
      </div>
      {scale && (
        <div className="mf-meter__scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
      )}
    </div>
  );
}

export function ProgressBar({ value, tone = 'orange', thick }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`mf-progress${thick ? ' mf-progress--thick' : ''}`}>
      <span className={`mf-progress__fill mf-tone-bg--${tone}`} style={{ width: `${v}%` }} />
    </div>
  );
}

/* ── Due-date / aging chip ─────────────────────────────────────────── */
export function DueChip({ date, status }) {
  if (status === 'paid') return <span className="mf-due mf-due--settled">Settled</span>;
  const d = daysUntil(date);
  if (d == null) return <span className="mf-due">No date</span>;
  if (d < 0)  return <span className="mf-due mf-due--overdue">{Math.abs(d)}d overdue</span>;
  if (d === 0) return <span className="mf-due mf-due--soon">Due today</span>;
  if (d <= 7) return <span className="mf-due mf-due--soon">{d}d left</span>;
  return <span className="mf-due">{d}d left</span>;
}

/* ── Avatar ────────────────────────────────────────────────────────── */
export function Avatar({ name, src, size = 32, dark }) {
  return (
    <span className={`mf-avatar${dark ? ' mf-avatar--dark' : ''}`}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.36)) }} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  );
}

/* ── Segmented control ─────────────────────────────────────────────── */
export function Segmented({ options, value, onChange, ariaLabel, iconOnly }) {
  return (
    <div className={`mf-seg${iconOnly ? ' mf-seg--icon' : ''}`} role="tablist" aria-label={ariaLabel}>
      {options.map(({ value: v, label, Icon, count }) => (
        <button key={v} type="button" role="tab" aria-selected={value === v}
          className={`mf-seg__opt${value === v ? ' is-active' : ''}`}
          onClick={() => onChange(v)} title={iconOnly ? label : undefined}>
          {Icon && <Icon size={13} />}
          {iconOnly ? <span className="mf-sr-only">{label}</span> : label}
          {count != null && <span className="mf-seg__count">{count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── Underline tabs ────────────────────────────────────────────────── */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mf-tabs" role="tablist">
      {tabs.map(({ value: v, label, Icon, count }) => (
        <button key={v} type="button" role="tab" aria-selected={value === v}
          className={`mf-tab${value === v ? ' is-active' : ''}`} onClick={() => onChange(v)}>
          {Icon && <Icon size={14} />}
          {label}
          {count != null && <span className="mf-tab__count">{count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── Search field ──────────────────────────────────────────────────── */
export function SearchField({ value, onChange, placeholder = 'Search…', maxWidth, autoFocus }) {
  return (
    <div className="mf-search" style={maxWidth ? { maxWidth } : undefined}>
      <FiSearch size={14} className="mf-search__icon" />
      <input className="mf-input mf-search__input" type="search" value={value}
        placeholder={placeholder} aria-label={placeholder} autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)} />
      {value && (
        <button type="button" className="mf-search__clear" onClick={() => onChange('')} aria-label="Clear search">
          <FiX size={12} />
        </button>
      )}
    </div>
  );
}

/* ── Form field ────────────────────────────────────────────────────── */
export function Field({ label, required, hint, error, span, children }) {
  return (
    <label className={`mf-field${span ? ' mf-field--span' : ''}`}>
      <span className="mf-label">{label}{required && <span className="mf-req">*</span>}</span>
      {children}
      {error ? <span className="mf-error-text">{error}</span> : hint && <span className="mf-hint">{hint}</span>}
    </label>
  );
}

/* ── Stepper ───────────────────────────────────────────────────────── */
export function Stepper({ steps, current }) {
  return (
    <ol className="mf-stepper">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={s.key} className={`mf-stepper__step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="mf-stepper__idx">{state === 'done' ? <FiCheck size={13} /> : String(i + 1).padStart(2, '0')}</span>
            <span className="mf-stepper__text">
              <span className="mf-stepper__label">{s.label}</span>
              {s.hint && <span className="mf-stepper__hint">{s.hint}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Modal ─────────────────────────────────────────────────────────── */
export function Modal({ title, subtitle, eyebrow, size = 'md', onClose, footer, dismissible = true, children }) {
  useEffect(() => {
    if (!dismissible) return undefined;
    const onKey = e => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dismissible, onClose]);

  return (
    <ModalPortal>
      <div className="mf-overlay"
        onMouseDown={e => { if (dismissible && e.target === e.currentTarget) onClose?.(); }}>
        <div className={`mf-modal mf-modal--${size}`} role="dialog" aria-modal="true" aria-label={title}>
          <header className="mf-modal__head">
            <div>
              {eyebrow && <div className="mf-eyebrow">{eyebrow}</div>}
              <h2 className="mf-modal__title">{title}</h2>
              {subtitle && <p className="mf-modal__sub">{subtitle}</p>}
            </div>
            {onClose && (
              <button type="button" className="mf-icon-btn" onClick={onClose} aria-label="Close">
                <FiX size={15} />
              </button>
            )}
          </header>
          <div className="mf-modal__body">{children}</div>
          {footer && <footer className="mf-modal__foot">{footer}</footer>}
        </div>
      </div>
    </ModalPortal>
  );
}

/* ── Empty state ───────────────────────────────────────────────────── */
export function Empty({ Icon, title, message, action }) {
  return (
    <div className="mf-empty">
      {Icon && <span className="mf-empty__icon"><Icon size={18} /></span>}
      {title && <div className="mf-empty__title">{title}</div>}
      {message && <div>{message}</div>}
      {action}
    </div>
  );
}

/* ── Table skeleton ────────────────────────────────────────────────── */
export function TableSkeleton({ rows = 6, cols = 6 }) {
  return (
    <div className="skeleton-table-wrap" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-body-row" style={{ opacity: 1 - r * 0.12 }}>
          {Array.from({ length: cols }).map((__, c) => (
            <span key={c} className="skeleton" style={{ flex: c === 1 ? 2 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
