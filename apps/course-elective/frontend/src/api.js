import axios from 'axios'
const api = axios.create({ baseURL: '/api' })

export default {
  // Courses
  getCourses: (params) => api.get('/courses', { params }).then(r => r.data),
  getCourse: (id) => api.get(`/courses/${id}`).then(r => r.data),
  createCourse: (data) => api.post('/courses', data),
  updateCourse: (id, data) => api.put(`/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/courses/${id}`),

  // Enrollments
  getEnrollments: (params) => api.get('/enrollments', { params }).then(r => r.data.rows || []),
  enroll: (data) => api.post('/enrollments', data).then(r => r.data),
  unenroll: (id) => api.delete(`/enrollments/${id}`).then(r => r.data),
  getStudentEnrollments: (studentName, params) => api.get(`/students/${encodeURIComponent(studentName)}/enrollments`, { params }).then(r => r.data),

  // Periods
  getPeriods: () => api.get('/periods').then(r => r.data.rows || []),
  getActivePeriod: () => api.get('/periods/active').then(r => r.data),
  createPeriod: (data) => api.post('/periods', data),
  updatePeriod: (id, data) => api.put(`/periods/${id}`, data),
  deletePeriod: (id) => api.delete(`/periods/${id}`),

  // Categories
  getCategories: () => api.get('/categories').then(r => r.data.rows || []),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),

  // Stats
  getStatsByCourse: () => api.get('/stats/by-course').then(r => r.data.rows || []),
  getStatsByClassroom: () => api.get('/stats/by-classroom').then(r => r.data.rows || []),
  getCourseStudents: (courseId) => api.get(`/stats/course-students/${courseId}`).then(r => r.data),
  exportCourseStudents: (courseId) => api.get(`/export/course-students/${courseId}`).then(r => r.data),
}
