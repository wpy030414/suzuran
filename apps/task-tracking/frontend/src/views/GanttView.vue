<template>
  <v-container>
    <h2 class="text-h5 mb-4">甘特图视图</h2>
    <v-card>
      <v-card-text>
        <div v-if="ganttTasks.length === 0" class="text-center text-grey pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-chart-gantt</v-icon>
          <div class="mt-4">暂无任务数据</div>
        </div>
        <div v-else>
          <!-- 时间轴头部 -->
          <div class="d-flex mb-2" style="border-bottom: 1px solid #e0e0e0; padding-bottom: 8px;">
            <div style="width: 200px; flex-shrink: 0;" class="text-caption font-weight-bold">任务名称</div>
            <div class="flex-grow-1 d-flex justify-space-between text-caption text-grey">
              <span v-for="d in dateLabels" :key="d">{{ d }}</span>
            </div>
          </div>
          <!-- 甘特条 -->
          <div v-for="task in ganttTasks" :key="task.id" class="gantt-row d-flex align-center mb-2">
            <div style="width: 200px; flex-shrink: 0;" class="text-truncate text-body-2">
              <v-icon start size="small" :color="statusColor(task.status)">mdi-circle-medium</v-icon>
              {{ task.title }}
            </div>
            <div class="flex-grow-1" style="height: 28px; background: #f5f5f5; position: relative; border-radius: 4px;">
              <div :style="ganttBarStyle(task)" class="gantt-fill" :title="`${task.title} - ${statusText(task.status)} (${task.progress}%)`">
                <span class="text-white text-caption" style="padding: 4px;">{{ task.progress }}%</span>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const ganttTasks = ref([])

const dateLabels = computed(() => {
  const labels = []
  const now = new Date()
  for (let i = -7; i <= 23; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }
  return labels
})

function statusColor(s) {
  return { pending: 'warning', in_progress: 'info', blocked: 'error', completed: 'success' }[s] || 'grey'
}

function statusText(s) {
  return { pending: '待处理', in_progress: '进行中', blocked: '已阻塞', completed: '已完成' }[s] || s
}

function ganttBarStyle(task) {
  const totalDays = 30
  const start = new Date(task.start || task.created_at)
  const end = new Date(task.end || task.expected_completion || task.created_at)
  const now = new Date()
  const nowOffset = 7 // 7 days offset for the start of the chart

  const startOffset = (start - now) / (1000 * 60 * 60 * 24) + nowOffset
  const duration = Math.max(1, (end - start) / (1000 * 60 * 60 * 24))

  const left = Math.max(0, Math.min(100, (startOffset / totalDays) * 100))
  const width = Math.max(2, Math.min(100 - left, (duration / totalDays) * 100))

  return {
    position: 'absolute',
    left: `${left}%`,
    width: `${width}%`,
    height: '100%',
    backgroundColor: { pending: '#fb8c00', in_progress: '#2196f3', blocked: '#f44336', completed: '#4caf50' }[task.status] || '#9e9e9e',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden'
  }
}

onMounted(async () => {
  const data = await api.getGanttData()
  ganttTasks.value = data.tasks || []
})
</script>
