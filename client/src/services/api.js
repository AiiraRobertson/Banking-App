import axios from 'axios';

// Determine API base URL based on environment
const getBaseURL = () => {
  // Production: VITE_API_URL points at the hosted backend (e.g. https://kapita-api.onrender.com)
  const explicit = import.meta.env.VITE_API_URL;
  if (explicit) {
    return explicit.replace(/\/+$/, '') + '/api';
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:3001/api';
  }
  // Fallback: relative path (only works when same origin serves frontend + backend)
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
