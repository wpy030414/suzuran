import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', component: () => import('../views/PagesView.vue') },
  { path: '/categories', component: () => import('../views/CategoriesView.vue') }
]
export default createRouter({ history: createWebHistory(), routes })
