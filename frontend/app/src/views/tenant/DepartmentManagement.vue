<!-- 租户端：部门管理 -->
<template>
  <div>
    <h1 class="text-h4 mb-4">部门管理</h1>
    <v-alert v-if="!orgId" type="warning" variant="tonal" class="mb-4">当前用户未关联组织，无法管理部门。</v-alert>
    <DepartmentManager v-else :org-id="orgId" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import DepartmentManager from '../../components/org/DepartmentManager.vue'

const authStore = useAuthStore()
const orgId = computed(() => authStore.user?.orgId ?? 0)
</script>
