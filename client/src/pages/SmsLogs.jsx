import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiMessageSquare, FiSearch, FiFilter, FiRefreshCw,
  FiCheckCircle, FiAlertCircle, FiClock, FiRotateCcw,
  FiSend, FiArrowLeft,
} from 'react-icons/fi';
import api from '../api';
import { useToast } from '../hooks/useToast';

const TYPE_LABELS = {
  loan_approved:      'Loan Approved',
  repayment_recorded: 'Payment Recorded',
  repayment_reminder: 'Reminder',
  overdue_notice:     'Overdue Notice',
  manual:             'Manual',
};

const STATUS_ICON = {
  sent:    <FiCheckCircle size={13} />,
  failed:  <FiAlertCircle size={13} />,
  pending: <FiClock size={13} />,
};

function TypeBadge({ type }) {
  return (
    <span className={`sms-type-badge sms-type--${type}`}>
      {TYPE_LABELS[type] || type}
    </span>
  );
}

function StatusDot({ status }) {
  return (
    <span className={`sms-status-dot sms-status-dot--${status}`}>
      {STATUS_ICON[status]}
      {status}
    </span>
  );
}

export default function SmsLogs() {
  const navigate    = useNavigate();
  const { showToast } = useToast();

  const [logs,    setLogs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(null);

  const [filters, setFilters] = useState({ type: '', status: '', search: '' });
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  const loadLogs = useCallback(async (p = page) => {
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
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { loadLogs(0); setPage(0); }, [filters]);
  useEffect(() => { loadLogs(page); }, [page]);

  async function handleResend(id) {
    setResending(id);
    try {
      const { data } = await api.post(`/sms/resend/${id}`);
      if (data.success) {
        showToast('SMS resent successfully', 'success');
        loadLogs(page);
      } else {
        showToast(data.error || 'Resend failed', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Resend failed', 'error');
    } finally {
      setResending(null);
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="page">
      <div className="page-top-bar">
        <div>
          <h1 className="page-title">SMS Logs</h1>
          <p className="page-subtitle">
            {total.toLocaleString()} total message{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.6rem' }}>
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
            placeholder="Search by customer or phone…"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>
        <button
          className={`btn btn--ghost${showFilter ? ' btn--active' : ''}`}
          onClick={() => setShowFilter(v => !v)}
        >
          <FiFilter size={14} /> Filter
        </button>
      </div>

      {showFilter && (
        <div className="filter-panel">
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Message Type</label>
              <select
                value={filters.type}
                onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
              >
                <option value="">All types</option>
                <option value="loan_approved">Loan Approved</option>
                <option value="repayment_recorded">Payment Recorded</option>
                <option value="repayment_reminder">Reminder</option>
                <option value="overdue_notice">Overdue Notice</option>
                <option value="manual">Manual</option>
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
          {(filters.type || filters.status) && (
            <button
              className="btn btn--ghost btn--sm"
              style={{ marginTop: '.75rem' }}
              onClick={() => setFilters({ type: '', status: '', search: '' })}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* ── Logs Table ── */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Recipient</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Message</th>
                <th>Status</th>
                <th>Sent At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
                    <FiRefreshCw size={16} className="spin" /> Loading…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <FiMessageSquare size={32} />
                      <p>No SMS records found</p>
                    </div>
                  </td>
                </tr>
              ) : logs.map((log, i) => (
                <tr key={log.id}>
                  <td>
                    <span style={{ color: 'var(--gray-400)', fontSize: '.78rem' }}>
                      {page * LIMIT + i + 1}
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontSize: '.875rem' }}>
                      {log.customer_name || '—'}
                    </strong>
                  </td>
                  <td>
                    <code style={{ fontSize: '.78rem' }}>{log.phone}</code>
                  </td>
                  <td><TypeBadge type={log.message_type} /></td>
                  <td>
                    <span className="sms-msg-preview" title={log.message}>
                      {log.message}
                    </span>
                  </td>
                  <td><StatusDot status={log.status} /></td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '.8rem', color: 'var(--gray-500)' }}>
                    {log.sent_at
                      ? String(log.sent_at).slice(0, 16).replace('T', ' ')
                      : log.created_at?.slice(0, 10)
                    }
                  </td>
                  <td>
                    {log.status === 'failed' && (
                      <button
                        className="icon-btn icon-btn--edit"
                        title="Resend SMS"
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
                      <FiCheckCircle size={14} style={{ color: 'var(--primary)', marginLeft: '.25rem' }} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '.5rem' }}>
          <button
            className="btn btn--ghost btn--sm"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '.82rem', color: 'var(--gray-500)', padding: '0 .5rem' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="btn btn--ghost btn--sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
