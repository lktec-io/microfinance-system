import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, sub, color, Icon, to, variants }) {
  const navigate = useNavigate();
  return (
    <motion.div
      className={`stat-card stat-card--${color}${to ? ' stat-card--link' : ''}`}
      variants={variants}
      onClick={to ? () => navigate(to) : undefined}
      role={to ? 'button' : undefined}
      tabIndex={to ? 0 : undefined}
      whileHover={to ? {
        y: -5,
        boxShadow: '0 16px 48px rgba(0,0,0,.65)',
        transition: { type: 'spring', stiffness: 340, damping: 26 },
      } : {}}
      whileTap={to ? { scale: 0.98 } : {}}
    >
      <div className="stat-card-inner">
        <div className="stat-card-text">
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
          {sub && <div className="stat-sub">{sub}</div>}
        </div>
        {Icon && <div className="stat-icon-wrap"><Icon size={32} /></div>}
      </div>
    </motion.div>
  );
}
