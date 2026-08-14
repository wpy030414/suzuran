import axios from 'axios'
const api = axios.create({ baseURL: '/api' })

export default {
  // ─── Templates ───────────────────────────────────────────────
  getTemplates: (params) => api.get('/templates', { params }).then(r => r.data.rows || []),
  getTemplatesByType: (params) => api.get('/templates/by-type', { params }).then(r => r.data.rows || []),
  createTemplate: (data) => api.post('/templates', data),
  updateTemplate: (id, data) => api.put(`/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/templates/${id}`),

  // ─── Classrooms ──────────────────────────────────────────────
  getClassrooms: () => api.get('/classrooms').then(r => r.data.rows || []),
  createClassroom: (data) => api.post('/classrooms', data),
  updateClassroom: (id, data) => api.put(`/classrooms/${id}`, data),
  deleteClassroom: (id) => api.delete(`/classrooms/${id}`),
  getClassroomStudents: (id) => api.get(`/classrooms/${id}/students`).then(r => r.data),

  // ─── Academic Calendar ───────────────────────────────────────
  getCurrentCalendar: () => api.get('/academic-calendar/current').then(r => r.data),

  // ─── Assessments ─────────────────────────────────────────────
  getAssessments: (params) => api.get('/assessments', { params }).then(r => r.data.rows || []),
  getAssessmentsByStudent: (params) => api.get('/assessments/by-student', { params }).then(r => r.data.rows || []),
  createAssessment: (data) => api.post('/assessments', data),
  updateAssessment: (id, data) => api.put(`/assessments/${id}`, data),
  deleteAssessment: (id) => api.delete(`/assessments/${id}`),

  // ─── Report Cards ────────────────────────────────────────────
  getReportCards: (params) => api.get('/report-cards', { params }).then(r => r.data.rows || []),
  getReportCardDetail: (id) => api.get(`/report-cards/detail/${id}`).then(r => r.data),
  generateReportCard: (data) => api.post('/report-cards/generate', data),
  deleteReportCard: (id) => api.delete(`/report-cards/${id}`),

  // ─── Statistics ──────────────────────────────────────────────
  getCompositionStats: () => api.get('/stats/composition').then(r => r.data),
  getOralStats: () => api.get('/stats/oral').then(r => r.data),
}
