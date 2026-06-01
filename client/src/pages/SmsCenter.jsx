import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiMessageSquare, FiSend, FiUsers, FiCheckCircle,
  FiAlertCircle, FiClock, FiList, FiZap, FiInfo,
} from 'react-icons/fi';
import api from '../api';
import { useToast } from '../hooks/useToast';

const MAX_CHARS = 320;

const TEMPLATES = [
  {
    key: 'thank_you',
    name: 'Thank You SMS',
    icon: FiCheckCircle,
    cls: 'approved',
    text: 'Habari, [JINA],\n\nBaraka Microcredit tunakushukuru kwa kuchagua huduma zetu.\n\nMkopo wako wa TZS [KIASI] umeidhinishwa na kutolewa kikamilifu.\n\nKiasi cha kurejesha ni TZS [JUMLA] kabla ya tarehe [TAREHE].\n\nTunakutakia mafanikio katika matumizi ya mkopo huu.\n\nBaraka Microcredit',
  },
  {
    key: 'reminder',
    name: 'Reminder SMS',
    icon: FiClock,
    cls: 'reminder',
    text: 'Habari, [JINA],\n\nTunapenda kukukumbusha kuwa una salio la mkopo la TZS [SALIO].\n\nTafadhali hakikisha unakamilisha malipo yako kabla ya tarehe [TAREHE].\n\nKwa maelezo zaidi wasiliana na Baraka Microcredit.\n\nAsante.',
  },
  {
    key: 'overdue',
    name: 'Overdue Notice',
    icon: FiAlertCircle,
    cls: 'overdue',
    text: 'Habari, [JINA],\n\nMkopo wako wa TZS [SALIO] ulikuwa unadaiwa tarehe [TAREHE] na sasa umechelewa.\n\nTafadhali wasiliana nasi mara moja kuzuia hatua zaidi.\n\nBaraka Microcredit',
  },
];

function SmsStatStrip({ stats, loading }) {
  const items = [
    { label: 'Total Sent',    val: stats?.total     || 0, cls: 'total',  Icon: FiMessageSquare },
    { label: 'Delivered',     val: stats?.delivered || 0, cls: 'sent',   Icon: FiCheckCircle   },
    { label: 'Sent Today',    val: stats?.today_sent || 0, cls: 'today', Icon: FiZap           },
    { label: 'Failed',        val: stats?.failed    || 0, cls: 'failed', Icon: FiAlertCircle   },
  ];
  return (
    <div className="sms-stat-strip">
      {items.map(({ label, val, cls, Icon }) => (
        <div key={cls} className="sms-stat">
          <div className={`sms-stat-icon sms-stat-icon--${cls}`}>
            <Icon size={18} />
          </div>
          <div className="sms-stat-body">
            <div className="sms-stat-val">{loading ? '…' : val}</div>
            <div className="sms-stat-lbl">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SmsCenter() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stats,     setStats]     = useState(null);
  const [customers, setCustomers] = useState([]);
  const [recent,    setRecent]    = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const [form, setForm] = useState({ customer_id: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [phoneManual, setPhoneManual] = useState(false);

  const load = useCallback(async () => {
    const [s, c, r] = await Promise.all([
      api.get('/sms/stats'),
      api.get('/sms/customers'),
      api.get('/sms/logs?limit=6'),
    ]);
    setStats(s.data);
    setCustomers(c.data);
    setRecent(r.data.logs || []);
    setStatsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleCustomerChange(e) {
    const id = e.target.value;
    const customer = customers.find(c => String(c.id) === id);
    setForm(f => ({
      ...f,
      customer_id: id,
      phone: customer ? customer.phone : '',
    }));
    setPhoneManual(!customer);
  }

  function applyTemplate(text) {
    setForm(f => ({ ...f, message: text }));
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!form.phone.trim())   return showToast('Phone number required', 'error');
    if (!form.message.trim()) return showToast('Message required', 'error');
    if (form.message.length > MAX_CHARS) return showToast(`Message too long (max ${MAX_CHARS} chars)`, 'error');

    setSending(true);
    try {
      const res = await api.post('/sms/send', {
        phone:       form.phone.trim(),
        message:     form.message.trim(),
        customer_id: form.customer_id || null,
      });
      if (res.data.success) {
        showToast('SMS sent successfully', 'success');
        setForm(f => ({ ...f, message: '' }));
        load();
      } else {
        showToast(res.data.error || 'SMS delivery failed — check logs', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send SMS', 'error');
    } finally {
      setSending(false);
    }
  }

  const charCount = form.message.length;
  const charCls   = charCount > MAX_CHARS ? 'sms-char-counter--over'
                  : charCount > MAX_CHARS * 0.85 ? 'sms-char-counter--warn'
                  : '';

  const beemConfigured = true; // server-side check; UI shows warning if needed

  return (
    <div className="page">
      <div className="page-top-bar">
        <div>
          <h1 className="page-title">SMS Center</h1>
          <p className="page-subtitle">Send and manage SMS notifications</p>
        </div>
        <button className="btn btn--ghost" onClick={() => navigate('/sms/logs')}>
          <FiList size={15} /> View Logs
        </button>
      </div>

      <SmsStatStrip stats={stats} loading={statsLoading} />

      <div className="sms-center-grid">

        {/* ── Compose Panel ── */}
        <div className="sms-compose-card">
          <div className="sms-compose-header">
            <div className="sms-compose-header-icon">
              <FiSend size={17} />
            </div>
            <h2>Compose Message</h2>
          </div>

          <div className="sms-compose-body">
            <form onSubmit={handleSend}>
              {/* Customer selector */}
              <div className="form-group">
                <label htmlFor="sms-customer">
                  <FiUsers size={11} /> Recipient
                </label>
                <select
                  id="sms-customer"
                  value={form.customer_id}
                  onChange={handleCustomerChange}
                >
                  <option value="">— Select customer (optional) —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} — {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div className="form-group">
                <label htmlFor="sms-phone">Phone Number</label>
                <input
                  id="sms-phone"
                  type="tel"
                  required
                  placeholder="e.g. 0712345678 or 255712345678"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>

              {/* Message */}
              <div className="form-group">
                <label htmlFor="sms-message">Message</label>
                <div className="sms-textarea-wrap">
                  <textarea
                    id="sms-message"
                    required
                    placeholder="Type your message here…"
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  />
                  <span className={`sms-char-counter ${charCls}`}>
                    {charCount}/{MAX_CHARS}
                  </span>
                </div>
                {form.message && (
                  <div className="sms-preview-bubble">{form.message}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--block"
                disabled={sending || charCount > MAX_CHARS || !form.phone || !form.message}
              >
                {sending
                  ? <><span className="login-spinner" /> Sending…</>
                  : <><FiSend size={14} /> Send SMS</>
                }
              </button>
            </form>
          </div>
        </div>

        {/* ── Right column: Templates + Recent Activity ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Templates */}
          <div className="sms-templates-card card" style={{ marginBottom: 0 }}>
            <div className="sms-templates-header">
              <FiZap size={14} /> Quick Templates
            </div>
            <div className="sms-template-list">
              {TEMPLATES.map(({ key, name, icon: Icon, cls, text }) => (
                <div
                  key={key}
                  className="sms-template-item"
                  onClick={() => applyTemplate(text)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && applyTemplate(text)}
                >
                  <div className={`sms-template-icon sms-template-icon--${cls}`}>
                    <Icon size={14} />
                  </div>
                  <div className="sms-template-body">
                    <div className="sms-template-name">{name}</div>
                    <div className="sms-template-preview">{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <h2 className="card-title" style={{ marginBottom: 0 }}>
                <FiClock size={15} /> Recent Activity
              </h2>
              <button className="link-btn" onClick={() => navigate('/sms/logs')}>
                View all →
              </button>
            </div>
            {recent.length === 0
              ? <p className="empty-msg">No SMS sent yet</p>
              : (
                <div className="sms-activity-list">
                  {recent.map(log => (
                    <div key={log.id} className="sms-activity-item">
                      <div className={`sms-activity-icon sms-activity-icon--${log.status}`}>
                        {log.status === 'sent'
                          ? <FiCheckCircle size={14} />
                          : <FiAlertCircle size={14} />
                        }
                      </div>
                      <div className="sms-activity-body">
                        <div className="sms-activity-top">
                          <span className="sms-activity-phone">
                            {log.customer_name || log.phone}
                          </span>
                          <span className="sms-activity-time">
                            {log.created_at?.slice(0, 10)}
                          </span>
                        </div>
                        <div className="sms-activity-msg">{log.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

        </div>
      </div>
    </div>
  );
}
