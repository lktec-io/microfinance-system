import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api';

export const AuthContext = createContext(null);

const TOKEN_KEY = 'mf_token';
const USER_KEY  = 'mf_user';

function readStored(key) {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(readStored(USER_KEY)); }
    catch { return null; }
  });

  const login = useCallback(async (email, password, rememberMe = false) => {
    const { data } = await api.post('/auth/login', { email, password, rememberMe });
    const store = rememberMe ? localStorage : sessionStorage;
    // Clear both so only one is active at a time
    localStorage.removeItem(TOKEN_KEY);   localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY);
    store.setItem(TOKEN_KEY, data.token);
    store.setItem(USER_KEY,  JSON.stringify(data.user));
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
