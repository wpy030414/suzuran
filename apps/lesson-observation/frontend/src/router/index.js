import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', component: () => import('../views/AppointmentsView.vue') },
  { path: '/tasks', component: () => import('../views/TasksView.vue') },
  { path: '/evaluation', component: () => import('../views/EvaluationView.vue') },
  { path: '/discussion', component: () => import('../views/DiscussionView.vue') },
  { path: '/prep', component: () => import('../views/PrepView.vue') },
  { path: '/stats', component: () => import('../views/StatsView.vue') },
]
export default createRouter({ history: createWebHistory(), routes })
