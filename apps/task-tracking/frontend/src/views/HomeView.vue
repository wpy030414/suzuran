<template>
  <v-container>
    <!-- 通知轮播区 -->
    <v-card v-if="activeNotices.length > 0" color="info" variant="tonal" class="mb-4">
      <v-card-text class="d-flex align-center">
        <v-icon start>mdi-bell-ring</v-icon>
        <v-slide-y-reverse-transition mode="out-in">
          <span :key="currentNoticeIndex" @click="openNoticeLink" class="notice-text cursor-pointer">
            {{ activeNotices[currentNoticeIndex]?.content }}
          </span>
        </v-slide-y-reverse-transition>
      </v-card-text>
    </v-card>

    <!-- 外勤预告区 -->
    <v-card v-if="announcements.length > 0" class="mb-4" variant="outlined">
      <v-card-title class="text-subtitle-1">
        <v-icon start color="warning">mdi-airplane</v-icon>
        来访动态
      </v-card-title>
      <v-card-text>
        <div v-for="(a, i) in announcements" :key="i" class="mb-1">
          <v-chip v-if="a.is_expired" size="x-small" color="grey" class="mr-1">已结束</v-chip>
          {{ a.text }}
        </div>
      </v-card-text>
    </v-card>

    <!-- 大盘概览卡片 -->
    <v-row class="mb-4">
      <v-col cols="6" md="3" v-for="item in macroCards" :key="item.label">
        <v-card :color="item.color" variant="tonal">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold">{{ item.value }}</div>
            <div class="text-caption">{{ item.label }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- 待办三视图 -->
    <v-card>
      <v-tabs v-model="activeTab" bg-color="primary">
        <v-tab value="mine">我待做的</v-tab>
        <v-tab value="created">我发起的</v-tab>
        <v-tab value="all">全体待做的</v-tab>
      </v-tabs>

      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>学校</th>
              <th>标签</th>
              <th>摘要</th>
              <th>执行人</th>
              <th>状态</th>
              <th>阻滞</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="task in filteredTasks" :key="task.id">
              <td>{{ task.school_name || '-' }}</td>
              <td>
                <v-chip v-for="tid in parseTagIds(task.tag_ids)" :key="tid" size="x-small" class="mr-1">
                  #{{ tid }}
                </v-chip>
              </td>
              <td>{{ task.summary || task.title }}</td>
              <td>{{ task.assignee_id }}</td>
              <td>
                <v-chip :color="statusColor(task.status)" size="small">{{ statusText(task.status) }}</v-chip>
              </td>
              <td>
                <v-chip v-if="task.blocked_reason" color="error" size="small">
                  {{ task.blocked_reason }}
                </v-chip>
                <span v-else>-</span>
              </td>
              <td>
                <v-btn size="small" variant="text" @click="viewTask(task)">查看</v-btn>
              </td>
            </tr>
            <tr v-if="filteredTasks.length === 0">
              <td colspan="7" class="text-center text-grey pa-4">暂无数据</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '../api.js'

const activeTab = ref('mine')
const activeNotices = ref([])
const currentNoticeIndex = ref(0)
const announcements = ref([])
const tasks = ref([])
const macroData = ref({})
let noticeTimer = null

const CURRENT_USER_ID = 1 // 实际应从登录态获取

const macroCards = computed(() => [
  { label: '运行中', value: macroData.value.activeCount || 0, color: 'info' },
  { label: '已完成', value: macroData.value.byStatus?.completed || 0, color: 'success' },
  { label: '已阻塞', value: macroData.value.byStatus?.blocked || 0, color: 'error' },
  { label: '完成率', value: `${macroData.value.completionRate || 0}%`, color: 'primary' }
])

const filteredTasks = computed(() => {
  if (activeTab.value === 'mine') {
    return tasks.value.filter(t => t.assignee_id === CURRENT_USER_ID && ['pending', 'in_progress'].includes(t.status))
  } else if (activeTab.value === 'created') {
    return tasks.value.filter(t => t.creator_id === CURRENT_USER_ID)
  }
  return tasks.value.filter(t => ['pending', 'in_progress'].includes(t.status))
})

function statusColor(s) {
  return { pending: 'warning', in_progress: 'info', blocked: 'error', completed: 'success', cancelled: 'grey' }[s] || 'grey'
}

function statusText(s) {
  return { pending: '待处理', in_progress: '进行中', blocked: '已阻塞', completed: '已完成', cancelled: '已取消' }[s] || s
}

function parseTagIds(tagIds) {
  try {
    const arr = typeof tagIds === 'string' ? JSON.parse(tagIds || '[]') : (tagIds || [])
    return arr
  } catch { return [] }
}

function openNoticeLink() {
  const notice = activeNotices.value[currentNoticeIndex.value]
  if (notice?.link) window.open(notice.link, '_blank')
}

function viewTask(task) {
  // 实际应跳转到任务详情页
  console.log('View task:', task.id)
}

async function loadData() {
  try {
    const [notices, trips, macro, allTasks] = await Promise.all([
      api.getNotices(),
      api.getFieldTripAnnouncements(),
      api.getDashboardMacro(),
      api.getTasks()
    ])
    activeNotices.value = notices
    announcements.value = trips.announcements || []
    macroData.value = macro
    tasks.value = allTasks
  } catch (e) {
    console.error('Failed to load data:', e)
  }
}

onMounted(async () => {
  await loadData()

  // 通知轮播：每 5 秒切换
  noticeTimer = setInterval(() => {
    if (activeNotices.value.length > 0) {
      currentNoticeIndex.value = (currentNoticeIndex.value + 1) % activeNotices.value.length
    }
  }, 5000)
})

onUnmounted(() => {
  if (noticeTimer) clearInterval(noticeTimer)
})
</script>

<style scoped>
.notice-text {
  font-size: 0.95rem;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
