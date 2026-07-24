<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { RouterView } from 'vue-router'

const authStore = useAuthStore()

onMounted(() => {
  authStore.initFromStorage()
})
</script>

<template>
  <RouterView />
</template>

<style scoped>
</style>
