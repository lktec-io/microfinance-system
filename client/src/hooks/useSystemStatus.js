import { useEffect, useState } from 'react';
import api from '../api';

const SLOW_MS = 1500;

/**
 * Polls the existing public GET /api/health endpoint to drive the header's
 * system-status indicator: operational · degraded · offline.
 */
export function useSystemStatus(intervalMs = 60_000) {
  const [state, setState] = useState({ status: 'checking', latency: null, checkedAt: null });

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (!navigator.onLine) {
        setState({ status: 'offline', latency: null, checkedAt: Date.now() });
        return;
      }
      const t0 = performance.now();
      try {
        const { data } = await api.get('/health', { timeout: 8000 });
        if (cancelled) return;
        const latency = Math.round(performance.now() - t0);
        const healthy = data?.status === 'ok';
        setState({
          status: !healthy ? 'degraded' : latency > SLOW_MS ? 'degraded' : 'operational',
          latency,
          checkedAt: Date.now(),
        });
      } catch {
        if (!cancelled) setState({ status: 'offline', latency: null, checkedAt: Date.now() });
      }
    }

    ping();
    const id = setInterval(ping, intervalMs);
    window.addEventListener('online', ping);
    window.addEventListener('offline', ping);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('online', ping);
      window.removeEventListener('offline', ping);
    };
  }, [intervalMs]);

  return state;
}
