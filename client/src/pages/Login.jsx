import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiEye, FiEyeOff, FiMail, FiLock, FiShield, FiMoon, FiSun } from 'react-icons/fi';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function BrandLogo() {
  const [imgErr, setImgErr] = useState(false);
  if (!imgErr) {
    return (
      <img
        src="/logo.png"
        alt="Baraka Microcredit Logo"
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
  const { isDark, toggleTheme } = useTheme();
  const [form, setForm]          = useState({ email: '', password: '' });
  const [error, setError]        = useState('');
  const [loading, setLoading]    = useState(false);
  const [showPw, setShowPw]      = useState(false);
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
    <div className="login-page">

      {/* ── Animated Background ── */}
      <div className="login-bg" aria-hidden="true">
        <div className="login-blob login-blob--1" />
        <div className="login-blob login-blob--2" />
        <div className="login-blob login-blob--3" />
        <div className="login-blob login-blob--4" />
      </div>

      {/* ── Theme Toggle (top-right corner) ── */}
      <button
        className="login-theme-btn"
        onClick={toggleTheme}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
      </button>

      {/* ── Card ── */}
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.52, ease: [0, 0, 0.2, 1] }}
      >
        {/* Header */}
        <motion.div
          className="login-card-header"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.4, ease: [0, 0, 0.2, 1] }}
        >
          <BrandLogo />
          <h1 className="login-card-title">Baraka Microcredit</h1>
          <p className="login-card-subtitle">Secure Loan Management System</p>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            className="alert alert--error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          >
            {error}
          </motion.div>
        )}

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          className="login-form"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.38, ease: [0, 0, 0.2, 1] }}
        >
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
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <FiEyeOff size={17} /> : <FiEye size={17} />}
              </button>
            </div>
          </div>

          <div className="login-row-between">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="login-forgot-link">
              Forgot password?
            </Link>
          </div>

          <motion.button
            type="submit"
            className="btn btn--primary btn--block login-submit"
            disabled={loading}
            whileHover={loading ? {} : { y: -2, boxShadow: '0 8px 28px rgba(22,163,74,.42)' }}
            whileTap={loading ? {} : { scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          >
            {loading
              ? <><span className="login-spinner" /> Verifying…</>
              : 'Sign In →'
            }
          </motion.button>
        </motion.form>

        {/* Footer */}
        <motion.div
          className="login-card-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.42 }}
        >
          <FiShield size={12} /> Secured with end-to-end encryption
        </motion.div>
      </motion.div>

    </div>
  );
}
