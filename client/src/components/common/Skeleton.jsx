const COL_SIZES = ['xs', 'lg', 'md', 'md', 'sm', 'sm', 'sm'];

export default function Skeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="skeleton-table-wrap">
      <div className="skeleton-thead-row">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`skeleton skeleton-th skeleton-th--${COL_SIZES[i] || 'md'}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-body-row" style={{ opacity: 1 - i * 0.1 }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={`skeleton skeleton-td skeleton-td--${COL_SIZES[j] || 'md'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-stat-card">
          <div className="skeleton sk-val" />
          <div className="skeleton sk-lbl" />
          <div className="skeleton sk-sub" />
        </div>
      ))}
    </div>
  );
}
