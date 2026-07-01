import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect } from 'react';

function AnimatedNumber({ value }) {
  const mv = useMotionValue(0);
  const disp = useTransform(mv, v => Math.round(v).toLocaleString());

  useEffect(() => {
    const n = typeof value === 'number' ? value : 0;
    const ctrl = animate(mv, n, { duration: 1.3, ease: [0.16, 1, 0.3, 1] });
    return ctrl.stop;
  }, [value, mv]);

  return <motion.span>{disp}</motion.span>;
}

const HOVER_SHADOWS = {
  blue:   '0 18px 48px rgba(15,23,42,.22)',
  green:  '0 18px 48px rgba(22,163,74,.22)',
  teal:   '0 18px 48px rgba(13,148,136,.22)',
  red:    '0 18px 48px rgba(239,68,68,.22)',
  yellow: '0 18px 48px rgba(245,158,11,.22)',
  orange: '0 18px 48px rgba(249,115,22,.22)',
};

export default function StatCard({ label, value, sub, color = 'blue', Icon, to, variants }) {
  const navigate  = useNavigate();
  const isNumeric = typeof value === 'number';

  return (
    <motion.div
      className={`stat-card stat-card--${color}${to ? ' stat-card--link' : ''}`}
      variants={variants}
      onClick={to ? () => navigate(to) : undefined}
      role={to ? 'button' : undefined}
      tabIndex={to ? 0 : undefined}
      whileHover={to ? {
        y: -6,
        boxShadow: HOVER_SHADOWS[color] || HOVER_SHADOWS.blue,
        transition: { type: 'spring', stiffness: 340, damping: 26 },
      } : {}}
      whileTap={to ? { scale: 0.98 } : {}}
    >
      <div className="stat-card-inner">
        <div className="stat-card-text">
          <div className="stat-value">
            {isNumeric ? <AnimatedNumber value={value} /> : value}
          </div>
          <div className="stat-label">{label}</div>
          {sub && <div className="stat-sub">{sub}</div>}
        </div>
        {Icon && <div className="stat-icon-wrap"><Icon size={30} /></div>}
      </div>
    </motion.div>
  );
}
