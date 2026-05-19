const STATUS_COLOR = {
  pending: 'yellow',
  active:  'blue',
  paid:    'green',
  overdue: 'red',
};

export default function StatusBadge({ status, large = false }) {
  const color = STATUS_COLOR[status] || 'gray';
  return (
    <span className={`badge badge--${color}${large ? ' badge--lg' : ''}`}>
      {status}
    </span>
  );
}
