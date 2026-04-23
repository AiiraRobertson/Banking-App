import api from './api';

export const calculateLoan = (data) => api.post('/calculator/loan', data);
