import api from './index';

export const RESET_CONFIRM_PHRASE = 'DELETE';

/**
 * Permanently delete all business data (customers, loans, repayments,
 * expenses, SMS logs). User accounts are kept. Admin-only on the server.
 *
 * @param {{ confirm: string, password: string }} payload
 *   confirm  — the phrase the admin typed; the server requires exactly "DELETE"
 *   password — the signed-in admin's current password, re-verified server-side
 */
export async function requestSystemReset({ confirm, password }) {
  const { data } = await api.post('/admin/system-reset', { confirm, password });
  return data;
}
