export default function Header({ title, onMenuClick }) {
  return (
    <header className="header">
      <button className="header-menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <span /><span /><span />
      </button>
      <h1 className="header-title">{title}</h1>
    </header>
  );
}
