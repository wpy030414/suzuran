<!-- frontend/app/src/views/Forbidden.vue -->
<template>
  <v-app>
    <v-main>
      <v-container class="text-center mt-16">
        <v-icon size="128" color="error">mdi-lock</v-icon>
        <h1 class="text-h3 mt-4">403 - 禁止访问</h1>
        <p class="text-body-1 mt-4">您没有权限访问此页面</p>
        <v-btn color="primary" to="/" class="mt-4">返回首页</v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
</script>
