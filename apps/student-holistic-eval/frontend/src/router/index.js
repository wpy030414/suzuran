import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', component: () => import('../views/ClassroomsView.vue') },
  { path: '/behavior', component: () => import('../views/BehaviorEvalView.vue') },
  { path: '/learning', component: () => import('../views/LearningEvalView.vue') },
  { path: '/reports', component: () => import('../views/ReportQueryView.vue') },
  { path: '/templates', component: () => import('../views/TemplatesView.vue') },
  { path: '/stats', component: () => import('../views/StatsView.vue') },
]
export default createRouter({ history: createWebHistory(), routes })
