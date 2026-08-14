<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>综合报表</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-file-chart" title="报表页面" to="/" />
        <v-list-item prepend-icon="mdi-folder" title="分类管理" to="/categories" />
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
