<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>学生综合发展评价</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-account-group" title="班级管理" to="/" />
        <v-list-item prepend-icon="mdi-heart" title="行为评价" to="/behavior" />
        <v-list-item prepend-icon="mdi-book-open" title="学习评价" to="/learning" />
        <v-list-item prepend-icon="mdi-file-document" title="报告查询" to="/reports" />
        <v-list-item prepend-icon="mdi-image-multiple" title="模板管理" to="/templates" />
        <v-list-item prepend-icon="mdi-chart-bar" title="统计分析" to="/stats" />
      </v-list>
    </v-navigation-drawer>
    <v-main><router-view /></v-main>
  </v-app>
</template>
<script setup>
import { ref } from 'vue'
const drawer = ref(false)
</script>
