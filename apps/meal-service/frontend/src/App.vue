<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>智慧用餐管理</v-toolbar-title>
      <v-spacer />
      <v-chip v-if="currentUser.userName" color="white" variant="outlined" class="mr-2">
        <v-icon start>mdi-account</v-icon>
        {{ currentUser.userName }}
      </v-chip>
      <v-chip v-if="currentUser.role" :color="roleColor" size="small">
        {{ roleLabel }}
      </v-chip>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" temporary>
      <v-list nav>
        <v-list-item
          v-for="item in visibleNavItems"
          :key="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :to="item.to"
        />
        <v-divider class="my-2" />
        <v-list-item
          prepend-icon="mdi-logout"
          title="退出登录"
          @click="logout"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="2500" location="top">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">关闭</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const drawer = ref(false)
const currentUser = ref({ userId: 0, userName: '', role: '' })
const snackbar = ref({ show: false, text: '', color: 'success' })

const roleLabel = computed(() => {
  const map = { admin: '管理员', staff: '工作人员', student: '学生', parent: '家长' }
  return map[currentUser.value.role] || currentUser.value.role
})

const roleColor = computed(() => {
  const map = { admin: 'error', staff: 'warning', student: 'info', parent: 'success' }
  return map[currentUser.value.role] || 'grey'
})

const navItems = [
  { to: '/', icon: 'mdi-clipboard-check', title: '我的订餐', roles: ['student', 'parent'] },
  { to: '/dashboard', icon: 'mdi-view-dashboard', title: '统计概览', roles: ['admin', 'staff'] },
  { to: '/register', icon: 'mdi-file-document-edit', title: '学期注册', roles: ['admin', 'staff', 'student', 'parent'] },
  { to: '/manage', icon: 'mdi-clipboard-list', title: '订餐管理', roles: ['admin', 'staff'] },
  { to: '/verify', icon: 'mdi-check-circle', title: '用餐核销', roles: ['admin', 'staff'] },
  { to: '/reviews', icon: 'mdi-chart-bar', title: '审查报表', roles: ['admin'] },
  { to: '/stats', icon: 'mdi-chart-line', title: '统计概览', roles: ['admin', 'staff'] }
]

const visibleNavItems = computed(() =>
  navItems.filter(item => item.roles.includes(currentUser.value.role))
)

provide('showSnackbar', (text, color = 'success') => {
  snackbar.value = { show: true, text, color }
})

function logout() {
  localStorage.removeItem('demo_user_id')
  localStorage.removeItem('demo_user_name')
  localStorage.removeItem('demo_user_role')
  router.push('/login')
}

onMounted(async () => {
  try {
    const res = await fetch('/api/me', {
      headers: {
        'x-user-id': localStorage.getItem('demo_user_id') || '',
        'x-user-name': localStorage.getItem('demo_user_name') || '',
        'x-user-role': localStorage.getItem('demo_user_role') || ''
      }
    })
    if (res.ok) {
      currentUser.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to load user:', e)
  }
})
</script>
