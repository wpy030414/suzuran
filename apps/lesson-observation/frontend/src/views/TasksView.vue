<template>
  <v-container>
    <h2 class="text-h5 mb-4">我的任务</h2>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-select v-model="filterType" :items="typeOptions" label="任务类型" clearable density="compact" @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-model="filterStatus" :items="statusOptions" label="状态" clearable density="compact" @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="searchSerial" label="搜索流水号" density="compact" clearable prepend-inner-icon="mdi-magnify" />
      </v-col>
    </v-row>

    <!-- Stats -->
    <v-row class="mb-4" v-if="completionStats">
      <v-col cols="6" md="3">
        <v-card color="blue-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ completionStats.total || 0 }}</div>
            <div class="text-caption">总任务数</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="green-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ completionStats.completed || 0 }}</div>
            <div class="text-caption">已完成</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="orange-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ completionStats.rate || 0 }}%</div>
            <div class="text-caption">完成率</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="purple-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ (completionStats.total || 0) - (completionStats.completed || 0) }}</div>
            <div class="text-caption">待完成</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Task list -->
    <v-table density="compact">
      <thead>
        <tr>
          <th>流水号</th>
          <th>任务类型</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>完成时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in filteredTasks" :key="t.id">
          <td><code>{{ t.serial_number }}</code></td>
          <td>
            <v-chip :color="t.task_type === 'observation' ? 'blue' : 'green'" size="small">
              {{ t.task_type === 'observation' ? '听课' : '研讨' }}
            </v-chip>
          </td>
          <td>
            <v-chip :color="t.status === 'completed' ? 'success' : 'warning'" size="small">
              {{ t.status === 'completed' ? '已完成' : '待完成' }}
            </v-chip>
          </td>
          <td>{{ formatDate(t.created_at) }}</td>
          <td>{{ t.completed_at ? formatDate(t.completed_at) : '-' }}</td>
          <td>
            <v-btn
              v-if="t.status !== 'completed'"
              size="small"
              color="success"
              variant="flat"
              @click="complete(t.id)"
              prepend-icon="mdi-check"
            >
              标记完成
            </v-btn>
            <v-icon v-else color="success">mdi-check-circle</v-icon>
          </td>
        </tr>
        <tr v-if="filteredTasks.length === 0">
          <td colspan="6" class="text-center text-grey py-4">暂无任务</td>
        </tr>
      </tbody>
    </v-table>

    <!-- Progress bar -->
    <v-card class="mt-4" v-if="completionStats">
      <v-card-text>
        <div class="text-caption mb-1">总体完成进度</div>
        <v-progress-linear
          :model-value="parseFloat(completionStats.rate || 0)"
          height="25"
          rounded
          color="success"
        >
          <template v-slot:default="{ value }">
            <strong>{{ value }}%</strong>
          </template>
        </v-progress-linear>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const tasks = ref([])
const completionStats = ref(null)
const filterType = ref(null)
const filterStatus = ref(null)
const searchSerial = ref('')

const typeOptions = [
  { title: '听课', value: 'observation' },
  { title: '研讨', value: 'discussion' },
]
const statusOptions = [
  { title: '待完成', value: 'pending' },
  { title: '已完成', value: 'completed' },
]

const filteredTasks = computed(() => {
  let result = tasks.value
  if (filterType.value) result = result.filter(t => t.task_type === filterType.value)
  if (filterStatus.value) result = result.filter(t => t.status === filterStatus.value)
  if (searchSerial.value) {
    const s = searchSerial.value.toLowerCase()
    result = result.filter(t => (t.serial_number || '').toLowerCase().includes(s))
  }
  return result
})

function formatDate(d) {
  return d ? new Date(d).toLocaleString('zh-CN') : '-'
}

async function loadData() {
  const params = {}
  if (filterType.value) params.task_type = filterType.value
  if (filterStatus.value) params.status = filterStatus.value
  tasks.value = await api.getTasks(params)
  try {
    completionStats.value = await api.getCompletionStats()
  } catch { /* ignore */ }
}

async function complete(id) {
  try {
    await api.completeTask(id)
    await loadData()
  } catch (e) {
    console.error(e)
  }
}

onMounted(loadData)
</script>
