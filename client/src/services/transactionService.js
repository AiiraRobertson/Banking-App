import api from './api';

export const deposit = (data) => api.post('/transactions/deposit', data);
export const withdraw = (data) => api.post('/transactions/withdraw', data);
export const transfer = (data) => api.post('/transactions/transfer', data);
export const getTransactions = (params) => api.get('/transactions', { params });
export const getTransaction = (id) => api.get(`/transactions/${id}`);
