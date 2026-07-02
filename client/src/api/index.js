import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mf_token') ?? sessionStorage.getItem('mf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Public paths where a 401 should NOT trigger a redirect (avoids infinite loop)
const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mf_token');   localStorage.removeItem('mf_user');
      sessionStorage.removeItem('mf_token'); sessionStorage.removeItem('mf_user');
      const onPublicPage = PUBLIC_PATHS.some(p => window.location.pathname.startsWith(p));
      if (!onPublicPage) {
        window.location.replace('/login');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
