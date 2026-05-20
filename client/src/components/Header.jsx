import { useAuth } from '../context/AuthContext';
import { MdAdminPanelSettings, MdPerson } from 'react-icons/md';

export default function Header({ title, onMenuClick }) {
  const { user } = useAuth();

  return (
    <header className="header">
      <button className="header-menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <span /><span /><span />
      </button>
      <h1 className="header-title">{title}</h1>

      <div className="header-user">
        <div className="header-user-info">
          <span className="header-user-name">{user?.name}</span>
          <span className="header-user-role">{user?.role}</span>
        </div>
        <div className="header-avatar">
          {user?.role === 'admin'
            ? <MdAdminPanelSettings size={18} />
            : <MdPerson size={18} />
          }
        </div>
      </div>
    </header>
  );
}
