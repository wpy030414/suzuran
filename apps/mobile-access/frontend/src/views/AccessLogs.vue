<template>
  <v-container>
    <h2 class="text-h5 mb-4">访问日志</h2>

    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-text-field
          v-model="filters.date_from"
          label="开始日期"
          type="date"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field
          v-model="filters.date_to"
          label="结束日期"
          type="date"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="filters.device_id"
          :items="devices"
          item-title="name"
          item-value="id"
          label="设备"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="filters.result"
          :items="resultOptions"
          label="结果"
          clearable
          hide-details
        />
      </v-col>
    </v-row>

    <v-table density="compact">
      <thead>
        <tr>
          <th>时间</th>
          <th>设备</th>
          <th>用户</th>
          <th>方式</th>
          <th>结果</th>
          <th>错误信息</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in filteredLogs" :key="log.id">
          <td>{{ formatTime(log.timestamp) }}</td>
          <td>{{ log.device_name || `设备#${log.device_id}` }}</td>
          <td>{{ log.user_name || `用户#${log.user_id}` }}</td>
          <td>
            <v-chip size="small">{{ methodLabels[log.method] || log.method }}</v-chip>
          </td>
          <td>
            <v-chip :color="log.result === 'success' ? 'success' : 'error'" size="small">
              {{ log.result === 'success' ? '成功' : '失败' }}
            </v-chip>
          </td>
          <td>{{ log.error_message || '-' }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const logs = ref([])
const devices = ref([])

const filters = ref({
  date_from: '',
  date_to: '',
  device_id: null,
  result: ''
})

const resultOptions = [
  { title: '成功', value: 'success' },
  { title: '失败', value: 'failed' }
]

const methodLabels = {
  app: 'APP',
  card: '刷卡',
  face: '人脸',
  remote: '远程'
}

const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    if (filters.value.date_from) {
      if (new Date(log.timestamp) < new Date(filters.value.date_from)) return false
    }
    if (filters.value.date_to) {
      if (new Date(log.timestamp) > new Date(filters.value.date_to + 'T23:59:59')) return false
    }
    if (filters.value.device_id && log.device_id !== filters.value.device_id) return false
    if (filters.value.result && log.result !== filters.value.result) return false
    return true
  })
})

function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}

onMounted(async () => {
  logs.value = await api.getLogs()
  devices.value = await api.getDevices()
})
</script>
