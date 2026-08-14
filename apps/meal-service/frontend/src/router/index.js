import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', component: () => import('../views/LoginView.vue') },
  { path: '/', component: () => import('../views/MyOrdersView.vue') },
  { path: '/dashboard', component: () => import('../views/DashboardView.vue') },
  { path: '/register', component: () => import('../views/RegistrationView.vue') },
  { path: '/orders', component: () => import('../views/MyOrdersView.vue') },
  { path: '/manage', component: () => import('../views/ManageView.vue') },
  { path: '/verify', component: () => import('../views/VerifyView.vue') },
  { path: '/reviews', component: () => import('../views/ReviewsView.vue') },
  { path: '/stats', component: () => import('../views/StatsView.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userId = localStorage.getItem('demo_user_id')
  if (!userId && to.path !== '/login') {
    next('/login')
  } else {
    next()
  }
})

export default router
