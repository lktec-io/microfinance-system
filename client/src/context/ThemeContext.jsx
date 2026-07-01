import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export const THEMES = [
  { id: 'morning',   label: 'Morning',   desc: 'Clean & bright',  dot: '#F8FAFC', accent: '#16A34A' },
  { id: 'afternoon', label: 'Afternoon', desc: 'Warm & golden',   dot: '#FFFBF5', accent: '#F59E0B' },
  { id: 'evening',   label: 'Evening',   desc: 'Dark & premium',  dot: '#0A1628', accent: '#22C55E' },
];

const DARK_THEMES = new Set(['evening', 'night', 'dark']);
const ThemeContext = createContext(null);

function resolveTheme(stored) {
  if (!stored || stored === 'light') return 'morning';
  if (stored === 'dark' || stored === 'night') return 'evening';
  if (THEMES.find(t => t.id === stored)) return stored;
  return 'morning';
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
    setTimeout(() => document.body.classList.remove('theme-switching'), 400);
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
