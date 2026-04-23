import api from './api';

export const getStats = () => api.get('/admin/stats');
export const getUsers = (params) => api.get('/admin/users', { params });
export const getUser = (id) => api.get(`/admin/users/${id}`);
export const toggleUserStatus = (id) => api.put(`/admin/users/${id}/status`);
export const getAdminTransactions = (params) => api.get('/admin/transactions', { params });
export const getAdminAccounts = (params) => api.get('/admin/accounts', { params });
