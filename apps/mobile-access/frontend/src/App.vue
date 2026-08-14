<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>智慧门禁</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-door" title="设备管理" to="/" />
        <v-list-item prepend-icon="mdi-lock-open" title="快速开门" to="/unlock" />
        <v-list-item prepend-icon="mdi-history" title="访问日志" to="/logs" />
        <v-list-item prepend-icon="mdi-key" title="权限管理" to="/permissions" />
        <v-list-item prepend-icon="mdi-monitor-dashboard" title="设备监控" to="/monitoring" />
        <v-list-item prepend-icon="mdi-chart-bar" title="统计分析" to="/statistics" />
        <v-list-item prepend-icon="mdi-shield-key" title="凭据管理" to="/credentials" v-if="isAdmin" />
      </v-list>
    </v-navigation-drawer>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'
const drawer = ref(false)
// 从 URL 参数或 localStorage 读取角色
const isAdmin = computed(() => {
  const params = new URLSearchParams(window.location.search)
  const role = params.get('role') || localStorage.getItem('user_role') || 'admin'
  return role === 'admin'
})
</script>
