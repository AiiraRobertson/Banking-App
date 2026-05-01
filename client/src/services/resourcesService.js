import api from './api';

export const submitContact = (data) => api.post('/resources/contact', data);
export const submitComplaint = (data) => api.post('/resources/complaint', data);
export const submitFeedback = (data) => api.post('/resources/feedback', data);
export const submitReview = (data) => api.post('/resources/reviews', data);
export const getReviews = () => api.get('/resources/reviews');
