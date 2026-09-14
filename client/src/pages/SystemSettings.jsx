import { useEffect, useState } from 'react';
import {
  FiAlertTriangle, FiAlertCircle, FiLock, FiTrash2, FiShield, FiDatabase,
  FiUsers, FiLayers, FiCreditCard, FiFileText, FiInbox, FiEye, FiEyeOff, FiUserCheck,
} from 'react-icons/fi';
import api from '../api';
import { requestSystemReset, RESET_CONFIRM_PHRASE } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/ui';
import { t } from '../i18n/bilingual';
import '../styles/app/settings.css';

/** English line with its Kiswahili translation underneath. */
function Bi({ k, params, className = '' }) {
  const m = t(k, params);
  return (
    <span className={`mf-bi ${className}`}>
      <span className="mf-bi__en">{m.en}</span>
      <span className="mf-bi__sw" lang="sw">{m.sw}</span>
    </span>
  );
}

export default function SystemSettings() {
  const { user, logout } = useAuth();

  const [counts, setCounts]         = useState(null);
  const [phrase, setPhrase]         = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([api.get('/reports/summary'), api.get('/expenses/summary')]).then(([sum, exp]) => {
      if (cancelled) return;
      const s = sum.status === 'fulfilled' ? sum.value.data ?? {} : {};
      const e = exp.status === 'fulfilled' ? exp.value.data ?? {} : {};
      setCounts({
        customers:  sum.status === 'fulfilled' ? Number(s.customers || 0)   : null,
        loans:      sum.status === 'fulfilled' ? Number(s.total_loans || 0) : null,
        repayments: sum.status === 'fulfilled' ? Number(s.repayments || 0)  : null,
        expenses:   exp.status === 'fulfilled' ? Number(e.count || 0)       : null,
      });
    });
    return () => { cancelled = true; };
  }, []);

  const unlocked  = phrase === RESET_CONFIRM_PHRASE;
  const canSubmit = unlocked && password.length > 0 && !submitting;
  const mismatch  = phrase.length > 0 && !unlocked;

  async function handleReset(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await requestSystemReset({ confirm: phrase, password });
      // Wipe every trace of the old session, then reload so no React state survives.
      logout();
      try { localStorage.clear(); sessionStorage.clear(); } catch { /* storage unavailable */ }
      window.location.replace('/login?reset=1');
    } catch (err) {
      setError(err.response?.data?.message || t('reset.failed').en);
      setPassword('');
      setSubmitting(false);
    }
  }

  const scope = [
    { key: 'customers',  label: 'Clients',    Icon: FiUsers },
    { key: 'loans',      label: 'Loans',      Icon: FiLayers },
    { key: 'repayments', label: 'Repayments', Icon: FiCreditCard },
    { key: 'expenses',   label: 'Expenses',   Icon: FiFileText },
    { key: 'sms',        label: 'SMS logs',   Icon: FiInbox },
  ];

  return (
    <div className="mf-page">
      <PageHeader
        eyebrow="Administration"
        title="System Settings"
        subtitle="Session details and irreversible maintenance actions. Administrators only."
      />

      <section className="mf-card">
        <div className="mf-card__head">
          <h2 className="mf-card__title"><FiShield size={17} /> Signed-in administrator</h2>
        </div>
        <dl className="mf-dl">
          <div className="mf-dl__item"><dt>Name</dt><dd>{user?.name}</dd></div>
          <div className="mf-dl__item"><dt>Role</dt><dd style={{ textTransform: 'capitalize' }}>{user?.role}</dd></div>
          <div className="mf-dl__item mf-dl__item--span"><dt>Email</dt><dd>{user?.email}</dd></div>
        </dl>
      </section>

      <section className="mf-danger" aria-labelledby="danger-title">
        <header className="mf-danger__head">
          <span className="mf-danger__icon"><FiAlertTriangle size={22} /></span>
          <div>
            <div className="mf-danger__eyebrow">Danger zone · Eneo la hatari</div>
            <h2 id="danger-title" className="mf-danger__title"><Bi k="reset.title" /></h2>
          </div>
        </header>

        <div className="mf-danger__body">
          <div className="mf-alert mf-alert--danger">
            <FiAlertOctagonIcon />
            <Bi k="reset.warning" />
          </div>

          <div>
            <div className="mf-section-label">What will be deleted</div>
            <ul className="mf-danger__scope">
              {scope.map(({ key, label, Icon }) => (
                <li key={key} className="mf-danger__scope-item">
                  <Icon size={17} />
                  <span className="mf-danger__scope-label">{label}</span>
                  <span className="mf-danger__scope-count">
                    {key === 'sms' ? 'All' : counts?.[key] == null ? '—' : counts[key].toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="mf-danger__notes">
            <li><FiUserCheck size={16} /><Bi k="reset.kept" /></li>
            <li><FiDatabase size={16} /><Bi k="reset.backup" /></li>
          </ul>

          <form className="mf-danger__form" onSubmit={handleReset} autoComplete="off">
            <label className="mf-field">
              <span className="mf-label"><Bi k="reset.typeToConfirm" params={{ phrase: RESET_CONFIRM_PHRASE }} /></span>
              <input
                className={`mf-input mf-danger__phrase${unlocked ? ' is-unlocked' : ''}`}
                value={phrase}
                onChange={e => setPhrase(e.target.value)}
                placeholder={RESET_CONFIRM_PHRASE}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={mismatch || undefined}
                aria-describedby="phrase-hint"
                disabled={submitting}
              />
              <span id="phrase-hint" className={mismatch ? 'mf-error-text' : 'mf-hint'}>
                {mismatch
                  ? <Bi k="reset.phraseMismatch" params={{ phrase: RESET_CONFIRM_PHRASE }} />
                  : unlocked ? 'Confirmation phrase accepted.' : ' '}
              </span>
            </label>

            <label className="mf-field">
              <span className="mf-label"><Bi k="reset.password" /></span>
              <span className="mf-input-icon">
                <FiLock size={16} />
                <input
                  className="mf-input"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={!unlocked || submitting}
                  style={{ paddingRight: '3rem' }}
                />
                <button type="button" className="mf-danger__pw-toggle" onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw} disabled={!unlocked}>
                  {showPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </span>
            </label>

            {error && (
              <div className="mf-alert mf-alert--error" role="alert">
                <FiAlertCircle size={17} />
                <span>
                  {error}
                  <span lang="sw" style={{ display: 'block', fontWeight: 600 }}>{t('reset.failed').sw}</span>
                </span>
              </div>
            )}

            <button type="submit" className="mf-btn mf-btn--danger mf-btn--lg mf-btn--block mf-danger__submit" disabled={!canSubmit}>
              {submitting ? (
                <><span className="mf-spinner-inline" /> {t('reset.working').en}</>
              ) : unlocked ? (
                <><FiTrash2 size={18} /> {t('reset.button').en} <span lang="sw" className="mf-danger__submit-sw">· {t('reset.button').sw}</span></>
              ) : (
                <><FiLock size={18} /> {t('reset.typeToConfirm', { phrase: RESET_CONFIRM_PHRASE }).en}</>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function FiAlertOctagonIcon() {
  return <FiAlertTriangle size={18} aria-hidden="true" />;
}
