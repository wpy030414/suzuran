import axios from 'axios'
const api = axios.create({ baseURL: '/api' })

export default {
  // Classrooms (with teacher config)
  getClassrooms: (params) => api.get('/classrooms', { params }).then(r => r.data.rows || []),
  getClassroom: (id) => api.get(`/classrooms/${id}`).then(r => r.data),
  getClassroomsByHomeroom: (teacherId) => api.get(`/classrooms/by-homeroom/${teacherId}`).then(r => r.data.rows || []),
  getClassroomsByPE: (teacherId) => api.get(`/classrooms/by-pe-teacher/${teacherId}`).then(r => r.data.rows || []),
  createClassroom: (data) => api.post('/classrooms', data),
  updateClassroom: (id, data) => api.put(`/classrooms/${id}`, data),
  deleteClassroom: (id) => api.delete(`/classrooms/${id}`),

  // Students
  getStudents: (params) => api.get('/students', { params }).then(r => r.data.rows || []),
  getStudentsByClassroom: (classroomId) => api.get(`/students/by-classroom/${classroomId}`).then(r => r.data.rows || []),
  createStudent: (data) => api.post('/students', data),
  updateStudent: (id, data) => api.put(`/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/students/${id}`),

  // PE Classes
  getClasses: (params) => api.get('/classes', { params }).then(r => r.data.rows || []),
  getClass: (id) => api.get(`/classes/${id}`).then(r => r.data),
  createClass: (data) => api.post('/classes', data).then(r => r.data),
  updateClass: (id, data) => api.put(`/classes/${id}`, data),
  deleteClass: (id) => api.delete(`/classes/${id}`),

  // Attendance
  getAttendance: (params) => api.get('/attendance', { params }).then(r => r.data.rows || []),
  batchAttendance: (data) => api.post('/attendance/batch', data).then(r => r.data),

  // Leave Reports
  getLeaves: (params) => api.get('/leaves', { params }).then(r => r.data.rows || []),
  batchLeaves: (data) => api.post('/leaves/batch', data).then(r => r.data),

  // Reconciliation
  reconcile: (peClassId) => api.post(`/reconcile/${peClassId}`).then(r => r.data),
  getReconciliations: (params) => api.get('/reconciliations', { params }).then(r => r.data.rows || []),

  // Anomalies
  getAnomalies: (params) => api.get('/anomalies', { params }).then(r => r.data.rows || []),
  resolveAnomaly: (id, data) => api.put(`/anomalies/${id}/resolve`, data).then(r => r.data),

  // Stats
  getAnomalySummary: (params) => api.get('/stats/anomaly-summary', { params }).then(r => r.data),
  getAttendanceRate: (params) => api.get('/stats/attendance-rate', { params }).then(r => r.data.rows || []),
  exportAnomalies: (params) => api.get('/export/anomalies', { params }).then(r => r.data),
}
