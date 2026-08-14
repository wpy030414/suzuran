import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export default {
  // 健康检查
  getHealthChecks: (params) => api.get('/health-checks', { params }).then(r => r.data.rows || []),
  createHealthCheck: (data) => api.post('/health-checks', data),
  updateHealthCheck: (id, data) => api.put(`/health-checks/${id}`, data),
  deleteHealthCheck: (id) => api.delete(`/health-checks/${id}`),

  // 点名模式
  rollCall: (data) => api.post('/health-checks/roll-call', data),

  // 计数模式
  countMode: (data) => api.post('/health-checks/count', data),

  // 自动生成缺勤
  autoAbsence: (data) => api.post('/health-checks/auto-absence', data),

  // 缺勤记录
  getAbsentRecords: (params) => api.get('/absent-records', { params }).then(r => r.data.rows || []),
  createAbsentRecord: (data) => api.post('/absent-records', data),
  updateAbsentRecord: (id, data) => api.put(`/absent-records/${id}`, data),
  deleteAbsentRecord: (id) => api.delete(`/absent-records/${id}`),

  // 传染病登记
  getInfectiousDiseases: (params) => api.get('/infectious-diseases', { params }).then(r => r.data.rows || []),
  createInfectiousDisease: (data) => api.post('/infectious-diseases', data),
  updateInfectiousDisease: (id, data) => api.put(`/infectious-diseases/${id}`, data),
  deleteInfectiousDisease: (id) => api.delete(`/infectious-diseases/${id}`),

  // 校园层级
  getCampusHierarchy: () => api.get('/campus-hierarchy').then(r => r.data.rows || []),
  getCampusTree: () => api.get('/campus-hierarchy/tree').then(r => r.data.tree || []),
  createCampusNode: (data) => api.post('/campus-hierarchy', data),
  updateCampusNode: (id, data) => api.put(`/campus-hierarchy/${id}`, data),
  deleteCampusNode: (id) => api.delete(`/campus-hierarchy/${id}`),

  // 健康检查配置
  getHealthCheckConfigs: (params) => api.get('/health-check-configs', { params }).then(r => r.data.rows || []),
  createHealthCheckConfig: (data) => api.post('/health-check-configs', data),
  updateHealthCheckConfig: (id, data) => api.put(`/health-check-configs/${id}`, data),
  deleteHealthCheckConfig: (id) => api.delete(`/health-check-configs/${id}`),

  // 统计报表
  getAttendanceStats: (params) => api.get('/statistics/attendance', { params }).then(r => r.data),
  getAbsenceTrend: (params) => api.get('/statistics/absence-trend', { params }).then(r => r.data.trend || []),
  getAbnormalDetail: (params) => api.get('/statistics/abnormal-detail', { params }).then(r => r.data),
  getByCampus: (params) => api.get('/statistics/by-campus', { params }).then(r => r.data),
  getInfectiousSummary: () => api.get('/statistics/infectious-disease-summary').then(r => r.data),
  getStatistics: (params) => api.get('/statistics', { params }).then(r => r.data)
}
