import { useNavigate } from 'react-router-dom';

export default function StatCard({ label, value, sub, color, Icon, to }) {
  const navigate = useNavigate();
  return (
    <div
      className={`stat-card stat-card--${color}${to ? ' stat-card--link' : ''}`}
      onClick={to ? () => navigate(to) : undefined}
      role={to ? 'button' : undefined}
      tabIndex={to ? 0 : undefined}
    >
      <div className="stat-card-inner">
        <div className="stat-card-text">
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
          {sub && <div className="stat-sub">{sub}</div>}
        </div>
        {Icon && <div className="stat-icon-wrap"><Icon size={32} /></div>}
      </div>
    </div>
  );
}
