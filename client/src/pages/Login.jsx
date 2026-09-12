import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiEye, FiEyeOff, FiMail, FiLock, FiShield, FiArrowRight,
  FiActivity, FiMessageSquare, FiUsers, FiAlertCircle,
} from 'react-icons/fi';
import { useAuth }   from '../context/AuthContext';
import { BrandMark } from '../layouts/Sidebar';

const FEATURES = [
  { Icon: FiActivity,      title: 'Live portfolio intelligence', desc: 'Disbursements, balances and collection rate at a glance.' },
  { Icon: FiMessageSquare, title: 'Automated SMS collections',   desc: 'Reminders and overdue notices sent straight from the ledger.' },
  { Icon: FiUsers,         title: 'Structured client profiles',  desc: 'Loan history and repayment standing for every borrower.' },
];

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [form, setForm]             = useState({ email: '', password: '' });
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [showPw, setShowPw]         = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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

          <form className="mf-auth__form" onSubmit={handleSubmit} noValidate={false}>
            {error && (
              <div className="mf-alert mf-alert--error" role="alert">
                <FiAlertCircle size={15} /> {error}
              </div>
            )}

            <label className="mf-field">
              <span className="mf-label">Email address</span>
              <span className="mf-input-icon">
                <FiMail size={15} />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
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
                <FiLock size={15} />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="mf-input mf-auth__input"
                  style={{ paddingRight: '2.6rem' }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="mf-auth__pw-toggle"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </span>
            </label>

            <div className="mf-auth__row">
              <label className="mf-check">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                Remember me
              </label>
              <Link to="/forgot-password" className="mf-auth__link">Forgot password?</Link>
            </div>

            <button type="submit" className="mf-btn mf-btn--primary mf-btn--lg mf-btn--block" disabled={loading}>
              {loading
                ? <><span className="mf-spinner-inline" /> Verifying…</>
                : <>Sign in <FiArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mf-auth__foot">
            <FiShield size={13} /> Encrypted connection · access is logged and monitored
          </div>
        </div>
      </main>
    </div>
  );
}
