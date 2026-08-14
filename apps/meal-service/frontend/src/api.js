import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Inject demo auth headers from localStorage
api.interceptors.request.use(config => {
  const userId = localStorage.getItem('demo_user_id')
  const userName = localStorage.getItem('demo_user_name')
  const userRole = localStorage.getItem('demo_user_role')
  if (userId) config.headers['x-user-id'] = userId
  if (userName) config.headers['x-user-name'] = userName
  if (userRole) config.headers['x-user-role'] = userRole
  return config
})

// ---- Auth / Context ----
export const getMe = () => api.get('/me').then(r => r.data)

// ---- Users ----
export const getUsers = () => api.get('/users').then(r => r.data.rows || [])
export const saveUser = (data) => api.post('/users', data).then(r => r.data)

// ---- Periods ----
export const getPeriods = () => api.get('/periods').then(r => r.data.rows || [])
export const createPeriod = (data) => api.post('/periods', data).then(r => r.data)
export const deletePeriod = (id) => api.delete(`/periods/${id}`).then(r => r.data)

// ---- Registrations ----
export const getRegistrations = (params) => api.get('/registrations', { params }).then(r => r.data.rows || [])
export const createRegistration = (data) => api.post('/registrations', data).then(r => r.data)

// ---- Orders ----
export const getOrders = (params) => api.get('/orders', { params }).then(r => r.data.rows || [])
export const createOrder = (data) => api.post('/orders', data).then(r => r.data)
export const batchCreateOrders = (orders) => api.post('/orders/batch', { orders }).then(r => r.data)

// ---- Status ----
export const getStatus = (params) => api.get('/status', { params }).then(r => r.data.rows || [])
export const createStatus = (data) => api.post('/status', data).then(r => r.data)
export const batchCreateStatus = (statuses) => api.post('/status/batch', { statuses }).then(r => r.data)

// ---- Stats ----
export const getStatsOverview = () => api.get('/stats/overview').then(r => r.data)
export const getStatsDaily = (params) => api.get('/stats/daily', { params }).then(r => r.data)
export const getStatsByUser = (params) => api.get('/stats/by-user', { params }).then(r => r.data)
export const exportStatsCsv = (params) => `/api/stats/export?${new URLSearchParams(params).toString()}`

// ---- Reviews ----
export const getReviews = (params) => api.get('/reviews', { params }).then(r => r.data.rows || [])
export const generateReview = (data) => api.post('/reviews/generate', data).then(r => r.data)

export default {
  getMe,
  getUsers, saveUser,
  getPeriods, createPeriod, deletePeriod,
  getRegistrations, createRegistration,
  getOrders, createOrder, batchCreateOrders,
  getStatus, createStatus, batchCreateStatus,
  getStatsOverview, getStatsDaily, getStatsByUser, exportStatsCsv,
  getReviews, generateReview
}
