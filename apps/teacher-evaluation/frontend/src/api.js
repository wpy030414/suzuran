import axios from 'axios'
const api = axios.create({ baseURL: '/api' })

export default {
  // ─── Groups ──────────────────────────────────────────────────────────────────
  getGroups: () => api.get('/groups').then(r => r.data.rows || []),
  createGroup: (data) => api.post('/groups', data),
  updateGroup: (id, data) => api.put(`/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/groups/${id}`),

  // ─── Activities ──────────────────────────────────────────────────────────────
  getActivities: () => api.get('/activities').then(r => r.data.rows || []),
  createActivity: (data) => api.post('/activities', data),
  updateActivity: (id, data) => api.put(`/activities/${id}`, data),
  deleteActivity: (id) => api.delete(`/activities/${id}`),
  aggregateActivity: (id) => api.post(`/activities/${id}/aggregate`),
  getActivityProgress: (id) => api.get(`/activities/${id}/progress`).then(r => r.data),

  // ─── Indicator Sets ──────────────────────────────────────────────────────────
  getIndicatorSets: () => api.get('/indicator-sets').then(r => r.data.rows || []),
  getIndicatorSetByPerspective: (perspective) =>
    api.get('/indicator-sets/by-perspective', { params: { perspective } }).then(r => r.data),
  createIndicatorSet: (data) => api.post('/indicator-sets', data),
  updateIndicatorSet: (id, data) => api.put(`/indicator-sets/${id}`, data),
  deleteIndicatorSet: (id) => api.delete(`/indicator-sets/${id}`),

  // ─── Assignments ─────────────────────────────────────────────────────────────
  getAssignments: (params) => api.get('/assignments', { params }).then(r => r.data.rows || []),
  createAssignment: (data) => api.post('/assignments', data),
  updateAssignment: (id, data) => api.put(`/assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`/assignments/${id}`),

  // ─── Scores ──────────────────────────────────────────────────────────────────
  getScores: (params) => api.get('/scores', { params }).then(r => r.data.rows || []),
  createScore: (data) => api.post('/scores', data),
  batchCreateScores: (assignment_id, scores) => api.post('/scores/batch', { assignment_id, scores }),
  updateScore: (id, data) => api.put(`/scores/${id}`, data),
  deleteScore: (id) => api.delete(`/scores/${id}`),

  // ─── Results ─────────────────────────────────────────────────────────────────
  getResults: (params) => api.get('/results', { params }).then(r => r.data.rows || []),
  getResultsByActivity: (activity_id) =>
    api.get('/results/by-activity', { params: { activity_id } }).then(r => r.data.results || []),
  getResultsRanking: (activity_id, sort = 'total_score') =>
    api.get('/results/ranking', { params: { activity_id, sort } }).then(r => r.data.ranking || []),
  getResultsExport: (activity_id) =>
    api.get('/results/export', { params: { activity_id } }).then(r => r.data),

  // ─── My Groups ───────────────────────────────────────────────────────────────
  getMyGroups: (evaluator_id) =>
    api.get('/my-groups', { params: { evaluator_id } }).then(r => r.data.groups || []),

  // ─── Evaluation Summary ──────────────────────────────────────────────────────
  getEvaluationSummary: (evaluator_id) =>
    api.get('/evaluation-summary', { params: { evaluator_id } }).then(r => r.data),
}
