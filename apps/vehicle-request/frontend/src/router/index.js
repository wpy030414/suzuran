import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/MyRequestsView.vue') },
  { path: '/apply', component: () => import('../views/ApplyView.vue') },
  { path: '/vehicles', component: () => import('../views/VehiclesView.vue') },
  { path: '/stats', component: () => import('../views/StatsView.vue') }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
