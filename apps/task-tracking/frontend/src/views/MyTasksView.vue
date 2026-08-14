<template>
  <v-container>
    <h2 class="text-h5 mb-4">我的任务</h2>

    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model="userId" type="number" label="执行人ID" density="compact" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="dateFrom" type="date" label="最后推动日期（起）" density="compact" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="dateTo" type="date" label="最后推动日期（止）" density="compact" />
          </v-col>
        </v-row>
        <v-btn color="primary" @click="loadTasks" class="mt-2">
          <v-icon start>mdi-magnify</v-icon>查询
        </v-btn>
      </v-card-text>
    </v-card>

    <v-table density="compact">
      <thead>
        <tr>
          <th>标题</th>
          <th>学校</th>
          <th>摘要</th>
          <th>状态</th>
          <th>阻滞</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="task in tasks" :key="task.id">
          <td>{{ task.title }}</td>
          <td>{{ task.school_name || '-' }}</td>
          <td>{{ task.summary || '-' }}</td>
          <td>
            <v-chip :color="statusColor(task.status)" size="small">{{ statusText(task.status) }}</v-chip>
          </td>
          <td>
            <v-chip v-if="task.blocked_reason" color="error" size="small">{{ task.blocked_reason }}</v-chip>
            <span v-else>-</span>
          </td>
          <td>
            <v-btn v-if="task.status !== 'completed' && task.status !== 'blocked'" size="small" color="success" @click="complete(task.id)">完成</v-btn>
            <v-btn v-if="task.status === 'blocked'" size="small" color="warning" disabled>需先解除阻滞</v-btn>
          </td>
        </tr>
        <tr v-if="tasks.length === 0">
          <td colspan="6" class="text-center text-grey pa-4">暂无数据</td>
        </tr>
      </tbody>
    </v-table>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const userId = ref('1')
const dateFrom = ref('')
const dateTo = ref('')
const tasks = ref([])
const snackbar = ref({ show: false, text: '', color: 'success' })

function statusColor(s) {
  return { pending: 'warning', in_progress: 'info', blocked: 'error', completed: 'success' }[s] || 'grey'
}

function statusText(s) {
  return { pending: '待处理', in_progress: '进行中', blocked: '已阻塞', completed: '已完成' }[s] || s
}

async function loadTasks() {
  const params = { user_id: userId.value }
  if (dateFrom.value) params.date_from = dateFrom.value
  if (dateTo.value) params.date_to = dateTo.value
  const data = await api.getDashboardMicro(params)
  tasks.value = data.rows || []
}

async function complete(id) {
  try {
    await api.completeTask(id)
    snackbar.value = { show: true, text: '任务已完成', color: 'success' }
    await loadTasks()
  } catch (e) {
    snackbar.value = { show: true, text: e.response?.data?.error || '操作失败', color: 'error' }
  }
}

onMounted(loadTasks)
</script>
