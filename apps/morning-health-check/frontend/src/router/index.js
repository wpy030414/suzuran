import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/HealthCheckList.vue') },
  { path: '/roll-call', component: () => import('../views/RollCall.vue') },
  { path: '/count-mode', component: () => import('../views/CountMode.vue') },
  { path: '/absent', component: () => import('../views/AbsentRecords.vue') },
  { path: '/infectious', component: () => import('../views/InfectiousDiseases.vue') },
  { path: '/statistics', component: () => import('../views/Statistics.vue') },
  { path: '/hierarchy', component: () => import('../views/HierarchyManager.vue') }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
