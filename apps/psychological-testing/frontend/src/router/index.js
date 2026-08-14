import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('../views/QuestionnaireList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/questionnaires/new',
    component: () => import('../views/QuestionnaireForm.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'psychological_teacher'] }
  },
  {
    path: '/questionnaires/:id/edit',
    component: () => import('../views/QuestionnaireForm.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'psychological_teacher'] }
  },
  {
    path: '/my-tests',
    component: () => import('../views/TestTaking.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/results',
    component: () => import('../views/TestResults.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/statistics',
    component: () => import('../views/Statistics.vue'),
    meta: { requiresAuth: true, roles: ['admin', 'psychological_teacher'] }
  }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
