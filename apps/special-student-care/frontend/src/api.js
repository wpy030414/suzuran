import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Helper: attach user context headers (in real app, from auth store)
function setAuthHeaders() {
  // In production, these come from auth context
  const userId = localStorage.getItem('user_id') || '1'
  const userName = localStorage.getItem('user_name') || '测试教师'
  const userRole = localStorage.getItem('user_role') || 'teacher'
  return {
    'x-user-id': userId,
    'x-user-name': userName,
    'x-user-role': userRole
  }
}

export default {
  // ─── Configuration ───
  getCareLevels: () => api.get('/care-levels').then(r => r.data.rows || []),
  createCareLevel: (data) => api.post('/care-levels', data),
  updateCareLevel: (id, data) => api.put(`/care-levels/${id}`, data),
  deleteCareLevel: (id) => api.delete(`/care-levels/${id}`),

  getGrades: () => api.get('/grades').then(r => r.data.rows || []),
  createGrade: (data) => api.post('/grades', data),
  updateGrade: (id, data) => api.put(`/grades/${id}`, data),
  deleteGrade: (id) => api.delete(`/grades/${id}`),

  getClasses: (params) => api.get('/classes', { params }).then(r => r.data.rows || []),
  createClass: (data) => api.post('/classes', data),
  updateClass: (id, data) => api.put(`/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/classes/${id}`),

  getPsychologicalTeachers: () => api.get('/psychological-teachers').then(r => r.data.rows || []),
  addPsychologicalTeacher: (data) => api.post('/psychological-teachers', data),
  removePsychologicalTeacher: (id) => api.delete(`/psychological-teachers/${id}`),

  // ─── Students ───
  getStudents: (params) => api.get('/students', { params, headers: setAuthHeaders() }).then(r => r.data.rows || []),
  createStudent: (data) => api.post('/students', data, { headers: setAuthHeaders() }),
  updateStudent: (id, data) => api.put(`/students/${id}`, data, { headers: setAuthHeaders() }),
  deleteStudent: (id) => api.delete(`/students/${id}`, { headers: setAuthHeaders() }),

  // ─── Plans ───
  getPlans: (params) => api.get('/plans', { params }).then(r => r.data.rows || []),
  createPlan: (data) => api.post('/plans', data, { headers: setAuthHeaders() }),
  getPlanItems: (params) => api.get('/plan-items', { params }).then(r => r.data.rows || []),
  updatePlanItem: (id, data) => api.put(`/plan-items/${id}`, data, { headers: setAuthHeaders() }),

  // ─── Care Records ───
  getRecords: (params) => api.get('/records', { params, headers: setAuthHeaders() }).then(r => r.data.rows || []),
  createRecord: (data) => api.post('/records', data, { headers: setAuthHeaders() }),
  updateRecord: (id, data) => api.put(`/records/${id}`, data, { headers: setAuthHeaders() }),
  deleteRecord: (id) => api.delete(`/records/${id}`, { headers: setAuthHeaders() }),

  // ─── Pause Requests ───
  getPauseRequests: (params) => api.get('/pause-requests', { params }).then(r => r.data.rows || []),
  createPauseRequest: (data) => api.post('/pause-requests', data, { headers: setAuthHeaders() }),
  approvePauseRequest: (id, action) => api.post(`/pause-requests/${id}/approve`, { action }, { headers: setAuthHeaders() }),

  // ─── Dashboard ───
  getHomeDashboard: () => api.get('/dashboard/home', { headers: setAuthHeaders() }).then(r => r.data),
  getPlanReport: (params) => api.get('/dashboard/plan-report', { params }).then(r => r.data),
  getStudentSurvey: (params) => api.get('/dashboard/student-survey', { params }).then(r => r.data),
  getCareStats: (params) => api.get('/dashboard/care-stats', { params }).then(r => r.data),

  // ─── Reminders ───
  getReminders: () => api.get('/reminders', { headers: setAuthHeaders() }).then(r => r.data.rows || []),
  markReminderRead: (id) => api.put(`/reminders/${id}/read`),
  batchRemind: (data) => api.post('/reminders/batch', data, { headers: setAuthHeaders() }),

  // ─── Academic Info ───
  getAcademicInfo: () => api.get('/academic-info').then(r => r.data)
}
