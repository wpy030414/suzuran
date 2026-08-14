import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/HomeView.vue') },
  { path: '/schedules', component: () => import('../views/SchedulesView.vue') },
  { path: '/snapshots', component: () => import('../views/SnapshotsView.vue') },
  { path: '/substitutions', component: () => import('../views/SubstitutionsView.vue') },
  { path: '/inspection', component: () => import('../views/InspectionView.vue') },
  { path: '/base-data', component: () => import('../views/BaseDataView.vue') },
  { path: '/incubator', component: () => import('../views/IncubatorView.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
