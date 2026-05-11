import api from './api';

export const topUp = (data) => api.post('/funding/topup', data);
