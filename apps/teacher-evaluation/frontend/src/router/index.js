import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/ActivitiesView.vue') },
  { path: '/assignments', component: () => import('../views/AssignmentsView.vue') },
  { path: '/results', component: () => import('../views/ResultsView.vue') },
  { path: '/groups', component: () => import('../views/GroupsView.vue') },
  { path: '/indicators', component: () => import('../views/IndicatorsView.vue') },
  { path: '/stats', component: () => import('../views/StatsView.vue') },
]

export default createRouter({ history: createWebHistory(), routes })
