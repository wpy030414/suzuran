<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>听评课</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-calendar-clock" title="听课预约" to="/" />
        <v-list-item prepend-icon="mdi-clipboard-check" title="我的任务" to="/tasks" />
        <v-list-item prepend-icon="mdi-star" title="评课量表" to="/evaluation" />
        <v-list-item prepend-icon="mdi-forum" title="课后研讨" to="/discussion" />
        <v-list-item prepend-icon="mdi-book-multiple" title="集体备课" to="/prep" />
        <v-list-item prepend-icon="mdi-chart-bar" title="统计" to="/stats" />
      </v-list>
    </v-navigation-drawer>
    <v-main><router-view /></v-main>
  </v-app>
</template>
<script setup>
import { ref } from 'vue'
const drawer = ref(false)
</script>
