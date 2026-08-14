import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export default {
  getCampuses: () => api.get('/campuses').then(r => r.data),
  getClassrooms: (params) => api.get('/classrooms', { params }).then(r => r.data),
  getSubjects: () => api.get('/subjects').then(r => r.data),
  getTimeSlots: (params) => api.get('/time-slots', { params }).then(r => r.data),
  getTeachers: () => api.get('/teachers').then(r => r.data),
  getSchedules: (params) => api.get('/schedules', { params }).then(r => r.data),
  getSnapshots: (params) => api.get('/snapshots', { params }).then(r => r.data),
  getSubstitutions: () => api.get('/substitutions').then(r => r.data),

  create: (table, data) => api.post(`/${table}`, data).then(r => r.data),
  update: (table, id, data) => api.put(`/${table}/${id}`, data).then(r => r.data),
  remove: (table, id) => api.delete(`/${table}/${id}`).then(r => r.data),

  incubate: (data) => api.post('/snapshots/incubate', data).then(r => r.data),
  cleanSnapshots: (data) => api.post('/snapshots/clean', data).then(r => r.data),
  approveSubstitution: (id) => api.post(`/substitutions/${id}/approve`).then(r => r.data),
}
