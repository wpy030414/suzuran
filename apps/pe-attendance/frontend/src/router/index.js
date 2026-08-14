import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', component: () => import('../views/AttendanceView.vue') },
  { path: '/leaves', component: () => import('../views/LeavesView.vue') },
  { path: '/anomalies', component: () => import('../views/AnomaliesView.vue') },
]
export default createRouter({ history: createWebHistory(), routes })
