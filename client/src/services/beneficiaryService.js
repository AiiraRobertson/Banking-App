import api from './api';

export const listBeneficiaries = (params) => api.get('/beneficiaries', { params });
export const saveBeneficiary = (data) => api.post('/beneficiaries', data);
export const touchBeneficiary = (id) => api.post(`/beneficiaries/${id}/touch`);
export const updateBeneficiary = (id, data) => api.patch(`/beneficiaries/${id}`, data);
export const deleteBeneficiary = (id) => api.delete(`/beneficiaries/${id}`);
