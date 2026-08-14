<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>晨午检管理系统</v-toolbar-title>
      <v-spacer />
      <v-chip size="small" class="mr-2" color="white" variant="outlined">
        {{ roleLabel }}
      </v-chip>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list nav>
        <v-list-item prepend-icon="mdi-thermometer" title="健康检查" to="/" />
        <v-list-item prepend-icon="mdi-clipboard-check" title="点名模式" to="/roll-call" />
        <v-list-item prepend-icon="mdi-counter" title="计数模式" to="/count-mode" />
        <v-divider class="my-2" />
        <v-list-item prepend-icon="mdi-account-off" title="缺勤管理" to="/absent" />
        <v-list-item prepend-icon="mdi-bug" title="传染病登记" to="/infectious" />
        <v-divider class="my-2" />
        <v-list-item prepend-icon="mdi-chart-bar" title="统计报表" to="/statistics" />
        <v-list-item v-if="isAdmin" prepend-icon="mdi-sitemap" title="层级管理" to="/hierarchy" />
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
const userRole = ref(localStorage.getItem('userRole') || 'class_teacher')

const isAdmin = computed(() => ['admin', 'campus_admin'].includes(userRole.value))

const roleLabel = computed(() => ({
  admin: '系统管理员',
  campus_admin: '校区管理员',
  grade_head: '年级组长',
  class_teacher: '班主任',
  school_doctor: '校医'
})[userRole.value] || '班主任')
</script>
