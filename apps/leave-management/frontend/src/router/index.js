import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/MyLeavesView.vue') },
  { path: '/types', component: () => import('../views/LeaveTypesView.vue') },
  { path: '/balances', component: () => import('../views/BalancesView.vue') }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
