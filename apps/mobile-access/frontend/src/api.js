import axios from 'axios'
const api = axios.create({ baseURL: '/api' })
export default {
  // 设备
  getDevices: (params) => api.get('/devices', { params }).then(r => r.data.rows || []),
  createDevice: (data) => api.post('/devices', data),
  updateDevice: (id, data) => api.put(`/devices/${id}`, data),
  deleteDevice: (id) => api.delete(`/devices/${id}`),
  unlockDevice: (id, data) => api.post(`/devices/${id}/unlock`, data),

  // 设备状态
  getDevicesStatus: () => api.get('/devices/status').then(r => r.data),
  getDeviceStatus: (id) => api.get(`/devices/${id}/status`).then(r => r.data),
  sendHeartbeat: (id) => api.post(`/devices/${id}/heartbeat`).then(r => r.data),
  getMonitoringDashboard: () => api.get('/monitoring/dashboard').then(r => r.data),

  // 日志
  getLogs: (params) => api.get('/logs', { params }).then(r => r.data.rows || []),

  // 权限
  getPermissions: (params) => api.get('/permissions', { params }).then(r => r.data.rows || []),
  createPermission: (data) => api.post('/permissions', data),
  updatePermission: (id, data) => api.put(`/permissions/${id}`, data),
  deletePermission: (id) => api.delete(`/permissions/${id}`),

  // 凭据
  getCredentials: () => api.get('/credentials').then(r => r.data),
  createCredential: (data) => api.post('/credentials', data),

  // 统计
  getAccessCount: (params) => api.get('/statistics/access-count', { params }).then(r => r.data),
  getStatsByDevice: () => api.get('/statistics/by-device').then(r => r.data),
  getStatsByUser: () => api.get('/statistics/by-user').then(r => r.data),
  getErrorRate: (params) => api.get('/statistics/error-rate', { params }).then(r => r.data),
  getPeakHours: (params) => api.get('/statistics/peak-hours', { params }).then(r => r.data)
}
