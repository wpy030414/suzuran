import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export default {
  getVehicles: () => api.get('/vehicles').then(r => r.data.rows || []),
  createVehicle: (data) => api.post('/vehicles', data),
  updateVehicle: (id, data) => api.put(`/vehicles/${id}`, data),
  deleteVehicle: (id) => api.delete(`/vehicles/${id}`),

  getRequests: (params) => api.get('/requests', { params }).then(r => r.data.rows || []),
  createRequest: (data) => api.post('/requests', data),
  updateRequest: (id, data) => api.put(`/requests/${id}`, data),
  deleteRequest: (id) => api.delete(`/requests/${id}`),
  approveRequest: (id) => api.post(`/requests/${id}/approve`),

  getUsageLogs: (params) => api.get('/usage-logs', { params }).then(r => r.data.rows || []),
  createUsageLog: (data) => api.post('/usage-logs', data),
  updateUsageLog: (id, data) => api.put(`/usage-logs/${id}`, data)
}
