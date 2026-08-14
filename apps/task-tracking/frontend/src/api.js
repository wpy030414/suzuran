import axios from 'axios'
const api = axios.create({ baseURL: '/api' })

export default {
  // ─── 标签 ───
  getTags: () => api.get('/tags').then(r => r.data.rows || []),
  createTag: (data) => api.post('/tags', data),
  updateTag: (id, data) => api.put(`/tags/${id}`, data),
  deleteTag: (id) => api.delete(`/tags/${id}`),

  // ─── 学校 ───
  getSchools: () => api.get('/schools').then(r => r.data.rows || []),
  createSchool: (data) => api.post('/schools', data),
  updateSchool: (id, data) => api.put(`/schools/${id}`, data),
  deleteSchool: (id) => api.delete(`/schools/${id}`),

  // ─── 项目 ───
  getProjects: () => api.get('/projects').then(r => r.data.rows || []),
  createProject: (data) => api.post('/projects', data),
  updateProject: (id, data) => api.put(`/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/projects/${id}`),

  // ─── 任务 ───
  getTasks: (params) => api.get('/tasks', { params }).then(r => r.data.rows || []),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  blockTask: (id, data) => api.post(`/tasks/${id}/block`, data),
  unblockTask: (id, data) => api.post(`/tasks/${id}/unblock`, data || {}),
  completeTask: (id) => api.post(`/tasks/${id}/complete`),

  // ─── 任务评论 ───
  getTaskComments: (taskId) => api.get(`/tasks/${taskId}/comments`).then(r => r.data.rows || []),
  addTaskComment: (taskId, data) => api.post(`/tasks/${taskId}/comments`, data),

  // ─── 任务附件 ───
  getTaskAttachments: (taskId) => api.get(`/tasks/${taskId}/attachments`).then(r => r.data.rows || []),
  addTaskAttachment: (taskId, data) => api.post(`/tasks/${taskId}/attachments`, data),

  // ─── 任务分配人 ───
  getAssigners: () => api.get('/assigners').then(r => r.data.rows || []),
  addAssigner: (data) => api.post('/assigners', data),
  removeAssigner: (id) => api.delete(`/assigners/${id}`),

  // ─── 通知公告 ───
  getNotices: () => api.get('/notices').then(r => r.data.rows || []),
  createNotice: (data) => api.post('/notices', data),
  updateNotice: (id, data) => api.put(`/notices/${id}`, data),
  deleteNotice: (id) => api.delete(`/notices/${id}`),

  // ─── 仪表盘 ───
  getDashboardMacro: () => api.get('/dashboard/macro').then(r => r.data),
  getDashboardMicro: (params) => api.get('/dashboard/micro', { params }).then(r => r.data),

  // ─── 外勤预告 ───
  getFieldTripAnnouncements: () => api.get('/field-trips/announcements').then(r => r.data),

  // ─── 统计 ───
  getStatistics: () => api.get('/statistics').then(r => r.data),

  // ─── 甘特图 ───
  getGanttData: () => api.get('/gantt').then(r => r.data)
}
