import api from './api';

export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const verifyEmail = (token) => api.get('/auth/verify-email', { params: { token } });
export const resendVerification = () => api.post('/auth/resend-verification');
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => api.post('/auth/reset-password', { token, password });
