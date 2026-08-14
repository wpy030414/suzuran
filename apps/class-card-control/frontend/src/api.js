import axios from 'axios'
const api = axios.create({ baseURL: '/api' })
export default {
  getClients: () => api.get('/clients').then(r => r.data.rows || []),
  createClient: (data) => api.post('/clients', data),
  updateClient: (id, data) => api.put(`/clients/${id}`, data),
  deleteClient: (id) => api.delete(`/clients/${id}`),
  getPlaylists: () => api.get('/playlists').then(r => r.data.rows || []),
  createPlaylist: (data) => api.post('/playlists', data),
  updatePlaylist: (id, data) => api.put(`/playlists/${id}`, data),
  deletePlaylist: (id) => api.delete(`/playlists/${id}`),
  getConfigs: () => api.get('/configs').then(r => r.data.rows || []),
  createConfig: (data) => api.post('/configs', data),
  updateConfig: (id, data) => api.put(`/configs/${id}`, data),
  deleteConfig: (id) => api.delete(`/configs/${id}`)
}
