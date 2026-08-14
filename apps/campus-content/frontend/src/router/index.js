import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', component: () => import('../views/HomeView.vue') },
  { path: '/news', component: () => import('../views/NewsView.vue') },
  { path: '/tutorials', component: () => import('../views/TutorialsView.vue') },
  { path: '/posts', component: () => import('../views/PostsView.vue') },
  { path: '/artworks', component: () => import('../views/ArtworksView.vue') }
]
export default createRouter({ history: createWebHistory(), routes })
