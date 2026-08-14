<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>值班管理系统</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-calendar" title="我的值班" to="/" />
        <v-list-item prepend-icon="mdi-calendar-clock" title="排班管理" to="/schedules" />
        <v-list-item prepend-icon="mdi-swap-horizontal" title="换班申请" to="/substitutions" />
        <v-list-item prepend-icon="mdi-clipboard-check" title="值班检查" to="/inspections" />
        <v-list-item prepend-icon="mdi-cog" title="基础配置" to="/config" />
      </v-list>
    </v-navigation-drawer>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
const drawer = ref(false)
</script>
