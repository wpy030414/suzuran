import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', component: () => import('../views/HomeView.vue') },
  { path: '/substitutions', component: () => import('../views/SubstitutionsView.vue') },
  { path: '/import', component: () => import('../views/ImportView.vue') },
]
export default createRouter({ history: createWebHistory(), routes })
