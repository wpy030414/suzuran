import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', component: () => import('../views/DeviceList.vue') },
  { path: '/devices/new', component: () => import('../views/DeviceForm.vue') },
  { path: '/devices/:id/edit', component: () => import('../views/DeviceForm.vue') },
  { path: '/unlock', component: () => import('../views/QuickUnlock.vue') },
  { path: '/logs', component: () => import('../views/AccessLogs.vue') },
  { path: '/permissions', component: () => import('../views/Permissions.vue') },
  { path: '/monitoring', component: () => import('../views/DeviceMonitoring.vue') },
  { path: '/statistics', component: () => import('../views/Statistics.vue') },
  { path: '/credentials', component: () => import('../views/Credentials.vue'), meta: { requiresAdmin: true } }
]
export default createRouter({ history: createWebHistory(), routes })
