import axios from 'axios'
const api = axios.create({ baseURL: '/api' })

export default {
  // Campuses
  getCampuses: () => api.get('/campuses').then(r => r.data.rows || []),
  createCampus: (data) => api.post('/campuses', data),
  updateCampus: (id, data) => api.put(`/campuses/${id}`, data),
  deleteCampus: (id) => api.delete(`/campuses/${id}`),

  // Classrooms
  getClassrooms: (params) => api.get('/classrooms', { params }).then(r => r.data.rows || []),
  createClassroom: (data) => api.post('/classrooms', data),
  updateClassroom: (id, data) => api.put(`/classrooms/${id}`, data),
  deleteClassroom: (id) => api.delete(`/classrooms/${id}`),

  // Subjects
  getSubjects: () => api.get('/subjects').then(r => r.data.rows || []),
  createSubject: (data) => api.post('/subjects', data),

  // Time Slots
  getTimeSlots: (params) => api.get('/time-slots', { params }).then(r => r.data.rows || []),
  createTimeSlot: (data) => api.post('/time-slots', data),

  // Teachers
  getTeachers: () => api.get('/teachers').then(r => r.data.rows || []),
  createTeacher: (data) => api.post('/teachers', data),

  // Schedules
  getSchedules: (params) => api.get('/schedules', { params }).then(r => r.data.rows || []),
  getRealtimeSchedule: (params) => api.get('/schedules/realtime', { params }).then(r => r.data),
  createSchedule: (data) => api.post('/schedules', data),
  updateSchedule: (id, data) => api.put(`/schedules/${id}`, data),
  deleteSchedule: (id) => api.delete(`/schedules/${id}`),

  // Substitutions
  getSubstitutions: (params) => api.get('/substitutions', { params }).then(r => r.data.rows || []),
  createSubstitution: (data) => api.post('/substitutions', data),
  confirmSubstitution: (id, confirmerId) => api.post(`/substitutions/${id}/confirm`, { confirmer_id: confirmerId }),
  rejectSubstitution: (id) => api.post(`/substitutions/${id}/reject`),
  cancelSubstitution: (id, cancelerId) => api.post(`/substitutions/${id}/cancel`, { canceler_id: cancelerId }),

  // Config
  getConfig: () => api.get('/config').then(r => r.data),
  updateConfig: (data) => api.put('/config', data),
  verifyPassword: (password) => api.post('/config/verify-password', { password }).then(r => r.data),

  // Import logs
  getImportLogs: () => api.get('/import-logs').then(r => r.data.rows || []),
  createImportLog: (data) => api.post('/import-logs', data),

  // Inspection
  getInspection: (data) => api.post('/inspections', data).then(r => r.data),

  // Stats
  getSubstitutionStats: () => api.get('/stats/substitutions').then(r => r.data),
}
