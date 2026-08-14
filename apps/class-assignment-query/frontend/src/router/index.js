import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/QueryView.vue') },
  { path: '/batches', component: () => import('../views/BatchesView.vue') },
  { path: '/results', component: () => import('../views/ResultsView.vue') }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
