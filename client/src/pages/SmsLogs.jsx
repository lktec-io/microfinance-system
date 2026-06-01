import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiMessageSquare, FiSearch, FiFilter, FiRefreshCw,
  FiCheckCircle, FiAlertCircle, FiClock, FiRotateCcw,
  FiArrowLeft, FiBell, FiCalendar, FiPhone,
} from 'react-icons/fi';
import api from '../api';
import { useToast } from '../hooks/useToast';

const TYPE_CONFIG = {
  thank_you:          { label: 'Thank You SMS',    cls: 'thank_you',  Icon: FiMessageSquare },
  reminder:           { label: 'Reminder SMS',     cls: 'reminder',   Icon: FiBell          },
  manual:             { label: 'Manual',           cls: 'manual',     Icon: FiMessageSquare },
  repayment_reminder: { label: 'Auto Reminder',    cls: 'reminder',   Icon: FiBell          },
  overdue_notice:     { label: 'Overdue Notice',   cls: 'overdue_notice', Icon: FiAlertCircle },
};

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || { label: type, cls: 'manual' };
  const Icon = cfg.Icon || FiMessageSquare;
  return (
    <span className={`sms-type-badge sms-type--${cfg.cls}`}>
      <Icon size={11} /> {cfg.label}
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

export default function SmsHistory() {
  const navigate      = useNavigate();
  const { showToast } = useToast();

  const [logs,      setLogs]      = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [resending, setResending] = useState(null);
  const [expanded,  setExpanded]  = useState(null);

  const [filters,     setFilters]     = useState({ type: '', status: '', search: '' });
  const [showFilter,  setShowFilter]  = useState(false);
  const [page,        setPage]        = useState(0);
  const LIMIT = 25;

  const loadLogs = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit:  LIMIT,
        offset: p * LIMIT,
        ...(filters.type   && { type:   filters.type   }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });
      const { data } = await api.get(`/sms/logs?${params}`);
      setLogs(data.logs  || []);
      setTotal(data.total || 0);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { setPage(0); loadLogs(0); }, [filters]);
  useEffect(() => { loadLogs(page); }, [page]);

  async function handleResend(id) {
    setResending(id);
    try {
      const { data } = await api.post(`/sms/resend/${id}`);
      if (data.success) {
        showToast('SMS resent successfully', 'success');
        loadLogs(page);
      } else {
        showToast(data.error || data.message || 'Resend failed', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Resend failed', 'error');
    } finally {
      setResending(null);
    }
  }

  function clearFilters() {
    setFilters({ type: '', status: '', search: '' });
    setShowFilter(false);
  }

  const totalPages    = Math.ceil(total / LIMIT);
  const hasFilters    = filters.type || filters.status || filters.search;

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-top-bar" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">SMS History</h1>
          <p className="page-subtitle">
            {loading ? '…' : total.toLocaleString()} message{total !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <button className="btn btn--ghost" onClick={() => navigate('/sms')}>
            <FiArrowLeft size={14} /> SMS Center
          </button>
          <button className="btn btn--ghost" onClick={() => loadLogs(page)}>
            <FiRefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="page-toolbar">
        <div className="search-wrap">
          <FiSearch size={15} className="search-icon" />
          <input
            type="text"
            className="search-input--icon"
            placeholder="Search by customer name or phone…"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {hasFilters && (
            <button className="btn btn--ghost btn--sm" onClick={clearFilters}>
              Clear
            </button>
          )}
          <button
            className={`btn btn--ghost${showFilter ? ' btn--active' : ''}`}
            onClick={() => setShowFilter(v => !v)}
          >
            <FiFilter size={14} /> Filter
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="filter-panel">
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>SMS Type</label>
              <select
                value={filters.type}
                onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
              >
                <option value="">All types</option>
                <option value="thank_you">Thank You SMS</option>
                <option value="reminder">Reminder SMS</option>
                <option value="manual">Manual</option>
                <option value="repayment_reminder">Auto Reminder</option>
                <option value="overdue_notice">Overdue Notice</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Status</label>
              <select
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              >
                <option value="">All statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Logs Table ── */}
      <div className="card" style={{ marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Message</th>
                <th>Status</th>
                <th>Date &amp; Time</th>
                <th style={{ width: '56px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--gray-400)' }}>
                    <FiRefreshCw size={18} className="spin" style={{ marginRight: '.5rem' }} />
                    Loading messages…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state" style={{ padding: '3rem' }}>
                      <FiMessageSquare size={36} style={{ color: 'var(--gray-200)' }} />
                      <p>{hasFilters ? 'No messages match your filters' : 'No SMS messages recorded yet'}</p>
                      {hasFilters && (
                        <button className="btn btn--ghost btn--sm" onClick={clearFilters}>
                          Clear Filters
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
                        <FiPhone size={12} style={{ color: 'var(--gray-400)' }} />
                        <code style={{ fontSize: '.78rem' }}>{log.phone}</code>
                      </div>
                    </td>
                    <td><TypeBadge type={log.message_type} /></td>
                    <td>
                      <span className="sms-msg-preview" title={log.message}>
                        {log.message}
                      </span>
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
                      {log.status === 'failed' && (
                        <button
                          className="icon-btn icon-btn--edit"
                          title="Retry sending"
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

                  {/* Expanded message row */}
                  {expanded === log.id && (
                    <tr key={`${log.id}-exp`} style={{ background: 'var(--surface-2)' }}>
                      <td colSpan={8} style={{ padding: '1rem 1.1rem 1.1rem' }}>
                        <div style={{ fontSize: '.76rem', color: 'var(--gray-500)', marginBottom: '.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                          Full Message
                        </div>
                        <div className="sms-confirm-bubble" style={{ maxWidth: '560px', fontSize: '.84rem' }}>
                          {log.message}
                        </div>
                        {log.error && (
                          <div className="alert alert--error" style={{ marginTop: '.75rem', fontSize: '.8rem', padding: '.6rem .9rem' }}>
                            Error: {log.error}
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
          >← Prev</button>
          <span style={{ fontSize: '.82rem', color: 'var(--gray-500)', padding: '0 .4rem' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="btn btn--ghost btn--sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >Next →</button>
        </div>
      )}
    </div>
  );
}
