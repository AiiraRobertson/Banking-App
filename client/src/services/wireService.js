import api from './api';

export const getCountries = () => api.get('/wire/countries');
export const getRates = () => api.get('/wire/rates');
export const getQuote = (data) => api.post('/wire/quote', data);
export const sendWire = (data) => api.post('/wire/send', data);
export const getWireHistory = (params) => api.get('/wire/history', { params });
export const getWireDetail = (id) => api.get(`/wire/${id}`);
