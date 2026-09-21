import api from './api';

export const getServiceCatalog = () => api.get('/billpay/catalog');
export const makeServicePayment = (data) => api.post('/billpay/payments', data);
export const getServicePayments = () => api.get('/billpay/payments');
export const getEmployees = () => api.get('/billpay/payroll/employees');
export const getPayrollGroups = () => api.get('/billpay/payroll/groups');
export const addPayrollGroup = (data) => api.post('/billpay/payroll/groups', data);
export const updatePayrollGroup = (id, data) => api.put(`/billpay/payroll/groups/${id}`, data);
export const removePayrollGroup = (id) => api.delete(`/billpay/payroll/groups/${id}`);
export const addEmployee = (data) => api.post('/billpay/payroll/employees', data);
export const updateEmployee = (id, data) => api.put(`/billpay/payroll/employees/${id}`, data);
export const removeEmployee = (id) => api.delete(`/billpay/payroll/employees/${id}`);
export const getPayrollRuns = () => api.get('/billpay/payroll/runs');
export const createPayrollRun = (data) => api.post('/billpay/payroll/runs', data);
export const authorizePayrollRun = (id) => api.post(`/billpay/payroll/runs/${id}/authorize`);
export const cancelPayrollRun = (id) => api.post(`/billpay/payroll/runs/${id}/cancel`);
