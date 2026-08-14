import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export default {
  getCampuses: () => api.get('/campuses').then(r => r.data.rows || []),
  createCampus: (data) => api.post('/campuses', data),
  updateCampus: (id, data) => api.put(`/campuses/${id}`, data),
  deleteCampus: (id) => api.delete(`/campuses/${id}`),

  getShifts: (params) => api.get('/shifts', { params }).then(r => r.data.rows || []),
  createShift: (data) => api.post('/shifts', data),
  updateShift: (id, data) => api.put(`/shifts/${id}`, data),
  deleteShift: (id) => api.delete(`/shifts/${id}`),

  getLocations: (params) => api.get('/locations', { params }).then(r => r.data.rows || []),
  createLocation: (data) => api.post('/locations', data),
  updateLocation: (id, data) => api.put(`/locations/${id}`, data),
  deleteLocation: (id) => api.delete(`/locations/${id}`),

  getSchedules: (params) => api.get('/schedules', { params }).then(r => r.data.rows || []),
  createSchedule: (data) => api.post('/schedules', data),
  updateSchedule: (id, data) => api.put(`/schedules/${id}`, data),
  deleteSchedule: (id) => api.delete(`/schedules/${id}`),

  getSnapshots: (params) => api.get('/snapshots', { params }).then(r => r.data.rows || []),
  createSnapshot: (data) => api.post('/snapshots', data),
  updateSnapshot: (id, data) => api.put(`/snapshots/${id}`, data),

  getSubstitutions: () => api.get('/substitutions').then(r => r.data.rows || []),
  createSubstitution: (data) => api.post('/substitutions', data),
  updateSubstitution: (id, data) => api.put(`/substitutions/${id}`, data),

  getInspections: (params) => api.get('/inspections', { params }).then(r => r.data.rows || []),
  createInspection: (data) => api.post('/inspections', data),

  getWeeklyPlans: (params) => api.get('/weekly-plans', { params }).then(r => r.data.rows || []),
  createWeeklyPlan: (data) => api.post('/weekly-plans', data),
  updateWeeklyPlan: (id, data) => api.put(`/weekly-plans/${id}`, data)
}
