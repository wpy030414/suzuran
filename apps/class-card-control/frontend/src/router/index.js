import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', component: () => import('../views/ClientsView.vue') },
  { path: '/playlists', component: () => import('../views/PlaylistsView.vue') },
  { path: '/configs', component: () => import('../views/ConfigsView.vue') }
]
export default createRouter({ history: createWebHistory(), routes })
