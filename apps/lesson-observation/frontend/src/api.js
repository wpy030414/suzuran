import axios from 'axios'
const api = axios.create({ baseURL: '/api' })

export default {
  // Announcements
  getAnnouncements: () => api.get('/announcements').then(r => r.data.rows || []),
  getLatestAnnouncement: () => api.get('/announcements/latest').then(r => r.data),
  createAnnouncement: (data) => api.post('/announcements', data),
  updateAnnouncement: (id, data) => api.put(`/announcements/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`/announcements/${id}`),

  // Appointments
  getAppointments: (params) => api.get('/appointments', { params }).then(r => r.data.rows || []),
  getAppointment: (id) => api.get(`/appointments/${id}`).then(r => r.data),
  createAppointment: (data) => api.post('/appointments', data).then(r => r.data),
  approveAppointment: (id, comment) => api.post(`/appointments/${id}/approve`, { comment }).then(r => r.data),
  rejectAppointment: (id, comment) => api.post(`/appointments/${id}/reject`, { comment }).then(r => r.data),
  updateAppointment: (id, data) => api.put(`/appointments/${id}`, data),
  deleteAppointment: (id) => api.delete(`/appointments/${id}`),

  // Tasks
  getTasks: (params) => api.get('/tasks', { params }).then(r => r.data.rows || []),
  completeTask: (id) => api.put(`/tasks/${id}/complete`).then(r => r.data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),

  // Evaluation Scales
  getScales: () => api.get('/scales').then(r => r.data.rows || []),
  getScale: (id) => api.get(`/scales/${id}`).then(r => r.data),
  createScale: (data) => api.post('/scales', data),
  updateScale: (id, data) => api.put(`/scales/${id}`, data),
  deleteScale: (id) => api.delete(`/scales/${id}`),

  // Evaluation Records
  getEvaluations: (params) => api.get('/evaluations', { params }).then(r => r.data.rows || []),
  createEvaluation: (data) => api.post('/evaluations', data).then(r => r.data),
  updateEvaluation: (id, data) => api.put(`/evaluations/${id}`, data),

  // Discussion Records
  getDiscussions: (params) => api.get('/discussions', { params }).then(r => r.data.rows || []),
  createDiscussion: (data) => api.post('/discussions', data).then(r => r.data),

  // Collective Prep Records
  getPrepRecords: (params) => api.get('/prep-records', { params }).then(r => r.data.rows || []),
  createPrepRecord: (data) => api.post('/prep-records', data).then(r => r.data),

  // Stats
  getCompletionStats: (params) => api.get('/stats/completion', { params }).then(r => r.data),
  getEvaluationScores: (params) => api.get('/stats/evaluation-scores', { params }).then(r => r.data),
  getOverview: () => api.get('/stats/overview').then(r => r.data),
  exportTeacherRecords: (teacherId) => api.get(`/export/teacher-records/${teacherId}`).then(r => r.data),
}
