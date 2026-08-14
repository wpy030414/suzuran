import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', component: () => import('../views/TeachersView.vue') },
  { path: '/weekly-events', component: () => import('../views/WeeklyEventsView.vue') },
  { path: '/awards', component: () => import('../views/AwardsView.vue') },
  { path: '/award-categories', component: () => import('../views/AwardCategoriesView.vue') },
  { path: '/semester', component: () => import('../views/SemesterView.vue') },
  { path: '/annual', component: () => import('../views/AnnualView.vue') },
  { path: '/stats', component: () => import('../views/StatsView.vue') },
]
export default createRouter({ history: createWebHistory(), routes })
