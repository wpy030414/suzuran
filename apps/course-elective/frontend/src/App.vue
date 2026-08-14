<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>选课系统</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-book-open-variant" title="选课" to="/" />
        <v-list-item prepend-icon="mdi-account-check" title="我的选课" to="/my" />
        <v-list-item prepend-icon="mdi-cog" title="管理" to="/admin" />
      </v-list>
    </v-navigation-drawer>
    <v-main><router-view /></v-main>
  </v-app>
</template>
<script setup>
import { ref } from 'vue'
const drawer = ref(false)
</script>
