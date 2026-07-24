<!-- frontend/app/src/layouts/TenantLayout.vue -->
<template>
  <v-app>
    <v-app-bar color="secondary" dark>
      <v-app-bar-title>租户管理门户</v-app-bar-title>
      <v-spacer></v-spacer>
      <span class="mr-4">{{ authStore.user?.name }}</span>
      <v-btn @click="authStore.logout">退出</v-btn>
    </v-app-bar>

    <v-navigation-drawer permanent>
      <v-list>
        <v-list-item to="/tenant/dashboard" prepend-icon="mdi-view-dashboard" title="仪表盘" />
        <v-list-item to="/tenant/users" prepend-icon="mdi-account-multiple" title="用户管理" />
        <v-list-item to="/tenant/departments" prepend-icon="mdi-sitemap" title="部门管理" />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container>
        <RouterView />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import { RouterView } from 'vue-router'

const authStore = useAuthStore()
</script>
