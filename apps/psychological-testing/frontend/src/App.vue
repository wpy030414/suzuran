<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>心理测试系统</v-toolbar-title>
      <v-spacer />
      <v-chip v-if="userRole" color="white" variant="outlined" size="small">
        {{ roleText }}
      </v-chip>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :to="item.to"
        />
      </v-list>
    </v-navigation-drawer>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const drawer = ref(false)
const userRole = ref('student')

const roleText = computed(() => {
  const roles = {
    admin: '管理员',
    psychological_teacher: '心理教师',
    student: '学生'
  }
  return roles[userRole.value] || '学生'
})

const navItems = computed(() => {
  const items = [
    { title: '问卷管理', icon: 'mdi-file-document', to: '/', roles: ['admin', 'psychological_teacher'] },
    { title: '我的测试', icon: 'mdi-account-test', to: '/my-tests', roles: ['student', 'admin', 'psychological_teacher'] },
    { title: '测试结果', icon: 'mdi-chart-bar', to: '/results', roles: ['admin', 'psychological_teacher', 'student'] },
    { title: '统计分析', icon: 'mdi-chart-line', to: '/statistics', roles: ['admin', 'psychological_teacher'] }
  ]
  return items.filter(item => item.roles.includes(userRole.value))
})

onMounted(() => {
  // 从 localStorage 或 URL 参数获取角色（演示用）
  userRole.value = localStorage.getItem('userRole') || 'student'
})
</script>
