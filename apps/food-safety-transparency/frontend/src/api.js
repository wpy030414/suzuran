import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Auth header injection from localStorage
api.interceptors.request.use(config => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) config.headers['x-user-id'] = String(user.id);
    if (user.name) config.headers['x-user-name'] = user.name;
    if (user.role) config.headers['x-user-role'] = user.role;
  } catch (e) { /* ignore */ }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

function extractRows(r) {
  return r.data?.rows || r.data || [];
}

export default {
  // Auth
  getMe: () => api.get('/me').then(r => r.data),

  // Campuses
  getCampuses: () => api.get('/campuses').then(extractRows),
  createCampus: (data) => api.post('/campuses', data).then(r => r.data),
  updateCampus: (id, data) => api.put(`/campuses/${id}`, data).then(r => r.data),
  deleteCampus: (id) => api.delete(`/campuses/${id}`).then(r => r.data),

  // Periods
  getPeriods: () => api.get('/periods').then(extractRows),
  createPeriod: (data) => api.post('/periods', data).then(r => r.data),
  updatePeriod: (id, data) => api.put(`/periods/${id}`, data).then(r => r.data),
  deletePeriod: (id) => api.delete(`/periods/${id}`).then(r => r.data),

  // Standards
  getStandards: (params) => api.get('/standards', { params }).then(extractRows),
  createStandard: (data) => api.post('/standards', data).then(r => r.data),
  updateStandard: (id, data) => api.put(`/standards/${id}`, data).then(r => r.data),
  deleteStandard: (id) => api.delete(`/standards/${id}`).then(r => r.data),
  getStandardsStats: (params) => api.get('/standards/stats', { params }).then(r => r.data),

  // Menus
  getMenus: (params) => api.get('/menus', { params }).then(extractRows),
  createMenu: (data) => api.post('/menus', data).then(r => r.data),
  updateMenu: (id, data) => api.put(`/menus/${id}`, data).then(r => r.data),
  deleteMenu: (id) => api.delete(`/menus/${id}`).then(r => r.data),

  // Menu Items
  getMenuItems: (params) => api.get('/menu-items', { params }).then(extractRows),
  createMenuItem: (data) => api.post('/menu-items', data).then(r => r.data),
  batchMenuItems: (data) => api.post('/menu-items/batch', data).then(r => r.data),
  updateMenuItem: (id, data) => api.put(`/menu-items/${id}`, data).then(r => r.data),
  deleteMenuItem: (id) => api.delete(`/menu-items/${id}`).then(r => r.data),

  // Overview
  getOverview: (params) => api.get('/overview', { params }).then(r => r.data),
  getOverviewWeeks: () => api.get('/overview/weeks').then(r => r.data?.weeks || []),

  // Stats
  getStatsStandards: (params) => api.get('/stats/standards', { params }).then(r => r.data),
  getStatsMenus: (params) => api.get('/stats/menus', { params }).then(r => r.data),
  exportStats: (params) => {
    const qs = new URLSearchParams(params).toString();
    window.open(`/api/stats/export?${qs}`, '_blank');
  }
};
