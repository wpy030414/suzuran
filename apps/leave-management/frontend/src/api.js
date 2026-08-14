import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export default {
  getLeaveTypes: () => api.get('/leave-types').then(r => r.data.rows || []),
  createLeaveType: (data) => api.post('/leave-types', data),
  updateLeaveType: (id, data) => api.put(`/leave-types/${id}`, data),
  deleteLeaveType: (id) => api.delete(`/leave-types/${id}`),

  getLeaveRequests: (params) => api.get('/leave-requests', { params }).then(r => r.data.rows || []),
  createLeaveRequest: (data) => api.post('/leave-requests', data),
  updateLeaveRequest: (id, data) => api.put(`/leave-requests/${id}`, data),
  deleteLeaveRequest: (id) => api.delete(`/leave-requests/${id}`),
  approveLeaveRequest: (id) => api.post(`/leave-requests/${id}/approve`),

  getLeaveBalances: (params) => api.get('/leave-balances', { params }).then(r => r.data.rows || []),
  createLeaveBalance: (data) => api.post('/leave-balances', data),
  updateLeaveBalance: (id, data) => api.put(`/leave-balances/${id}`, data),
  deleteLeaveBalance: (id) => api.delete(`/leave-balances/${id}`)
}
