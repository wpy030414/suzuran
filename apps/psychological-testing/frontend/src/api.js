import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// 添加请求拦截器，注入角色头
api.interceptors.request.use(config => {
  const userRole = localStorage.getItem('userRole') || 'student'
  const userId = localStorage.getItem('userId') || '1'
  config.headers['x-user-role'] = userRole
  config.headers['x-user-id'] = userId
  return config
})

export default {
  // 问卷管理
  getQuestionnaires: (params) => api.get('/questionnaires', { params }).then(r => r.data.rows || []),
  getQuestionnaire: (id) => api.get(`/questionnaires/${id}`).then(r => r.data),
  getQuestionnaireBlind: (id) => api.get(`/questionnaires/${id}/blind`).then(r => r.data),
  createQuestionnaire: (data) => api.post('/questionnaires', data).then(r => r.data),
  updateQuestionnaire: (id, data) => api.put(`/questionnaires/${id}`, data).then(r => r.data),
  deleteQuestionnaire: (id) => api.delete(`/questionnaires/${id}`).then(r => r.data),
  distributeQuestionnaire: (id, students) => api.post(`/questionnaires/${id}/distribute`, { students }).then(r => r.data),
  getDimensions: (questionnaireId) => api.get(`/questionnaires/${questionnaireId}/dimensions`).then(r => r.data.rows || []),

  // 测试会话
  getSessions: (params) => api.get('/sessions', { params }).then(r => r.data.rows || []),
  createSession: (data) => api.post('/sessions', data).then(r => r.data),
  updateSession: (id, data) => api.put(`/sessions/${id}`, data).then(r => r.data),
  submitSession: (id, data) => api.post(`/sessions/${id}/submit`, data).then(r => r.data),

  // 测试结果
  getResults: (params) => api.get('/results', { params }).then(r => r.data.rows || []),

  // 统计分析
  getStatsByDimension: (params) => api.get('/statistics/by-dimension', { params }).then(r => r.data),
  getStatsByGrade: (params) => api.get('/statistics/by-grade', { params }).then(r => r.data),
  getStatsByClass: (params) => api.get('/statistics/by-class', { params }).then(r => r.data),
  getRiskOverview: () => api.get('/statistics/risk-overview').then(r => r.data)
}
