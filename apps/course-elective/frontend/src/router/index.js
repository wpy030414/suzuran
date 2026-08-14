import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', component: () => import('../views/SelectView.vue') },
  { path: '/my', component: () => import('../views/MyEnrollments.vue') },
  { path: '/admin', component: () => import('../views/AdminView.vue') },
]
export default createRouter({ history: createWebHistory(), routes })
