import { FiLock } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { canSeeMoneyTotals, MASK } from '../../utils/rbac';
import { Bi } from '../ui';
import { t } from '../../i18n/bilingual';

/*
 * Guards for cumulative money figures (see utils/rbac.js).
 *
 * Every hook/component here is safe while the session is still mounting:
 * a missing context or a half-loaded user simply means "not a super admin",
 * so the screen renders masked instead of crashing or flashing real totals.
 */

/** True when the signed-in user may see cumulative currency totals. */
export function useCanSeeTotals() {
  const auth = useAuth();                 // null if rendered outside AuthProvider
  return canSeeMoneyTotals(auth?.user);
}

const hiddenLabel = () => {
  const label = t('rbac.hidden');
  return `${label.en} · ${label.sw}`;
};

/** Mask shown in place of a restricted amount. */
export function Mask({ compact = false }) {
  const label = hiddenLabel();
  return (
    <span className={`mf-mask${compact ? ' mf-mask--sm' : ''}`} role="img" aria-label={label} title={label}>
      {MASK}
    </span>
  );
}

/**
 * One cumulative amount: the real figure for super admins, a mask for everyone else.
 * `children` (or `value`) is only evaluated into the DOM when allowed.
 */
export function Total({ value, children, compact = false }) {
  const allowed = useCanSeeTotals();
  if (!allowed) return <Mask compact={compact} />;
  return <>{children ?? value}</>;
}

/** Renders `children` only for super admins; `fallback` otherwise. */
export function TotalsOnly({ children, fallback = null }) {
  return useCanSeeTotals() ? <>{children}</> : <>{fallback}</>;
}

/** Formatter for chart tooltips so restricted roles never get amounts in `title`. */
export const maskedFormat = () => MASK;

/** Placeholder for a whole panel whose content is nothing but cumulative money. */
export function RestrictedPanel({ height = 240 }) {
  return (
    <div className="mf-restricted" style={{ minHeight: height }} role="note">
      <span className="mf-restricted__icon" aria-hidden="true"><FiLock size={18} /></span>
      <strong className="mf-restricted__title"><Bi text={t('rbac.restricted')} block /></strong>
      <span className="mf-restricted__note"><Bi text={t('rbac.restrictedNote')} block /></span>
    </div>
  );
}
