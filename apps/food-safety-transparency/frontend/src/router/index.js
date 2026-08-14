import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/login',
    component: () => import('../views/LoginView.vue')
  },
  {
    path: '/',
    component: () => import('../views/StandardsView.vue')
  },
  {
    path: '/menus',
    component: () => import('../views/MenusView.vue')
  },
  {
    path: '/campuses',
    component: () => import('../views/CampusesView.vue')
  },
  {
    path: '/overview',
    component: () => import('../views/OverviewView.vue')
  },
  {
    path: '/stats',
    component: () => import('../views/StatsView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Auth guard
router.beforeEach((to, from, next) => {
  const user = localStorage.getItem('user');
  if (to.path !== '/login' && !user) {
    next('/login');
  } else {
    next();
  }
});

export default router;
