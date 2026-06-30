import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export const THEMES = [
  { id: 'morning',   label: 'Morning',   desc: 'Soft white & navy',     dot: '#F8FAFC', accent: '#16A34A' },
  { id: 'afternoon', label: 'Afternoon', desc: 'Warm white & golden',   dot: '#FFFBF5', accent: '#F59E0B' },
  { id: 'evening',   label: 'Evening',   desc: 'Dark navy & glass',     dot: '#0A1628', accent: '#22C55E' },
  { id: 'night',     label: 'Night',     desc: 'Deep dark professional', dot: '#030712', accent: '#16A34A' },
];

const DARK_THEMES = new Set(['evening', 'night', 'dark']);

const ThemeContext = createContext(null);

function resolveTheme(stored) {
  if (!stored) return 'morning';
  if (stored === 'light') return 'morning';
  if (stored === 'dark')  return 'evening';
  return stored;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeRaw] = useState(() =>
    resolveTheme(localStorage.getItem('mf_theme'))
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mf_theme', theme);
  }, [theme]);

  const isDark = useMemo(() => DARK_THEMES.has(theme), [theme]);

  const setTheme = useCallback((next) => {
    document.body.classList.add('theme-switching');
    setThemeRaw(next);
    setTimeout(() => document.body.classList.remove('theme-switching'), 350);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'morning' : 'evening');
  }, [isDark, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
