import api from './api';

export const getRates = (base = 'USD') => api.get('/currency/rates', { params: { base } });
export const convertCurrency = (from, to, amount) =>
  api.get('/currency/convert', { params: { from, to, amount } });
