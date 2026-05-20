import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

function isTokenExpired(token) {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    return exp * 1000 < Date.now() + 60000;
  } catch {
    return true;
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mf_token');
  if (token) {
    if (isTokenExpired(token)) {
      localStorage.removeItem('mf_token');
      localStorage.removeItem('mf_user');
      window.location.replace('/login');
      return Promise.reject(new Error('Session expired'));
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mf_token');
      localStorage.removeItem('mf_user');
      window.location.replace('/login');
    }
    return Promise.reject(err);
  }
);

export default api;
