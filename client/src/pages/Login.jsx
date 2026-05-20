import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdVisibility, MdVisibilityOff, MdEmail, MdLock } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';

function LoginLogoMark() {
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
  return <div className="login-logo">MF</div>;
}

export default function Login() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

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
      <div className="login-orb login-orb--1" />
      <div className="login-orb login-orb--2" />
      <div className="login-orb login-orb--3" />

      <div className="login-card">
        <div className="login-brand">
          <LoginLogoMark />
          <h1 className="login-title">MicroFinance Manager</h1>
          <p className="login-sub">Sign in to your account to continue</p>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-icon-wrap">
              <MdEmail size={16} className="input-icon" />
              <input
                id="email" type="email" required
                className="input-with-icon"
                placeholder="admin@microfinance.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="login-pw-wrap">
              <MdLock size={16} className="login-pw-icon" />
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
                {showPw ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--block login-submit"
            disabled={loading}
          >
            {loading
              ? <><span className="login-spinner" /> Signing in…</>
              : 'Sign In →'
            }
          </button>
        </form>

        <p className="login-hint">Default: admin@microfinance.com / password</p>
      </div>
    </div>
  );
}
