<!-- frontend/app/src/views/NotFound.vue -->
<template>
  <v-app>
    <v-main>
      <v-container class="text-center mt-16">
        <v-icon size="128" color="warning">mdi-alert-circle</v-icon>
        <h1 class="text-h3 mt-4">404 - 页面不存在</h1>
        <p class="text-body-1 mt-4">您访问的页面不存在</p>
        <v-btn color="primary" to="/" class="mt-4">返回首页</v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
</script>
