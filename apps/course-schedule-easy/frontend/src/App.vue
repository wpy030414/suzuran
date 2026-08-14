<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>省心课表</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-home" title="首页" to="/" />
        <v-list-item prepend-icon="mdi-swap-horizontal" title="调代课" to="/substitutions" />
        <v-list-item prepend-icon="mdi-file-upload" title="Excel导入" to="/import" />
      </v-list>
    </v-navigation-drawer>
    <v-main><router-view /></v-main>
  </v-app>
</template>
<script setup>
import { ref } from 'vue'
const drawer = ref(false)
</script>
