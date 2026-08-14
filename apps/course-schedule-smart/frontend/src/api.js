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
  updateSubject: (id, data) => api.put(`/subjects/${id}`, data),
  deleteSubject: (id) => api.delete(`/subjects/${id}`),

  // Time Slots
  getTimeSlots: (params) => api.get('/time-slots', { params }).then(r => r.data.rows || []),
  createTimeSlot: (data) => api.post('/time-slots', data),
  updateTimeSlot: (id, data) => api.put(`/time-slots/${id}`, data),
  deleteTimeSlot: (id) => api.delete(`/time-slots/${id}`),

  // Teachers Pool
  getTeachers: () => api.get('/teachers').then(r => r.data.rows || []),
  createTeacher: (data) => api.post('/teachers', data),
  updateTeacher: (id, data) => api.put(`/teachers/${id}`, data),
  deleteTeacher: (id) => api.delete(`/teachers/${id}`),

  // Schedules
  getSchedules: (params) => api.get('/schedules', { params }).then(r => r.data.rows || []),
  createSchedule: (data) => api.post('/schedules', data),
  updateSchedule: (id, data) => api.put(`/schedules/${id}`, data),
  deleteSchedule: (id) => api.delete(`/schedules/${id}`),

  // Snapshots
  getSnapshots: (params) => api.get('/snapshots', { params }).then(r => r.data.rows || []),
  incubateSnapshots: (data) => api.post('/snapshots/incubate', data).then(r => r.data),
  cleanSnapshots: (data) => api.post('/snapshots/clean', data).then(r => r.data),

  // Substitutions
  getSubstitutions: (params) => api.get('/substitutions', { params }).then(r => r.data.rows || []),
  createSubstitution: (data) => api.post('/substitutions', data),
  approveSubstitution: (id, comment) => api.post(`/substitutions/${id}/approve`, { comment }),
  rejectSubstitution: (id, comment) => api.post(`/substitutions/${id}/reject`, { comment }),

  // Inspection
  getInspectionClasses: (data) => api.post('/inspections', data).then(r => r.data.classes || []),
  submitInspection: (data) => api.post('/inspections', data).then(r => r.data),
  getInspections: (params) => api.get('/inspections', { params }).then(r => r.data.rows || []),

  // Statistics
  getTeacherWorkload: (params) => api.get('/stats/teacher-workload', { params }).then(r => r.data.rows || []),
  getClassroomSchedule: (params) => api.get('/stats/classroom-schedule', { params }).then(r => r.data.rows || []),
  getSubstitutionStats: (params) => api.get('/stats/substitutions', { params }).then(r => r.data),
  getDailySummary: (params) => api.get('/stats/daily-summary', { params }).then(r => r.data),

  // Export
  exportTeacherWorkload: (params) => api.get('/export/teacher-workload', { params }).then(r => r.data),
}
