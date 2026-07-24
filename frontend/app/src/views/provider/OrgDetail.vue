<!-- 组织详情：头部卡片 + v-tabs 部门/成员 -->
<template>
  <div v-if="org">
    <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="router.push('/provider/orgs')" class="mb-4">
      返回组织列表
    </v-btn>

    <!-- 组织头部 -->
    <v-card class="mb-6">
      <v-card-text>
        <div class="d-flex align-center">
          <v-avatar color="primary" size="56" class="mr-4">
            <v-icon size="32">mdi-domain</v-icon>
          </v-avatar>
          <div>
            <div class="text-h5 font-weight-bold">{{ org.name }}</div>
            <div class="text-caption text-grey mt-1">ID: {{ org.id }}</div>
          </div>
        </div>
        <v-divider class="my-4"></v-divider>
        <div class="text-body-2 text-grey-darken-1">{{ org.description || '暂无描述' }}</div>
      </v-card-text>
    </v-card>

    <!-- 部门 / 成员 Tab -->
    <v-tabs v-model="activeTab" color="primary" class="mb-4">
      <v-tab value="departments">
        <v-icon start>mdi-folder-tree</v-icon>部门
      </v-tab>
      <v-tab value="members">
        <v-icon start>mdi-account-group</v-icon>成员
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <v-window-item value="departments">
        <DepartmentManager :org-id="orgId" />
      </v-window-item>
      <v-window-item value="members">
        <MemberManager :org-id="orgId" />
      </v-window-item>
    </v-window>
  </div>

  <div v-else class="text-center pa-8">
    <v-progress-circular indeterminate color="primary"></v-progress-circular>
    <div class="mt-4 text-grey">加载组织中...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { listOrgs, type Org } from '../../api/org'
import DepartmentManager from '../../components/org/DepartmentManager.vue'
import MemberManager from '../../components/org/MemberManager.vue'

const router = useRouter()
const route = useRoute()
const orgId = Number(route.params.orgId)

const org = ref<Org | null>(null)
const activeTab = ref('departments')

onMounted(async () => {
  try {
    const r = await listOrgs()
    org.value = r.data.find((o: Org) => o.id === orgId) ?? null
  } catch (err) {
    console.error('Failed to load org:', err)
  }
})
</script>
