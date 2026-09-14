import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api';

export const AuthContext = createContext(null);

const TOKEN_KEY          = 'mf_token';
const USER_KEY           = 'mf_user';
const REMEMBER_EMAIL_KEY = 'mf_remember_email';

function readStored(key) {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch { return null; }
}

/** Email saved by "Remember me" on this device (never the password). */
export function readRememberedEmail() {
  try { return localStorage.getItem(REMEMBER_EMAIL_KEY) || ''; } catch { return ''; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(readStored(USER_KEY)); }
    catch { return null; }
  });

  /*
   * Remember me ON  → token + user in localStorage (server issues a 7-day token)
   *                   and the email is remembered for the next sign-in.
   * Remember me OFF → token + user in sessionStorage (cleared when the tab closes)
   *                   and any remembered email is forgotten.
   */
  const login = useCallback(async (email, password, rememberMe = false) => {
    const { data } = await api.post('/auth/login', { email, password, rememberMe });

    localStorage.removeItem(TOKEN_KEY);   localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY);

    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, data.token);
    store.setItem(USER_KEY,  JSON.stringify(data.user));

    try {
      if (rememberMe) localStorage.setItem(REMEMBER_EMAIL_KEY, data.user?.email || email);
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
    } catch { /* storage unavailable — sign-in still succeeds */ }

    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);   localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
