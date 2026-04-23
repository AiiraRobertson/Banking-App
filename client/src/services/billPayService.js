import api from './api';

export const getPayees = () => api.get('/billpay/payees');
export const addPayee = (data) => api.post('/billpay/payees', data);
export const updatePayee = (id, data) => api.put(`/billpay/payees/${id}`, data);
export const deletePayee = (id) => api.delete(`/billpay/payees/${id}`);
export const getScheduledPayments = () => api.get('/billpay/scheduled');
export const schedulePayment = (data) => api.post('/billpay/scheduled', data);
export const updateScheduledPayment = (id, data) => api.put(`/billpay/scheduled/${id}`, data);
export const cancelScheduledPayment = (id) => api.delete(`/billpay/scheduled/${id}`);
export const payNow = (data) => api.post('/billpay/pay-now', data);
