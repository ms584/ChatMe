import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 10000,
});

// Attach JWT token to every request — validate before use
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chatme_token');
  // Sanity check: valid JWT is 10-500 chars; reject anything else
  if (token && typeof token === 'string' && token.length >= 10 && token.length <= 500) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (token) {
    // Corrupt token — evict immediately
    localStorage.removeItem('chatme_token');
  }
  return config;
});

// On 401 only — clear token and redirect to login (NOT on 429 rate limit)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('chatme_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
