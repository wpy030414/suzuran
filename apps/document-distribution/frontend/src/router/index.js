import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('../views/MyDocumentsView.vue') },
  { path: '/publish', component: () => import('../views/PublishView.vue') },
  { path: '/tags', component: () => import('../views/TagsView.vue') }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
