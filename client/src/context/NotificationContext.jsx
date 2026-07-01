import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../api';

const NotifCtx = createContext(null);
const DISMISSED_KEY = 'mf_notif_dismissed_v2';
const READ_KEY      = 'mf_notif_read_v2';

function getLS(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function setLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)    return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function NotificationProvider({ children }) {
  const [notifs,  setNotifs]  = useState([]);
  const [readSet, setReadSet] = useState(() => new Set(getLS(READ_KEY)));
  const dismissedRef = useRef(new Set(getLS(DISMISSED_KEY)));

  const fetchNotifs = useCallback(async () => {
    try {
      const [sumRes, recRes] = await Promise.allSettled([
        api.get('/reports/summary'),
        api.get('/reports/recent'),
      ]);

      const items = [];
      const now   = Date.now();

      if (sumRes.status === 'fulfilled') {
        const d = sumRes.value.data ?? {};

        if ((d.overdue_loans || 0) > 0) {
          items.push({
            id: 'overdue',
            type: 'danger',
            title: 'Overdue Loans',
            desc: `${d.overdue_loans} loan${d.overdue_loans !== 1 ? 's' : ''} require immediate attention`,
            ts: now - 300_000,
          });
        }
        if ((d.loan_status?.pending || 0) > 0) {
          items.push({
            id: 'pending',
            type: 'warning',
            title: 'Pending Loans',
            desc: `${d.loan_status.pending} loan${d.loan_status.pending !== 1 ? 's' : ''} awaiting approval`,
            ts: now - 1_800_000,
          });
        }
        if ((d.active_loans || 0) > 0) {
          items.push({
            id: 'active',
            type: 'info',
            title: 'Active Loans',
            desc: `${d.active_loans} loan${d.active_loans !== 1 ? 's' : ''} currently disbursed`,
            ts: now - 3_600_000,
          });
        }
        if ((d.customers || 0) > 0) {
          items.push({
            id: 'customers-total',
            type: 'success',
            title: 'Customer Base',
            desc: `${d.customers} registered customer${d.customers !== 1 ? 's' : ''} in the system`,
            ts: now - 7_200_000,
          });
        }
      }

      if (recRes.status === 'fulfilled') {
        const r = recRes.value.data ?? {};
        if (r.repayments?.[0]) {
          const rep = r.repayments[0];
          items.push({
            id: `rep-${rep.id || now}`,
            type: 'payment',
            title: 'Payment Received',
            desc: `${rep.customer_name || 'A customer'} made a repayment`,
            ts: rep.paid_at ? new Date(rep.paid_at).getTime() : now - 600_000,
          });
        }
        if (r.customers?.[0]) {
          const c = r.customers[0];
          items.push({
            id: `cust-${c.id || now}`,
            type: 'customer',
            title: 'New Customer',
            desc: `${c.full_name || 'New customer'} has been registered`,
            ts: c.created_at ? new Date(c.created_at).getTime() : now - 900_000,
          });
        }
      }

      const filtered = items
        .filter(n => !dismissedRef.current.has(n.id))
        .sort((a, b) => b.ts - a.ts);

      setNotifs(filtered);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const onFocus = () => fetchNotifs();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchNotifs]);

  const markRead = useCallback((id) => {
    setReadSet(prev => {
      const next = new Set([...prev, id]);
      setLS(READ_KEY, [...next]);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadSet(prev => {
      const next = new Set([...prev, ...notifs.map(n => n.id)]);
      setLS(READ_KEY, [...next]);
      return next;
    });
  }, [notifs]);

  const remove = useCallback((id) => {
    dismissedRef.current.add(id);
    setLS(DISMISSED_KEY, [...dismissedRef.current]);
    setNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  const removeAll = useCallback(() => {
    notifs.forEach(n => dismissedRef.current.add(n.id));
    setLS(DISMISSED_KEY, [...dismissedRef.current]);
    setNotifs([]);
  }, [notifs]);

  const enriched = useMemo(
    () => notifs.map(n => ({ ...n, read: readSet.has(n.id), timeAgo: timeAgo(n.ts) })),
    [notifs, readSet]
  );

  const unread = useMemo(() => enriched.filter(n => !n.read).length, [enriched]);

  return (
    <NotifCtx.Provider value={{ notifs: enriched, unread, markRead, markAllRead, remove, removeAll, refresh: fetchNotifs }}>
      {children}
    </NotifCtx.Provider>
  );
}

export function useNotifications() { return useContext(NotifCtx); }
