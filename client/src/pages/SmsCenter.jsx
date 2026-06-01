import { useState, useEffect, useCallback } from 'react';
import {
  FiMessageSquare, FiCheckCircle, FiAlertCircle, FiClock,
  FiSearch, FiFilter, FiRefreshCw, FiRotateCcw,
  FiBell, FiAlertTriangle, FiPhone, FiCalendar, FiZap,
} from 'react-icons/fi';
import api        from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';

/* ── Config ───────────────────────────────────────────────────────── */
const TYPE_CONFIG = {
  thank_you: { label: 'Shukrani',   cls: 'thank_you', Icon: FiMessageSquare },
  reminder:  { label: 'Kikumbusha', cls: 'reminder',  Icon: FiBell          },
  overdue:   { label: 'Imechelewa', cls: 'overdue',   Icon: FiAlertTriangle },
};

const FILTER_TABS = [
  { key: '', label: 'Zote' },
  { key: 'thank_you', label: 'Shukrani' },
  { key: 'reminder',  label: 'Kikumbusha' },
  { key: 'overdue',   label: 'Imechelewa' },
];

/* ── Sub-components ───────────────────────────────────────────────── */
function StatStrip({ stats, loading }) {
  const items = [
    { label: 'Jumla Zimetumwa', val: stats?.total     || 0, cls: 'total',  Icon: FiMessageSquare },
    { label: 'Zilifikia',       val: stats?.delivered || 0, cls: 'sent',   Icon: FiCheckCircle   },
    { label: 'Leo',             val: stats?.today_sent|| 0, cls: 'today',  Icon: FiZap           },
    { label: 'Zilishindwa',     val: stats?.failed    || 0, cls: 'failed', Icon: FiAlertCircle   },
  ];
  return (
    <div className="sms-stat-strip">
      {items.map(({ label, val, cls, Icon }) => (
        <div key={cls} className="sms-stat">
          <div className={`sms-stat-icon sms-stat-icon--${cls}`}><Icon size={18} /></div>
          <div className="sms-stat-body">
            <div className="sms-stat-val">{loading ? '…' : Number(val).toLocaleString()}</div>
            <div className="sms-stat-lbl">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || { label: type, cls: 'manual' };
  const Icon = cfg.Icon || FiMessageSquare;
  return (
    <span className={`sms-type-badge sms-type--${cfg.cls}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

function StatusDot({ status }) {
  const icon = status === 'sent'
    ? <FiCheckCircle size={12} />
    : status === 'failed'
    ? <FiAlertCircle size={12} />
    : <FiClock size={12} />;
  return (
    <span className={`sms-status-dot sms-status-dot--${status}`}>
      {icon} {status}
    </span>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */
export default function SmsCenter() {
  const { isAdmin }   = useAuth();
  const { showToast } = useToast();

  const [stats,     setStats]     = useState(null);
  const [logs,      setLogs]      = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [statsLoad, setStatsLoad] = useState(true);
  const [resending, setResending] = useState(null);
  const [expanded,  setExpanded]  = useState(null);

  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilt, setStatusFilt] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [page,       setPage]       = useState(0);
  const LIMIT = 25;

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/sms/stats');
      setStats(data);
    } catch { setStats(null); }
    finally { setStatsLoad(false); }
  }, []);

  const loadLogs = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: LIMIT, offset: p * LIMIT });
      if (typeFilter)  params.set('type',   typeFilter);
      if (statusFilt)  params.set('status', statusFilt);
      if (search)      params.set('search', search);
      const { data } = await api.get(`/sms/logs?${params}`);
      setLogs(data.logs  || []);
      setTotal(data.total || 0);
    } catch { setLogs([]); setTotal(0); }
    finally { setLoading(false); }
  }, [typeFilter, statusFilt, search]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(0); loadLogs(0); }, [typeFilter, statusFilt, search]);
  useEffect(() => { loadLogs(page); }, [page]);

  async function handleResend(id) {
    setResending(id);
    try {
      const { data } = await api.post(`/sms/resend/${id}`);
      if (data.success) {
        showToast('SMS imetumwa tena kwa mafanikio', 'success');
        loadLogs(page);
        loadStats();
      } else {
        showToast(data.error || data.message || 'Kutuma tena kumeshindwa', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Hitilafu ya mtandao', 'error');
    } finally { setResending(null); }
  }

  function refresh() { loadStats(); loadLogs(page); }

  const totalPages  = Math.ceil(total / LIMIT);
  const hasFilters  = typeFilter || statusFilt || search;

  return (
    <div className="page">

      {/* ── Page header ── */}
      <div className="page-top-bar" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">SMS Center</h1>
          <p className="page-subtitle">
            Tuma na angalia ujumbe wa SMS — {loading ? '…' : total.toLocaleString()} ujumbe
          </p>
        </div>
        <button className="btn btn--ghost" onClick={refresh}>
          <FiRefreshCw size={14} className={loading || statsLoad ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Stats ── */}
      <StatStrip stats={stats} loading={statsLoad} />

      {/* ── Type filter tabs ── */}
      <div className="filter-tabs" style={{ marginBottom: '1rem' }}>
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`filter-tab${typeFilter === key ? ' filter-tab--active' : ''}`}
            onClick={() => setTypeFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Search + filter bar ── */}
      <div className="page-toolbar">
        <div className="search-wrap">
          <FiSearch size={15} className="search-icon" />
          <input
            type="text"
            className="search-input--icon"
            placeholder="Tafuta kwa jina au nambari ya simu…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {hasFilters && (
            <button className="btn btn--ghost btn--sm"
              onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilt(''); setShowFilter(false); }}>
              Futa
            </button>
          )}
          <button
            className={`btn btn--ghost${showFilter ? ' btn--active' : ''}`}
            onClick={() => setShowFilter(v => !v)}
          >
            <FiFilter size={14} /> Chujua
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="filter-panel">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Hali ya Ujumbe</label>
            <select value={statusFilt} onChange={e => setStatusFilt(e.target.value)}>
              <option value="">Zote</option>
              <option value="sent">Zilifikia (sent)</option>
              <option value="failed">Zilishindwa (failed)</option>
              <option value="pending">Zinasubiri (pending)</option>
            </select>
          </div>
        </div>
      )}

      {/* ── History table ── */}
      <div className="card" style={{ marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Mteja</th>
                <th>Simu</th>
                <th>Aina</th>
                <th>Ujumbe</th>
                <th>Hali</th>
                <th>Tarehe</th>
                <th style={{ width: 56 }}>Tena</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--gray-400)' }}>
                    <FiRefreshCw size={18} className="spin" style={{ marginRight: '.5rem' }} />
                    Inapakia…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state" style={{ padding: '3rem' }}>
                      <FiMessageSquare size={36} style={{ color: 'var(--gray-200)' }} />
                      <p>{hasFilters ? 'Hakuna ujumbe unaofanana na utafutaji wako' : 'Hakuna ujumbe bado'}</p>
                      {hasFilters && (
                        <button className="btn btn--ghost btn--sm"
                          onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilt(''); }}>
                          Futa Vichujio
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : logs.map((log, i) => (
                <>
                  <tr
                    key={log.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  >
                    <td style={{ color: 'var(--gray-400)', fontSize: '.78rem' }}>
                      {page * LIMIT + i + 1}
                    </td>
                    <td>
                      <strong style={{ fontSize: '.875rem' }}>
                        {log.customer_name || <span style={{ color: 'var(--gray-400)' }}>—</span>}
                      </strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                        <FiPhone size={12} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
                        <code style={{ fontSize: '.78rem' }}>{log.phone}</code>
                      </div>
                    </td>
                    <td><TypeBadge type={log.message_type} /></td>
                    <td>
                      <span className="sms-msg-preview" title={log.message}>{log.message}</span>
                    </td>
                    <td><StatusDot status={log.status} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.78rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                        <FiCalendar size={12} />
                        {log.sent_at
                          ? String(log.sent_at).slice(0, 16).replace('T', ' ')
                          : log.created_at?.slice(0, 10) || '—'
                        }
                      </div>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {log.status === 'failed' && isAdmin && (
                        <button
                          className="icon-btn icon-btn--edit"
                          title="Tuma tena"
                          disabled={resending === log.id}
                          onClick={() => handleResend(log.id)}
                        >
                          {resending === log.id
                            ? <FiRefreshCw size={13} className="spin" />
                            : <FiRotateCcw size={13} />
                          }
                        </button>
                      )}
                      {log.status === 'sent' && (
                        <FiCheckCircle size={15} style={{ color: 'var(--primary)', marginLeft: '.2rem' }} />
                      )}
                    </td>
                  </tr>

                  {/* Expanded full message */}
                  {expanded === log.id && (
                    <tr key={`${log.id}-exp`} style={{ background: 'var(--surface-2)' }}>
                      <td colSpan={8} style={{ padding: '1rem 1.1rem 1.1rem' }}>
                        <div style={{ fontSize: '.72rem', color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>
                          Ujumbe Kamili
                        </div>
                        <div className="sms-confirm-bubble" style={{ maxWidth: '580px', fontSize: '.84rem' }}>
                          {log.message}
                        </div>
                        {log.error && (
                          <div className="alert alert--error" style={{ marginTop: '.75rem', fontSize: '.8rem', padding: '.6rem .9rem' }}>
                            Hitilafu: {log.error}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '.6rem' }}>
          <button
            className="btn btn--ghost btn--sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >← Nyuma</button>
          <span style={{ fontSize: '.82rem', color: 'var(--gray-500)', padding: '0 .4rem' }}>
            Ukurasa {page + 1} / {totalPages}
          </span>
          <button
            className="btn btn--ghost btn--sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >Mbele →</button>
        </div>
      )}
    </div>
  );
}
