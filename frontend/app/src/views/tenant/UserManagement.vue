<!-- 租户端：用户（成员）管理 -->
<template>
  <div>
    <h1 class="text-h4 mb-4">用户管理</h1>
    <v-alert v-if="!orgId" type="warning" variant="tonal" class="mb-4">当前用户未关联组织，无法管理成员。</v-alert>
    <MemberManager v-else :org-id="orgId" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import MemberManager from '../../components/org/MemberManager.vue'

const authStore = useAuthStore()
const orgId = computed(() => authStore.user?.orgId ?? 0)
</script>
