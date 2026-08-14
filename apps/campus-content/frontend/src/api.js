import axios from 'axios'
const api = axios.create({ baseURL: '/api' })
export default {
  getNews: () => api.get('/news').then(r => r.data.rows || []),
  createNews: (data) => api.post('/news', data),
  updateNews: (id, data) => api.put(`/news/${id}`, data),
  deleteNews: (id) => api.delete(`/news/${id}`),
  getTutorials: () => api.get('/tutorials').then(r => r.data.rows || []),
  createTutorial: (data) => api.post('/tutorials', data),
  updateTutorial: (id, data) => api.put(`/tutorials/${id}`, data),
  deleteTutorial: (id) => api.delete(`/tutorials/${id}`),
  getPosts: () => api.get('/posts').then(r => r.data.rows || []),
  getPostsRanked: () => api.get('/posts/ranked').then(r => r.data.rows || []),
  createPost: (data) => api.post('/posts', data),
  updatePost: (id, data) => api.put(`/posts/${id}`, data),
  deletePost: (id) => api.delete(`/posts/${id}`),
  getArtworks: () => api.get('/artworks').then(r => r.data.rows || []),
  getArtworksRanked: () => api.get('/artworks/ranked').then(r => r.data.rows || []),
  createArtwork: (data) => api.post('/artworks', data),
  updateArtwork: (id, data) => api.put(`/artworks/${id}`, data),
  deleteArtwork: (id) => api.delete(`/artworks/${id}`),
  toggleLike: (data) => api.post('/likes', data),
  getCategories: () => api.get('/categories').then(r => r.data.rows || []),
  createCategory: (data) => api.post('/categories', data)
}
