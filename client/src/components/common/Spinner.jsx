export default function Spinner({ text = 'Loading…' }) {
  return (
    <div className="page-loader">
      <div className="spinner" />
      <span>{text}</span>
    </div>
  );
}
