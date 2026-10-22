import api from './api';

export const getExchangeQuote = (data) => api.post('/exchange/quote', data);
export const convertCurrency = (quote_id) => api.post('/exchange/convert', { quote_id });
