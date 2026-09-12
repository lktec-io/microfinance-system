const STATUS_COLOR = {
  pending: 'yellow',
  active:  'orange',
  paid:    'green',
  overdue: 'red',
};

export default function StatusBadge({ status, large = false }) {
  const color = STATUS_COLOR[status] || 'gray';
  return (
    <span className={`badge badge--${color} badge--dot${large ? ' badge--lg' : ''}`}>
      {status}
    </span>
  );
}
