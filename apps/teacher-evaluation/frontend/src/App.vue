<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>教师评价与考核系统</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-calendar-star" title="评价活动" to="/" />
        <v-list-item prepend-icon="mdi-clipboard-account" title="评价分配" to="/assignments" />
        <v-list-item prepend-icon="mdi-chart-bar" title="评价结果" to="/results" />
        <v-divider />
        <v-list-item prepend-icon="mdi-account-group" title="评价组管理" to="/groups" />
        <v-list-item prepend-icon="mdi-format-list-checks" title="指标管理" to="/indicators" />
        <v-list-item prepend-icon="mdi-chart-line" title="统计分析" to="/stats" />
      </v-list>
    </v-navigation-drawer>
    <v-main><router-view /></v-main>
  </v-app>
</template>
<script setup>
import { ref } from 'vue'
const drawer = ref(false)
</script>
