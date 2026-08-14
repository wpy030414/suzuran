import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', component: () => import('../views/HomeView.vue') },
  { path: '/tasks', component: () => import('../views/TasksView.vue') },
  { path: '/gantt', component: () => import('../views/GanttView.vue') },
  { path: '/my-tasks', component: () => import('../views/MyTasksView.vue') },
  { path: '/projects', component: () => import('../views/ProjectsView.vue') },
  { path: '/tags', component: () => import('../views/TagsView.vue') },
  { path: '/schools', component: () => import('../views/SchoolsView.vue') },
  { path: '/notices', component: () => import('../views/NoticesView.vue') },
  { path: '/statistics', component: () => import('../views/StatisticsView.vue') }
]
export default createRouter({ history: createWebHistory(), routes })
