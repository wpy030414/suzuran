<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>用车申请系统</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-car" title="我的申请" to="/" />
        <v-list-item prepend-icon="mdi-plus-circle" title="申请用车" to="/apply" />
        <v-list-item prepend-icon="mdi-car-multiple" title="车辆管理" to="/vehicles" />
        <v-list-item prepend-icon="mdi-chart-bar" title="使用统计" to="/stats" />
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
