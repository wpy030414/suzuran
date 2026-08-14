<template>
  <v-container>
    <h2 class="text-h5 mb-4">关爱次数统计</h2>

    <v-row class="mb-4">
      <v-col cols="3">
        <v-select v-model="filters.period_type" :items="periodOptions" item-title="text" item-value="value" label="周期类型" />
      </v-col>
      <v-col cols="3" v-if="filters.period_type === 'month'">
        <v-text-field v-model="filters.period_month" type="month" label="月份" />
      </v-col>
      <v-col cols="3" v-if="filters.period_type === 'semester'">
        <v-text-field v-model="filters.academic_year" label="学年" />
      </v-col>
      <v-col cols="3" v-if="filters.period_type === 'semester'">
        <v-select v-model="filters.semester" :items="[1, 2]" label="学期" />
      </v-col>
    </v-row>

    <v-row class="mb-4">
      <v-col cols="4">
        <v-text-field v-model="filters.search" label="搜索学生或教师" clearable />
      </v-col>
      <v-col cols="4">
        <v-btn color="primary" @click="loadStats" class="mr-2">查询</v-btn>
        <v-btn color="success" @click="batchRemind" :loading="reminding">一键提醒</v-btn>
      </v-col>
    </v-row>

    <v-alert type="info" variant="tonal" class="mb-4" v-if="stats.summary">
      <strong>总人数：</strong>{{ stats.summary.total }}人
    </v-alert>

    <v-table density="compact">
      <thead>
        <tr>
          <th>学生</th>
          <th>包保责任人</th>
          <th>计划次数</th>
          <th>已完成</th>
          <th>剩余</th>
          <th>完成率</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in stats.students" :key="s.student_id">
          <td>{{ s.student_name }}</td>
          <td>{{ s.responsible_teacher_name }}</td>
          <td>{{ s.planned_count }}</td>
          <td>{{ s.completed_count }}</td>
          <td>
            <span :class="{ 'text-error': s.remaining_count > 0 }">{{ s.remaining_count }}</span>
          </td>
          <td>
            <v-progress-linear :model-value="s.completion_rate" :color="getProgressColor(s.completion_rate)" height="20">
              <template v-slot:default>
                {{ s.completion_rate }}%
              </template>
            </v-progress-linear>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const stats = ref({ students: [], summary: null })
const reminding = ref(false)
const filters = ref({
  period_type: 'month',
  period_month: new Date().toISOString().substring(0, 7),
  academic_year: '',
  semester: 1,
  search: ''
})

const periodOptions = [
  { text: '月', value: 'month' },
  { text: '学期', value: 'semester' }
]

function getProgressColor(rate) {
  if (rate >= 100) return 'success'
  if (rate >= 60) return 'warning'
  return 'error'
}

async function loadStats() {
  stats.value = await api.getCareStats(filters.value)
}

async function batchRemind() {
  if (!confirm('确定向所有未完成教师发送提醒？')) return
  reminding.value = true
  try {
    const result = await api.batchRemind(filters.value)
    alert(`已向${result.count}位教师发送提醒`)
  } catch (e) {
    alert('提醒失败：' + (e.response?.data?.error || e.message))
  } finally {
    reminding.value = false
  }
}

onMounted(loadStats)
</script>
