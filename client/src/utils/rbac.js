/*
 * Role-based visibility for cumulative money figures.
 *
 * Business rule: only super admins may see absolute cumulative currency totals
 * (portfolio, outstanding, collected…). Staff keep every volume count, every
 * per-record amount (a single loan, a single receipt) and the Expenses sheet.
 *
 * This is a UI-layer rule. The API still returns the numbers, so it hides
 * figures from the screen — it is not a substitute for server-side redaction.
 */

/** Roles treated as "super admin". 'admin' is what this system stores today. */
export const TOTALS_ROLES = ['admin', 'super_admin', 'superadmin'];

/** Mask shown in place of a restricted amount. */
export const MASK = '•••••';

export const roleOf = user => String(user?.role ?? '').trim().toLowerCase();

/** True only for a confirmed super-admin role — unknown/missing users never unlock totals. */
export function canSeeMoneyTotals(user) {
  return TOTALS_ROLES.includes(roleOf(user));
}
