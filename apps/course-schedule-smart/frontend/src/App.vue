<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>智能课表</v-toolbar-title>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-home" title="首页" to="/" />
        <v-list-item prepend-icon="mdi-calendar-clock" title="课表管理" to="/schedules" />
        <v-list-item prepend-icon="mdi-calendar-check" title="快照查询" to="/snapshots" />
        <v-list-item prepend-icon="mdi-swap-horizontal" title="调代课" to="/substitutions" />
        <v-list-item prepend-icon="mdi-eye-check" title="巡课" to="/inspection" />
        <v-list-item prepend-icon="mdi-cog" title="基础数据" to="/base-data" />
        <v-list-item prepend-icon="mdi-incubator" title="课表孵化器" to="/incubator" />
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
