// LifeDrop API Module

// Resolve backend URL at runtime based on the current environment.
// Priority:
//   1. window.LIFEDROP_API_URL  — explicit override (set before this script loads)
//   2. Railway production       — any non-localhost hostname uses the Railway backend
//   3. Local development        — localhost / 127.0.0.1 falls back to localhost:5000
(function () {
  const RAILWAY_BACKEND = 'https://lifedrop-backend-production.up.railway.app';
  const LOCAL_BACKEND   = 'http://localhost:5000';

  const isLocal = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === ''
  );

  const backendOrigin =
    window.LIFEDROP_API_URL ||
    (isLocal ? LOCAL_BACKEND : RAILWAY_BACKEND);

  window.API_BASE   = backendOrigin + '/api';
  window.SOCKET_URL = backendOrigin;
})();

const API_BASE   = window.API_BASE;
const SOCKET_URL = window.SOCKET_URL;

const api = {
  getToken: () => localStorage.getItem('lifedrop_token'),

  getHeaders: () => ({
    'Content-Type': 'application/json',
    ...(localStorage.getItem('lifedrop_token')
      ? { Authorization: `Bearer ${localStorage.getItem('lifedrop_token')}` }
      : {}),
  }),

  async request(method, endpoint, body = null, isFormData = false) {
    const headers = isFormData
      ? { Authorization: `Bearer ${localStorage.getItem('lifedrop_token')}` }
      : api.getHeaders();

    const options = { method, headers };
    if (body) options.body = isFormData ? body : JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') throw new Error('Cannot connect to server. Make sure the backend is running.');
      throw err;
    }
  },

  get: (endpoint) => api.request('GET', endpoint),
  post: (endpoint, body) => api.request('POST', endpoint, body),
  put: (endpoint, body) => api.request('PUT', endpoint, body),
  delete: (endpoint) => api.request('DELETE', endpoint),
  postForm: (endpoint, formData) => api.request('POST', endpoint, formData, true),

  // Auth
  auth: {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    me: () => api.get('/auth/me'),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (data) => api.post('/auth/reset-password', data),
  },

  // Donors
  donors: {
    getAll: () => api.get('/donors'),
    getEligible: () => api.get('/donors/eligible'),
    getNearby: (city, bloodGroup) => api.get(`/donors/nearby?city=${city}&bloodGroup=${bloodGroup}`),
    getProfile: () => api.get('/donors/profile'),
    updateProfile: (data) => api.put('/donors/profile', data),
    getHistory: () => api.get('/donors/history'),
    uploadDocument: (formData) => api.postForm('/donors/upload-document', formData),
  },

  // Blood requests
  bloodRequests: {
    create: (data) => api.post('/blood-requests', data),
    getAll: (params = '') => api.get(`/blood-requests${params}`),
    getById: (id) => api.get(`/blood-requests/${id}`),
    update: (id, data) => api.put(`/blood-requests/${id}`, data),
    delete: (id) => api.delete(`/blood-requests/${id}`),
    accept: (id) => api.post(`/blood-requests/${id}/accept`),
    fulfill: (id) => api.post(`/blood-requests/${id}/fulfill`),
    matchDonors: (id) => api.post(`/blood-requests/${id}/match-donors`),
  },

  // Inventory
  inventory: {
    add: (data) => api.post('/inventory', data),
    getAll: () => api.get('/inventory'),
    update: (id, data) => api.put(`/inventory/${id}`, data),
    delete: (id) => api.delete(`/inventory/${id}`),
    getLowStock: () => api.get('/inventory/low-stock'),
  },

  // Hospitals
  hospitals: {
    getAll: () => api.get('/hospitals'),
    getById: (id) => api.get(`/hospitals/${id}`),
    getProfile: () => api.get('/hospitals/profile'),
    updateProfile: (data) => api.put('/hospitals/profile', data),
    getMatchedDonors: (params) => api.get(`/hospitals/matched-donors?${params}`),
    notifyDonor: (data) => api.post('/hospitals/notify-donor', data),
  },

  // Recipients
  recipients: {
    getProfile: () => api.get('/recipients/profile'),
    updateProfile: (data) => api.put('/recipients/profile', data),
    requestBlood: (data) => api.post('/recipients/request-blood', data),
  },

  // Appointments
  appointments: {
    create: (data) => api.post('/appointments', data),
    getAll: () => api.get('/appointments'),
    approve: (id) => api.put(`/appointments/${id}/approve`),
    cancel: (id) => api.put(`/appointments/${id}/cancel`),
    complete: (id) => api.put(`/appointments/${id}/complete`),
  },

  // Notifications
  notifications: {
    getAll: () => api.get('/notifications'),
    markRead: (id) => api.put(`/notifications/${id}/read`),
    markAllRead: () => api.put('/notifications/read-all'),
  },

  // Admin alerts (ticker management)
  alerts: {
    getActive: ()         => api.get('/alerts'),
    getAll:    ()         => api.get('/alerts/all'),
    create:    (data)     => api.post('/alerts', data),
    update:    (id, data) => api.put(`/alerts/${id}`, data),
    delete:    (id)       => api.delete(`/alerts/${id}`),
  },

  // Ticker (public live alerts)
  ticker: {
    get: () => api.get('/ticker'),
  },

  // Reviews
  reviews: {
    getAll: (params = {}) => {
      const q = new URLSearchParams();
      if (params.page)   q.append('page',   params.page);
      if (params.limit)  q.append('limit',  params.limit);
      if (params.rating) q.append('rating', params.rating);
      if (params.sort)   q.append('sort',   params.sort);
      return api.get(`/reviews?${q.toString()}`);
    },
    getMyReview: ()           => api.get('/reviews/my'),
    create:      (data)       => api.post('/reviews', data),
    update:      (id, data)   => api.put(`/reviews/${id}`, data),
    delete:      (id)         => api.delete(`/reviews/${id}`),
    markHelpful: (id)         => api.put(`/reviews/${id}/helpful`),
  },

  // Admin
  admin: {
    getStats: () => api.get('/admin/stats'),
    getUsers: () => api.get('/admin/users'),
    updateUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
    getPendingHospitals: () => api.get('/admin/hospitals/pending'),
    verifyHospital: (id, status) => api.put(`/admin/hospitals/${id}/verify`, { status }),
    getAuditLogs: () => api.get('/admin/audit-logs'),
  },
};

window.api = api;
