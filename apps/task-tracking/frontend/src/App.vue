<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>天眼 - 任务追踪与项目管理</v-toolbar-title>
      <v-spacer />
      <v-chip color="white" variant="text">
        <v-icon start>mdi-clock</v-icon>
        {{ currentTime }}
      </v-chip>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-home" title="首页" to="/" />
        <v-list-item prepend-icon="mdi-view-dashboard" title="任务看板" to="/tasks" />
        <v-list-item prepend-icon="mdi-chart-gantt" title="甘特图" to="/gantt" />
        <v-list-item prepend-icon="mdi-account-check" title="我的任务" to="/my-tasks" />
        <v-list-item prepend-icon="mdi-folder-multiple" title="项目管理" to="/projects" />
        <v-list-item prepend-icon="mdi-tag-multiple" title="标签管理" to="/tags" />
        <v-list-item prepend-icon="mdi-school" title="学校管理" to="/schools" />
        <v-list-item prepend-icon="mdi-bell" title="通知公告" to="/notices" />
        <v-list-item prepend-icon="mdi-chart-bar" title="统计报表" to="/statistics" />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const drawer = ref(false)
const currentTime = ref('')
let clockTimer = null

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 333) // 约 333ms 刷新一次
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})
</script>
