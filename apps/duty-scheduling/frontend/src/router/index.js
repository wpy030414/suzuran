import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/MyDutyView.vue') },
  { path: '/schedules', component: () => import('../views/SchedulesView.vue') },
  { path: '/substitutions', component: () => import('../views/SubstitutionsView.vue') },
  { path: '/inspections', component: () => import('../views/InspectionsView.vue') },
  { path: '/config', component: () => import('../views/ConfigView.vue') }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
