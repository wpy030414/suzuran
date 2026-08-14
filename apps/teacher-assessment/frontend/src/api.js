import axios from 'axios'
const api = axios.create({ baseURL: '/api' })

// Inject role header from localStorage
api.interceptors.request.use(config => {
  const role = localStorage.getItem('user_role') || 'admin'
  config.headers['x-user-role'] = role
  return config
})

export default {
  // Teachers
  getTeachers: () => api.get('/teachers').then(r => r.data.rows || []),
  createTeacher: (data) => api.post('/teachers', data),
  updateTeacher: (id, data) => api.put(`/teachers/${id}`, data),
  deleteTeacher: (id) => api.delete(`/teachers/${id}`),

  // Weekly Events
  getWeeklyEvents: () => api.get('/weekly-events').then(r => r.data.rows || []),
  createWeeklyEvent: (data) => api.post('/weekly-events', data),
  updateWeeklyEvent: (id, data) => api.put(`/weekly-events/${id}`, data),
  deleteWeeklyEvent: (id) => api.delete(`/weekly-events/${id}`),

  // Awards
  getAwards: (params) => api.get('/awards', { params }).then(r => r.data.rows || []),
  createAward: (data) => api.post('/awards', data),
  updateAward: (id, data) => api.put(`/awards/${id}`, data),
  deleteAward: (id) => api.delete(`/awards/${id}`),
  approveAward: (id) => api.post(`/awards/${id}/approve`),
  rejectAward: (id, reason) => api.post(`/awards/${id}/reject`, { reject_reason: reason }),

  // Award Categories
  getAwardCategories: (params) => api.get('/award-categories', { params }).then(r => r.data.rows || []),
  createAwardCategory: (data) => api.post('/award-categories', data),
  updateAwardCategory: (id, data) => api.put(`/award-categories/${id}`, data),
  deleteAwardCategory: (id) => api.delete(`/award-categories/${id}`),

  // Deduction Categories
  getDeductionCategories: () => api.get('/deduction-categories').then(r => r.data.rows || []),
  createDeductionCategory: (data) => api.post('/deduction-categories', data),

  // Semester Assessments
  getSemesterAssessments: (params) => api.get('/semester-assessments', { params }).then(r => r.data.rows || []),
  createSemesterAssessment: (data) => api.post('/semester-assessments', data),
  updateSemesterAssessment: (id, data) => api.put(`/semester-assessments/${id}`, data),
  deleteSemesterAssessment: (id) => api.delete(`/semester-assessments/${id}`),
  getSemesterItems: (id) => api.get(`/semester-assessments/${id}/items`).then(r => r.data.rows || []),
  updateSemesterItem: (assessmentId, itemId, data) => api.put(`/semester-assessments/${assessmentId}/items/${itemId}`, data),
  calculateSemester: (id) => api.post(`/semester-assessments/${id}/calculate`),

  // Annual Assessments
  getAnnualAssessments: (params) => api.get('/annual-assessments', { params }).then(r => r.data.rows || []),
  createAnnualAssessment: (data) => api.post('/annual-assessments', data),
  updateAnnualAssessment: (id, data) => api.put(`/annual-assessments/${id}`, data),
  deleteAnnualAssessment: (id) => api.delete(`/annual-assessments/${id}`),
  getAnnualItems: (id) => api.get(`/annual-assessments/${id}/items`).then(r => r.data.rows || []),
  updateAnnualItem: (assessmentId, itemId, data) => api.put(`/annual-assessments/${assessmentId}/items/${itemId}`, data),
  calculateAnnual: (id) => api.post(`/annual-assessments/${id}/calculate`),

  // Periods
  getPeriods: () => api.get('/periods').then(r => r.data.rows || []),
  createPeriod: (data) => api.post('/periods', data),

  // Statistics
  getSemesterStats: () => api.get('/stats/semester').then(r => r.data),
  getAnnualStats: () => api.get('/stats/annual').then(r => r.data),
  getAnnualRanking: () => api.get('/ranking/annual').then(r => r.data.rows || []),
}
