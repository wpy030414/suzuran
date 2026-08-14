import axios from 'axios'
const api = axios.create({ baseURL: '/api' })
export default {
  getPages: () => api.get('/pages').then(r => r.data.rows || []),
  createPage: (data) => api.post('/pages', data),
  updatePage: (id, data) => api.put(`/pages/${id}`, data),
  deletePage: (id) => api.delete(`/pages/${id}`),
  getCategories: () => api.get('/categories').then(r => r.data.rows || []),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`)
}
