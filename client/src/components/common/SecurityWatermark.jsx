import { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';

function escXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function SecurityWatermark() {
  const { user } = useAuth();

  const bgImage = useMemo(() => {
    if (!user) return 'none';

    const name = escXml((user.name || 'User').toUpperCase());
    const role = escXml((user.role || '').toUpperCase());
    const date = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="160">
      <g transform="rotate(-30 180 80)">
        <text x="180" y="66"
          text-anchor="middle" dominant-baseline="middle"
          font-family="system-ui,-apple-system,sans-serif" font-size="11" font-weight="600"
          fill="rgba(15,23,42,0.065)" letter-spacing="1.5">${name}</text>
        <text x="180" y="84"
          text-anchor="middle" dominant-baseline="middle"
          font-family="system-ui,-apple-system,sans-serif" font-size="9" font-weight="400"
          fill="rgba(15,23,42,0.05)" letter-spacing="0.8">${role} • ${escXml(date)}</text>
      </g>
    </svg>`;

    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [user]);

  if (!user) return null;

  return (
    <div
      aria-hidden="true"
      className="security-watermark"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9990,
        backgroundImage: bgImage,
        backgroundRepeat: 'repeat',
        backgroundSize: '360px 160px',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    />
  );
}
