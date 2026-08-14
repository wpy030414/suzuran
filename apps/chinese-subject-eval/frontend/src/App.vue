<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>语文学科评价</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list nav>
        <v-list-item prepend-icon="mdi-file-document-edit" title="评价模板" to="/templates" />
        <v-list-item prepend-icon="mdi-clipboard-check" title="评价记录" to="/assessments" />
        <v-list-item prepend-icon="mdi-card-text" title="成绩单" to="/reports" />
        <v-list-item prepend-icon="mdi-google-classroom" title="班级管理" to="/classrooms" />
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
