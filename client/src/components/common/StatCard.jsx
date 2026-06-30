import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

function AnimatedNumber({ value }) {
  const ref = useRef(null);
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, v => Math.round(v).toLocaleString());

  useEffect(() => {
    const num = typeof value === 'number' ? value : 0;
    const ctrl = animate(motionVal, num, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    });
    return ctrl.stop;
  }, [value, motionVal]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

export default function StatCard({ label, value, sub, color, Icon, to, variants }) {
  const navigate = useNavigate();
  const isNumeric = typeof value === 'number';

  return (
    <motion.div
      className={`stat-card stat-card--${color}${to ? ' stat-card--link' : ''}`}
      variants={variants}
      onClick={to ? () => navigate(to) : undefined}
      role={to ? 'button' : undefined}
      tabIndex={to ? 0 : undefined}
      whileHover={to ? {
        y: -5,
        boxShadow: '0 16px 48px rgba(18,52,88,.18)',
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
        {Icon && <div className="stat-icon-wrap"><Icon size={32} /></div>}
      </div>
    </motion.div>
  );
}
