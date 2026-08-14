import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export default {
  getDocuments: () => api.get('/documents').then(r => r.data.rows || []),
  createDocument: (data) => api.post('/documents', data),
  updateDocument: (id, data) => api.put(`/documents/${id}`, data),
  deleteDocument: (id) => api.delete(`/documents/${id}`),

  getDistributionRecords: (params) => api.get('/distribution-records', { params }).then(r => r.data.rows || []),
  markAsRead: (id) => api.post(`/distribution-records/${id}/read`),

  getTags: () => api.get('/tags').then(r => r.data.rows || []),
  createTag: (data) => api.post('/tags', data),
  updateTag: (id, data) => api.put(`/tags/${id}`, data),
  deleteTag: (id) => api.delete(`/tags/${id}`)
}
