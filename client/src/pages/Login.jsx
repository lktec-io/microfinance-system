import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  FiEye, FiEyeOff, FiMail, FiLock, FiShield, FiArrowRight,
  FiActivity, FiCreditCard, FiUsers, FiAlertCircle, FiCheck,
} from 'react-icons/fi';
import { useAuth, readRememberedEmail } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BrandMark } from '../layouts/Sidebar';
import { t } from '../i18n/bilingual';

const FEATURES = [
  { Icon: FiActivity,   title: 'Live portfolio intelligence', desc: 'Disbursements, balances and collection rate at a glance.' },
  { Icon: FiCreditCard, title: 'Repayments & collections',    desc: 'A posted payment ledger and a prioritised collections queue.' },
  { Icon: FiUsers,      title: 'Structured client profiles',  desc: 'Loan history and repayment standing for every borrower.' },
];

export default function Login() {
  const { login }     = useAuth();
  const { showToast } = useToast();
  const navigate      = useNavigate();
  const [params, setParams] = useSearchParams();

  const [rememberedEmail]           = useState(readRememberedEmail);
  const [form, setForm]             = useState(() => ({ email: rememberedEmail, password: '' }));
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedEmail));
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [showPw, setShowPw]         = useState(false);
  const resetToastShown = useRef(false);

  /* Arriving from a completed system reset: confirm it once, then clean the URL */
  useEffect(() => {
    if (params.get('reset') !== '1' || resetToastShown.current) return;
    resetToastShown.current = true;
    const done = t('reset.success');
    showToast(`${done.en} — ${done.sw}`, 'success', 9000);
    setParams({}, { replace: true });
  }, [params, setParams, showToast]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password, rememberMe);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  const remember     = t('auth.remember');
  const rememberHint = t('auth.rememberHint');

  return (
    <div className="mf-auth">
      {/* ── Brand panel ── */}
      <aside className="mf-auth__brand">
        <div className="mf-auth__logo">
          <BrandMark />
          <div>
            <div className="mf-auth__logo-name">Baraka Microcredit</div>
            <div className="mf-auth__logo-tag">Lending Platform</div>
          </div>
        </div>

        <div className="mf-auth__pitch">
          <h2 className="mf-auth__headline">Lending operations, <em>precisely</em> managed.</h2>
          <p className="mf-auth__lede">
            One workspace to originate loans, profile clients, track repayments and run collections.
          </p>
          <div className="mf-auth__features">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div className="mf-auth__feature" key={title}>
                <span className="mf-auth__feature-icon"><Icon size={16} /></span>
                <div>
                  <div className="mf-auth__feature-title">{title}</div>
                  <div className="mf-auth__feature-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mf-auth__ticker">
          <span><b>TLS</b> encrypted session</span>
          <span><b>RBAC</b> role-based access</span>
          <span>© {new Date().getFullYear()} Baraka Microcredit</span>
        </div>
      </aside>

      {/* ── Sign-in form ── */}
      <main className="mf-auth__panel">
        <div className="mf-auth__card">
          <div className="mf-eyebrow">Secure sign-in</div>
          <h1 className="mf-auth__title">Welcome back</h1>
          <p className="mf-auth__sub">Sign in with your staff account to continue.</p>

          <form className="mf-auth__form" onSubmit={handleSubmit}>
            {error && (
              <div className="mf-alert mf-alert--error" role="alert">
                <FiAlertCircle size={17} /> <span>{error}</span>
              </div>
            )}

            <label className="mf-field">
              <span className="mf-label">Email address</span>
              <span className="mf-input-icon">
                <FiMail size={16} />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  autoFocus={!rememberedEmail}
                  className="mf-input mf-auth__input"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value.toLowerCase() }))}
                />
              </span>
            </label>

            <label className="mf-field">
              <span className="mf-label">Password</span>
              <span className="mf-input-icon">
                <FiLock size={16} />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  autoFocus={Boolean(rememberedEmail)}
                  className="mf-input mf-auth__input"
                  style={{ paddingRight: '3rem' }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="mf-auth__pw-toggle"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  aria-pressed={showPw}
                >
                  {showPw ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </span>
            </label>

            <div className="mf-auth__row">
              <label className="mf-checkbox">
                <input
                  type="checkbox"
                  className="mf-checkbox__input"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  aria-describedby="remember-hint"
                />
                <span className="mf-checkbox__box" aria-hidden="true"><FiCheck size={14} /></span>
                <span className="mf-checkbox__text">
                  <span className="mf-checkbox__label">
                    {remember.en} <span className="mf-checkbox__sw" lang="sw">· {remember.sw}</span>
                  </span>
                  <span id="remember-hint" className="mf-checkbox__hint">{rememberHint.en}</span>
                </span>
              </label>
              <Link to="/forgot-password" className="mf-auth__link">Forgot password?</Link>
            </div>

            <button type="submit" className="mf-btn mf-btn--primary mf-btn--lg mf-btn--block" disabled={loading}>
              {loading
                ? <><span className="mf-spinner-inline" /> Verifying…</>
                : <>Sign in <FiArrowRight size={17} /></>}
            </button>
          </form>

          <div className="mf-auth__foot">
            <FiShield size={14} /> Encrypted connection · access is logged and monitored
          </div>
        </div>
      </main>
    </div>
  );
}
