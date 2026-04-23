import api from './api';

export const getAccounts = () => api.get('/accounts');
export const getAccount = (id) => api.get(`/accounts/${id}`);
export const createAccount = (account_type) => api.post('/accounts', { account_type });
