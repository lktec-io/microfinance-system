import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft, FiShield, FiCheckCircle } from 'react-icons/fi';
import api from '../api';

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <h1 className="login-card-title">Forgot Password</h1>
          <p className="login-card-subtitle">
            {sent ? 'Check your inbox' : "Enter your email and we'll send a reset link"}
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

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 22 }}
            style={{ textAlign: 'center', padding: '12px 0 24px' }}
          >
            <FiCheckCircle size={48} style={{ color: 'var(--green)', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--gray-600)', fontSize: '.95rem', lineHeight: 1.65, marginBottom: 24 }}>
              If an account exists for <strong>{email}</strong>, a password reset link has been sent.
              Check your spam folder if you don't see it within a few minutes.
            </p>
            <Link to="/login" className="btn btn--primary btn--block">
              Back to Sign In
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
              <label htmlFor="fp-email">Email Address</label>
              <div className="input-icon-wrap">
                <FiMail size={15} className="input-icon" />
                <input
                  id="fp-email"
                  type="email"
                  required
                  className="input-with-icon"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value.toLowerCase())}
                />
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
                ? <><span className="login-spinner" /> Sending…</>
                : 'Send Reset Link →'
              }
            </motion.button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login" className="login-forgot-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FiArrowLeft size={13} /> Back to Sign In
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
