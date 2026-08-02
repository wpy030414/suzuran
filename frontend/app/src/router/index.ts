// frontend/app/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/Home.vue'),
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { requiresGuest: true },
    },
    // Provider routes (服务商端)
    {
      path: '/provider',
      component: () => import('../layouts/ProviderLayout.vue'),
      redirect: '/provider/dashboard',
      meta: { requiresAuth: true, role: 'provider' },
      children: [
        {
          path: 'dashboard',
          name: 'ProviderDashboard',
          component: () => import('../views/provider/Dashboard.vue'),
        },
        {
          path: 'orgs',
          name: 'Organizations',
          component: () => import('../views/provider/Organizations.vue'),
        },
        {
          path: 'orgs/:orgId',
          name: 'OrgDetail',
          component: () => import('../views/provider/OrgDetail.vue'),
        },
      ],
    },
    // Tenant admin routes (租户管理端)
    {
      path: '/tenant',
      component: () => import('../layouts/TenantLayout.vue'),
      redirect: '/tenant/dashboard',
      meta: { requiresAuth: true, role: 'tenant_admin' },
      children: [
        {
          path: 'dashboard',
          name: 'TenantDashboard',
          component: () => import('../views/tenant/Dashboard.vue'),
        },
        {
          path: 'users',
          name: 'UserManagement',
          component: () => import('../views/tenant/UserManagement.vue'),
        },
        {
          path: 'departments',
          name: 'DepartmentManagement',
          component: () => import('../views/tenant/DepartmentManagement.vue'),
        },
      ],
    },
    // User routes (用户端)
    {
      path: '/user',
      component: () => import('../layouts/UserLayout.vue'),
      meta: { requiresAuth: true, role: 'user' },
      children: [
        {
          path: '',
          name: 'UserDashboard',
          component: () => import('../views/user/Dashboard.vue'),
        },
      ],
    },
    // 403 Forbidden
    {
      path: '/forbidden',
      name: 'Forbidden',
      component: () => import('../views/Forbidden.vue'),
    },
    // Catch all
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/NotFound.vue'),
    },
  ],
})

// Navigation guard for authentication and role-based access
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Check if route requires guest (login page)
  if (to.meta.requiresGuest) {
    if (authStore.isAuthenticated) {
      next('/')
    } else {
      next()
    }
    return
  }

  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      next('/login')
      return
    }

    // Check role-based access
    if (to.meta.role && authStore.userRole !== to.meta.role) {
      next('/forbidden')
      return
    }
  }

  next()
})

export default router
