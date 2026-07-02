import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLock, FiEye, FiEyeOff, FiShield, FiCheckCircle } from 'react-icons/fi';
import api from '../api';

export default function ResetPassword() {
  const { token }   = useParams();
  const navigate    = useNavigate();
  const [form, setForm]     = useState({ password: '', confirm: '' });
  const [showPw, setShowPw] = useState({ password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    if (form.password !== form.confirm) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password: form.password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3500);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  }

  function toggleShow(field) {
    setShowPw(v => ({ ...v, [field]: !v[field] }));
  }

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden="true">
        <div className="login-blob login-blob--1" />
        <div className="login-blob login-blob--2" />
        <div className="login-blob login-blob--3" />
        <div className="login-blob login-blob--4" />
      </div>

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.52, ease: [0, 0, 0.2, 1] }}
      >
        <motion.div
          className="login-card-header"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.4, ease: [0, 0, 0.2, 1] }}
        >
          <div className="login-logo">BC</div>
          <h1 className="login-card-title">Set New Password</h1>
          <p className="login-card-subtitle">
            {done ? 'Password updated!' : 'Choose a strong password for your account'}
          </p>
        </motion.div>

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

        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 22 }}
            style={{ textAlign: 'center', padding: '12px 0 24px' }}
          >
            <FiCheckCircle size={48} style={{ color: 'var(--green)', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--gray-600)', fontSize: '.95rem', lineHeight: 1.65, marginBottom: 24 }}>
              Your password has been reset successfully. Redirecting you to the login page…
            </p>
            <Link to="/login" className="btn btn--primary btn--block">
              Sign In Now
            </Link>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={handleSubmit}
            className="login-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.38, ease: [0, 0, 0.2, 1] }}
          >
            <div className="form-group">
              <label htmlFor="rp-password">New Password</label>
              <div className="login-pw-wrap">
                <FiLock size={15} className="login-pw-icon" />
                <input
                  id="rp-password"
                  type={showPw.password ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="login-pw-input"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="login-pw-toggle"
                  onClick={() => toggleShow('password')}
                  tabIndex={-1}
                  aria-label={showPw.password ? 'Hide password' : 'Show password'}
                >
                  {showPw.password ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="rp-confirm">Confirm Password</label>
              <div className="login-pw-wrap">
                <FiLock size={15} className="login-pw-icon" />
                <input
                  id="rp-confirm"
                  type={showPw.confirm ? 'text' : 'password'}
                  required
                  className="login-pw-input"
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                />
                <button
                  type="button"
                  className="login-pw-toggle"
                  onClick={() => toggleShow('confirm')}
                  tabIndex={-1}
                  aria-label={showPw.confirm ? 'Hide password' : 'Show password'}
                >
                  {showPw.confirm ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                </button>
              </div>
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
                ? <><span className="login-spinner" /> Updating…</>
                : 'Reset Password →'
              }
            </motion.button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login" className="login-forgot-link">
                Back to Sign In
              </Link>
            </div>
          </motion.form>
        )}

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
