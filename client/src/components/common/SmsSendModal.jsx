import { useState } from 'react';
import {
  FiMessageSquare, FiBell, FiAlertTriangle, FiX,
  FiCheckCircle, FiAlertCircle, FiSend,
  FiUser, FiPhone, FiClock,
} from 'react-icons/fi';
import api     from '../../api';
import { fmt } from '../../utils/format';

function n(v) {
  return Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fd(d) { return d ? String(d).slice(0, 10) : '—'; }
function nowLabel() {
  return new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const CONFIG = {
  thank_you: {
    Icon:    FiMessageSquare,
    iconCls: 'sms-modal-icon--ty',
    label:   'Shukrani SMS',
    sub:     'Thank You SMS',
    btnCls:  'btn--primary',
    build:   (loan) =>
      `Habari, ${loan.customer_name},\n\n` +
      `Baraka Microcredit tunakushukuru kwa kuchagua huduma zetu.\n\n` +
      `Mkopo wako wa TZS ${n(loan.loan_amount)} umeidhinishwa na kutolewa kikamilifu.\n\n` +
      `Kiasi cha kurejesha ni TZS ${n(loan.total_payable)} kabla ya tarehe ${fd(loan.due_date)}.\n\n` +
      `Tunakutakia mafanikio katika matumizi ya mkopo huu.\n\n` +
      `Baraka Microcredit`,
  },
  reminder: {
    Icon:    FiBell,
    iconCls: 'sms-modal-icon--rm',
    label:   'Kikumbusha SMS',
    sub:     'Payment Reminder SMS',
    btnCls:  'btn--primary',
    build:   (loan) =>
      `Habari, ${loan.customer_name},\n\n` +
      `Tunapenda kukukumbusha kuwa una salio la mkopo la TZS ${n(loan.balance)}.\n\n` +
      `Tafadhali hakikisha unakamilisha malipo yako kabla ya tarehe ${fd(loan.due_date)}.\n\n` +
      `Kwa maelezo zaidi wasiliana na Baraka Microcredit.\n\n` +
      `Asante.`,
  },
  overdue: {
    Icon:    FiAlertTriangle,
    iconCls: 'sms-modal-icon--ov',
    label:   'Mkopo Umechelewa',
    sub:     'Overdue Notice SMS',
    btnCls:  'btn--danger',
    build:   (loan) =>
      `Habari, ${loan.customer_name},\n\n` +
      `Mkopo wako wa TZS ${n(loan.balance)} ulikuwa unadaiwa tarehe ${fd(loan.due_date)} na sasa umechelewa.\n\n` +
      `Tafadhali wasiliana nasi mara moja kuzuia hatua zaidi.\n\n` +
      `Baraka Microcredit`,
  },
};

const ENDPOINT = {
  thank_you: (id) => `/sms/send-thank-you/${id}`,
  reminder:  (id) => `/sms/send-reminder/${id}`,
  overdue:   (id) => `/sms/send-overdue/${id}`,
};

export default function SmsSendModal({ loan, type, onClose }) {
  const [phase,    setPhase]    = useState('confirm');
  const [errMsg,   setErrMsg]   = useState('');
  const [sentInfo, setSentInfo] = useState(null);

  const cfg     = CONFIG[type];
  const { Icon } = cfg;
  const preview = cfg.build(loan);

  async function handleSend() {
    setPhase('sending');
    setErrMsg('');
    try {
      const { data } = await api.post(ENDPOINT[type](loan.id));
      if (data.success) {
        setSentInfo({
          name:   data.customer_name || loan.customer_name,
          phone:  data.phone         || loan.customer_phone,
          sentAt: nowLabel(),
        });
        setPhase('success');
      } else {
        setErrMsg(data.message || data.error || 'SMS delivery failed. Check SMS Center for details.');
        setPhase('error');
      }
    } catch (err) {
      setErrMsg(err.response?.data?.message || 'Network error — SMS could not be sent.');
      setPhase('error');
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal--sm sms-confirm-modal">

        {/* ── Confirm ── */}
        {phase === 'confirm' && (
          <>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <div className={`sms-modal-icon ${cfg.iconCls}`}><Icon size={16} /></div>
                <div>
                  <h2>{cfg.label}</h2>
                  <p style={{ fontSize: '.76rem', color: 'var(--gray-500)', marginTop: '.08rem' }}>{cfg.sub}</p>
                </div>
              </div>
              <button className="modal-close" onClick={onClose}><FiX size={18} /></button>
            </div>

            <div className="sms-confirm-recipient">
              <div className="sms-confirm-recip-row"><FiUser size={13} /><span>{loan.customer_name}</span></div>
              <div className="sms-confirm-recip-row"><FiPhone size={13} /><span>{loan.customer_phone || '—'}</span></div>
            </div>

            <div className="sms-confirm-preview-label">Maudhui ya SMS:</div>
            <div className="sms-confirm-bubble">{preview}</div>

            <div className="modal-actions">
              <button className="btn btn--ghost" onClick={onClose}>Ghairi</button>
              <button className={`btn ${cfg.btnCls}`} onClick={handleSend}>
                <FiSend size={14} /> Tuma SMS
              </button>
            </div>
          </>
        )}

        {/* ── Sending ── */}
        {phase === 'sending' && (
          <div className="sms-confirm-state">
            <div className="sms-confirm-spinner" />
            <p className="sms-confirm-state-title">Inatuma SMS…</p>
            <p className="sms-confirm-state-sub">Tafadhali subiri</p>
          </div>
        )}

        {/* ── Success ── */}
        {phase === 'success' && (
          <div className="sms-confirm-state">
            <div className="sms-confirm-success-icon"><FiCheckCircle size={36} /></div>
            <p className="sms-confirm-state-title">SMS Imetumwa!</p>
            <p className="sms-confirm-state-sub">SMS Sent Successfully</p>
            <div className="sms-confirm-sent-info">
              <div className="sms-confirm-sent-row"><FiUser  size={13} /><span>{sentInfo?.name}</span></div>
              <div className="sms-confirm-sent-row"><FiPhone size={13} /><span>{sentInfo?.phone}</span></div>
              <div className="sms-confirm-sent-row"><FiClock size={13} /><span>{sentInfo?.sentAt}</span></div>
            </div>
            <button className="btn btn--primary" style={{ marginTop: '1.1rem', width: '100%' }} onClick={onClose}>
              Karibu
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {phase === 'error' && (
          <div className="sms-confirm-state">
            <div className="sms-confirm-error-icon"><FiAlertCircle size={36} /></div>
            <p className="sms-confirm-state-title">Imeshindwa Kutuma</p>
            <p className="sms-confirm-state-sub" style={{ color: 'var(--red)' }}>{errMsg}</p>
            <div className="modal-actions" style={{ justifyContent: 'center', marginTop: '1rem' }}>
              <button className="btn btn--ghost" onClick={onClose}>Funga</button>
              <button className="btn btn--primary" onClick={() => { setPhase('confirm'); setErrMsg(''); }}>
                Jaribu Tena
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
