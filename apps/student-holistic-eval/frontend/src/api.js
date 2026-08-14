import axios from 'axios'
const api = axios.create({ baseURL: '/api' })
export default {
  // Classrooms
  getClassrooms: (params) => api.get('/classrooms', { params }).then(r => r.data.rows || []),
  createClassroom: (data) => api.post('/classrooms', data),
  updateClassroom: (id, data) => api.put(`/classrooms/${id}`, data),
  deleteClassroom: (id) => api.delete(`/classrooms/${id}`),

  // Students
  getStudents: (params) => api.get('/students', { params }).then(r => r.data.rows || []),
  getStudentsByClassroom: (classroomId) => api.get('/students/by-classroom', { params: { classroom_id: classroomId } }).then(r => r.data.rows || []),
  createStudent: (data) => api.post('/students', data),
  updateStudent: (id, data) => api.put(`/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/students/${id}`),

  // Behavior Evaluations
  getBehaviorEvaluations: (params) => api.get('/behavior-evaluations', { params }).then(r => r.data.rows || []),
  getBehaviorByStudent: (studentId, academicYear) => api.get('/behavior-evaluations/by-student', { params: { student_id: studentId, academic_year: academicYear } }).then(r => r.data.rows || []),
  createBehaviorEvaluation: (data) => api.post('/behavior-evaluations', data),
  batchCreateBehaviorEvaluations: (evaluations) => api.post('/behavior-evaluations/batch', { evaluations }),
  updateBehaviorEvaluation: (id, data) => api.put(`/behavior-evaluations/${id}`, data),
  deleteBehaviorEvaluation: (id) => api.delete(`/behavior-evaluations/${id}`),

  // Learning Evaluations
  getLearningEvaluations: (params) => api.get('/learning-evaluations', { params }).then(r => r.data.rows || []),
  getLearningByStudent: (studentId, academicYear) => api.get('/learning-evaluations/by-student', { params: { student_id: studentId, academic_year: academicYear } }).then(r => r.data.rows || []),
  createLearningEvaluation: (data) => api.post('/learning-evaluations', data),
  batchCreateLearningEvaluations: (evaluations) => api.post('/learning-evaluations/batch', { evaluations }),
  updateLearningEvaluation: (id, data) => api.put(`/learning-evaluations/${id}`, data),
  deleteLearningEvaluation: (id) => api.delete(`/learning-evaluations/${id}`),

  // Templates
  getTemplates: (params) => api.get('/templates', { params }).then(r => r.data.rows || []),
  getTemplateImages: (segment) => api.get('/template-images', { params: { segment } }).then(r => r.data.rows || []),
  createTemplate: (data) => api.post('/templates', data),
  updateTemplate: (id, data) => api.put(`/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/templates/${id}`),

  // Reports
  getReports: (params) => api.get('/reports', { params }).then(r => r.data.rows || []),
  getReport: (id) => api.get(`/reports/${id}`).then(r => r.data),
  generateReport: (data) => api.post('/reports/generate', data),
  deleteReport: (id) => api.delete(`/reports/${id}`),

  // Statistics
  getBehaviorStats: (params) => api.get('/stats/behavior', { params }).then(r => r.data),
  getLearningStats: (params) => api.get('/stats/learning', { params }).then(r => r.data),
  getCrossDimensionalStats: (params) => api.get('/stats/cross-dimensional', { params }).then(r => r.data),
}
