import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiEye, FiEyeOff, FiMail, FiLock, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const panelVariants = {
  hidden:  { opacity: 0, x: -40 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.55, ease: [0, 0, 0.2, 1] },
  },
};

const formVariants = {
  hidden:  { opacity: 0, x: 30 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 0.5, ease: [0, 0, 0.2, 1], delay: 0.08 },
  },
};

const staggerGroup = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.25 },
  },
};

const staggerItem = {
  hidden:  { opacity: 0, y: 14 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
};

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

      {/* ── Left: Brand Panel ── */}
      <motion.div
        className="login-brand-panel"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="login-brand-inner"
          variants={staggerGroup}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={staggerItem}>
            <BrandLogo />
          </motion.div>
          <motion.h1 className="login-brand-title" variants={staggerItem}>
            Baraka<br />Microcredit
          </motion.h1>
          <motion.p className="login-brand-tagline" variants={staggerItem}>
            Enterprise-grade financial management for growing communities.
          </motion.p>
          <motion.div className="login-brand-stats" variants={staggerItem}>
            <motion.div
              className="login-brand-stat"
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            >
              <span className="login-brand-stat-val">99.9%</span>
              <span className="login-brand-stat-label">Uptime SLA</span>
            </motion.div>
            <motion.div
              className="login-brand-stat"
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            >
              <span className="login-brand-stat-val">AES-256</span>
              <span className="login-brand-stat-label">Encryption</span>
            </motion.div>
          </motion.div>
        </motion.div>
        <div className="login-orb login-orb--1" />
        <div className="login-orb login-orb--2" />
      </motion.div>

      {/* ── Right: Form Panel ── */}
      <motion.div
        className="login-form-panel"
        variants={formVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="login-form-inner"
          variants={staggerGroup}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="login-form-header" variants={staggerItem}>
            <h2>Welcome back</h2>
            <p>Sign in to your workspace to continue</p>
          </motion.div>

          {error && (
            <motion.div
              className="alert alert--error"
              initial={{ opacity: 0, scale: .95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            >
              {error}
            </motion.div>
          )}

          <motion.form onSubmit={handleSubmit} className="login-form" variants={staggerItem}>
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

            <motion.button
              type="submit"
              className="btn btn--primary btn--block login-submit"
              disabled={loading}
              whileHover={loading ? {} : { scale: 1.01 }}
              whileTap={loading ? {} : { scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            >
              {loading
                ? <><span className="login-spinner" /> Verifying…</>
                : 'Sign In →'
              }
            </motion.button>
          </motion.form>

          <motion.p className="login-hint" variants={staggerItem}>
            Contact your administrator for access credentials
          </motion.p>
          <motion.div className="login-security-note" variants={staggerItem}>
            <FiShield size={11} /> Secured with end-to-end encryption
          </motion.div>

        </motion.div>
      </motion.div>

    </div>
  );
}
