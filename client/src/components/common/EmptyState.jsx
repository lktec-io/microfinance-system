export default function EmptyState({ icon: Icon, message, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={40} style={{ color: 'var(--gray-200)' }} />}
      <p>{message}</p>
      {action}
    </div>
  );
}
