import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', redirect: '/templates' },
  { path: '/templates', component: () => import('../views/TemplatesView.vue') },
  { path: '/assessments', component: () => import('../views/AssessmentsView.vue') },
  { path: '/reports', component: () => import('../views/ReportsView.vue') },
  { path: '/classrooms', component: () => import('../views/ClassroomsView.vue') },
  { path: '/stats', component: () => import('../views/StatsView.vue') },
]
export default createRouter({ history: createWebHistory(), routes })
