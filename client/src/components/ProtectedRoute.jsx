import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard.
 * - Signed out → /login.
 * - `adminOnly` and the user is not an admin (e.g. staff typing /reports) →
 *   the page is never rendered (its code is not even loaded) and the user is
 *   sent to the Dashboard, which shows the "no permission" alert.
 *
 * The API enforces the same rule with 403, so this guard is UX, not the only lock.
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace state={{ accessDenied: location.pathname }} />;
  }
  return children;
}
