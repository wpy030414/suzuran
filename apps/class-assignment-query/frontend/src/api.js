import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export default {
  getBatches: () => api.get('/batches').then(r => r.data.rows || []),
  createBatch: (data) => api.post('/batches', data),
  updateBatch: (id, data) => api.put(`/batches/${id}`, data),
  deleteBatch: (id) => api.delete(`/batches/${id}`),

  getResults: (params) => api.get('/results', { params }).then(r => r.data.rows || []),
  createResult: (data) => api.post('/results', data),
  batchCreateResults: (data) => api.post('/results/batch', data),
  updateResult: (id, data) => api.put(`/results/${id}`, data),
  deleteResult: (id) => api.delete(`/results/${id}`),

  queryAssignment: (data) => api.post('/query', data)
}
