import api from './api';

export const getFundingMethods = () => api.get('/funding/methods');
export const createFundingQuote = (payload) => api.post('/funding/quote', payload);
export const startFunding = (payload, idempotencyKey) => api.post('/funding/checkout', payload, {
  headers: { 'Idempotency-Key': idempotencyKey },
});
export const verifyFunding = (payload) => api.post('/funding/verify', payload);
export const getFundingPayments = () => api.get('/funding/payments');
export const getFundingPayment = (reference) => api.get(`/funding/payments/${encodeURIComponent(reference)}`);