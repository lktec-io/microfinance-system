import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';
import { FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import { Mask } from '../common/MoneyGuard';

/**
 * Counts up to `value` once, then tracks it exactly.
 * Honours prefers-reduced-motion and never shows a half-counted figure
 * after the animation ends.
 */
export function CountUp({ value = 0, format = v => Math.round(v).toLocaleString() }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, v => format(v));
  const started = useRef(false);

  useEffect(() => {
    const target = Number(value) || 0;
    if (reduce || started.current) { mv.set(target); started.current = true; return undefined; }
    started.current = true;
    const ctrl = animate(mv, target, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    return ctrl.stop;
  }, [value, mv, reduce]);

  return <motion.span>{text}</motion.span>;
}

/**
 * One dashboard statistic.
 *
 * No borders: the tile is separated by surface, spacing and a soft elevation.
 * `masked` renders the RBAC mask instead of the figure, so a restricted role
 * never has the number in the DOM.
 */
export default function StatTile({
  label, value, unit, sub, Icon, tone = 'slate', to, onClick,
  masked = false, count = false, format, delta, meter,
}) {
  const [hovered, setHovered] = useState(false);
  const interactive = !!(to || onClick);
  const fmtValue = format || (count ? v => Math.round(v).toLocaleString() : undefined);

  return (
    <motion.div
      className={`mf-tile mf-tile--${tone}${interactive ? ' is-interactive' : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={interactive ? { y: -3 } : undefined}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
    >
      <div className="mf-tile__top">
        <span className="mf-tile__label">{label}</span>
        {Icon && (
          <motion.span className="mf-tile__icon" animate={{ scale: hovered && interactive ? 1.08 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 24 }}>
            <Icon size={15} />
          </motion.span>
        )}
      </div>

      <div className="mf-tile__value">
        {masked ? <Mask /> : (
          <>
            {unit && <span className="mf-tile__unit">{unit}</span>}
            <CountUp value={Number(value) || 0} format={fmtValue} />
          </>
        )}
      </div>

      {(sub || delta) && (
        <div className="mf-tile__foot">
          {delta && !masked && delta.pct != null && delta.dir !== 'flat' && (
            <span className={`mf-tile__delta is-${delta.dir}`}>
              {delta.dir === 'up' ? <FiArrowUpRight size={11} /> : <FiArrowDownRight size={11} />}
              {Math.abs(delta.pct)}%
            </span>
          )}
          {sub && <span className="mf-tile__sub">{sub}</span>}
        </div>
      )}

      {meter != null && !masked && (
        <div className="mf-tile__meter" role="presentation">
          <motion.span className="mf-tile__meter-fill"
            initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, meter))}%` }}
            transition={{ duration: .9, delay: .2, ease: [0.16, 1, 0.3, 1] }} />
        </div>
      )}
    </motion.div>
  );
}
