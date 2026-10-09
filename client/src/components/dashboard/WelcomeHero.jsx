import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Avatar } from '../ui';

/** Good morning / afternoon / evening / night, from the local clock. */
export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5)  return { en: 'Good night',     sw: 'Usiku mwema' };
  if (h < 12) return { en: 'Good morning',   sw: 'Habari za asubuhi' };
  if (h < 17) return { en: 'Good afternoon', sw: 'Habari za mchana' };
  if (h < 22) return { en: 'Good evening',   sw: 'Habari za jioni' };
  return { en: 'Good night', sw: 'Usiku mwema' };
}

const DATE_FMT = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };

/**
 * Welcome-back banner.
 *
 * Keeps the greeting, the user and the live date/time, and adds one slow
 * moving sheen so the surface feels alive without becoming a toy. The sheen
 * is skipped entirely for prefers-reduced-motion.
 */
export default function WelcomeHero({ user, avatar, children }) {
  const reduce = useReducedMotion();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // tick on the minute — enough for a clock, cheap enough to ignore
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const greeting = greetingFor(now);
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <motion.section
      className="mf-hero"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .5, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Welcome"
    >
      {!reduce && (
        <motion.span
          className="mf-hero__sheen"
          aria-hidden="true"
          initial={{ x: '-60%' }}
          animate={{ x: '160%' }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
        />
      )}

      <div className="mf-hero__body">
        <motion.span className="mf-hero__eyebrow"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .1 }}>
          Welcome back
        </motion.span>
        <motion.h1 className="mf-hero__title"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .16, duration: .45 }}>
          {greeting.en}, <strong>{firstName}</strong>
          <span className="mf-hero__title-sw" lang="sw">{greeting.sw}</span>
        </motion.h1>
        <motion.p className="mf-hero__meta"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .24 }}>
          <span>{now.toLocaleDateString('en-GB', DATE_FMT)}</span>
          <span className="mf-hero__dot" aria-hidden="true">·</span>
          <time className="mf-hero__clock" dateTime={now.toISOString()}>
            {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </time>
        </motion.p>
      </div>

      <motion.div className="mf-hero__side"
        initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: .2, type: 'spring', stiffness: 300, damping: 24 }}>
        <Avatar name={user?.name} src={avatar} size={52} dark />
        <span className="mf-hero__who">
          <span className="mf-hero__who-name">{user?.name || 'Signed in'}</span>
          <span className="mf-hero__who-role">{user?.role || 'user'}</span>
        </span>
      </motion.div>

      {children && <div className="mf-hero__actions no-print">{children}</div>}
    </motion.section>
  );
}
