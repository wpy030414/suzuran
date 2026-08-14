<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>体育考勤</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-account-check" title="考勤" to="/" />
        <v-list-item prepend-icon="mdi-file-document" title="请假" to="/leaves" />
        <v-list-item prepend-icon="mdi-alert" title="异常检测" to="/anomalies" />
      </v-list>
    </v-navigation-drawer>
    <v-main><router-view /></v-main>
  </v-app>
</template>
<script setup>
import { ref } from 'vue'
const drawer = ref(false)
</script>
