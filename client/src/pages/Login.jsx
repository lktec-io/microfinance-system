import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiMail, FiLock, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

function BrandLogo() {
  const [imgErr, setImgErr] = useState(false);
  if (!imgErr) {
    return (
      <img
        src="/logo.png"
        alt="Company Logo"
        className="login-logo-img"
        onError={() => setImgErr(true)}
      />
    );
  }
  return <div className="login-logo">BC</div>;
}

export default function Login() {
  const { login }              = useAuth();
  const navigate               = useNavigate();
  const [form, setForm]        = useState({ email: '', password: '' });
  const [error, setError]      = useState('');
  const [loading, setLoading]  = useState(false);
  const [showPw, setShowPw]    = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">

      {/* ── Left: Brand panel ── */}
      <div className="login-brand-panel">
        <div className="login-brand-inner">
          <BrandLogo />
          <h1 className="login-brand-title">
            Baraka<br />Microcredit
          </h1>
          <p className="login-brand-tagline">
            Enterprise-grade financial management for growing communities.
          </p>
          <div className="login-brand-stats">
            <div className="login-brand-stat">
              <span className="login-brand-stat-val">99.9%</span>
              <span className="login-brand-stat-label">Uptime SLA</span>
            </div>
            <div className="login-brand-stat">
              <span className="login-brand-stat-val">AES-256</span>
              <span className="login-brand-stat-label">Encryption</span>
            </div>
          </div>
        </div>
        <div className="login-orb login-orb--1" />
        <div className="login-orb login-orb--2" />
      </div>

      {/* ── Right: Form panel ── */}
      <div className="login-form-panel">
        <div className="login-form-inner">

          <div className="login-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your workspace to continue</p>
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-icon-wrap">
                <FiMail size={15} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  required
                  className="input-with-icon"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value.toLowerCase() }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="login-pw-wrap">
                <FiLock size={15} className="login-pw-icon" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  className="login-pw-input"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="login-pw-toggle"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                >
                  {showPw ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--block login-submit"
              disabled={loading}
            >
              {loading
                ? <><span className="login-spinner" /> Verifying…</>
                : 'Sign In →'
              }
            </button>
          </form>

          <p className="login-hint">Contact your administrator for access credentials</p>
          <div className="login-security-note">
            <FiShield size={11} /> Secured with end-to-end encryption
          </div>

        </div>
      </div>

    </div>
  );
}
