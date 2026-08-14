import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/students', name: 'students', component: () => import('../views/StudentsView.vue') },
  { path: '/plans', name: 'plans', component: () => import('../views/PlansView.vue') },
  { path: '/records', name: 'records', component: () => import('../views/RecordsView.vue') },
  { path: '/pause-requests', name: 'pause', component: () => import('../views/PauseRequestsView.vue') },
  { path: '/dashboard/report', name: 'report', component: () => import('../views/PlanReportView.vue') },
  { path: '/dashboard/survey', name: 'survey', component: () => import('../views/StudentSurveyView.vue') },
  { path: '/dashboard/stats', name: 'stats', component: () => import('../views/CareStatsView.vue') },
  { path: '/config', name: 'config', component: () => import('../views/ConfigView.vue') }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
