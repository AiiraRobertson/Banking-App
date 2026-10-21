import api from './api';

export const withdraw = (data) => api.post('/transactions/withdraw', data);
export const transfer = (data, idempotencyKey) => api.post('/transactions/transfer', data, {
	headers: { 'Idempotency-Key': idempotencyKey }
});
export const getTransactions = (params) => api.get('/transactions', { params });
export const getTransaction = (id) => api.get(`/transactions/${id}`);
