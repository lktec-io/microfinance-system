import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('mf_theme') || 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mf_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    document.body.classList.add('theme-switching');
    setTheme(t => t === 'light' ? 'dark' : 'light');
    setTimeout(() => document.body.classList.remove('theme-switching'), 350);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
