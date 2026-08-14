<template>
  <v-container>
    <h2 class="text-h5 mb-4">听评课统计</h2>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-text-field v-model="filterDate" type="date" label="日期" density="compact" clearable @update:model-value="loadStats" />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-model="filterTaskType" :items="taskTypeOptions" label="任务类型" density="compact" clearable @update:model-value="loadStats" />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" @click="exportCSV" prepend-icon="mdi-download" block>导出CSV</v-btn>
      </v-col>
    </v-row>

    <!-- Stats cards -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-card color="blue-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.total || 0 }}</div>
            <div class="text-caption">总任务数</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="green-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.completed || 0 }}</div>
            <div class="text-caption">已完成</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="orange-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.pending || 0 }}</div>
            <div class="text-caption">待完成</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="purple-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.rate || 0 }}%</div>
            <div class="text-caption">完成率</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Progress bar -->
    <v-card class="mb-4">
      <v-card-text>
        <div class="text-caption mb-1">总体完成进度</div>
        <v-progress-linear
          :model-value="parseFloat(stats.rate || 0)"
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

    <!-- Breakdown by type -->
    <v-row v-if="stats.byType">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>听课任务</v-card-title>
          <v-card-text>
            <div class="text-h5">{{ stats.byType.observation?.completed || 0 }} / {{ stats.byType.observation?.total || 0 }}</div>
            <v-progress-linear
              :model-value="calcRate(stats.byType.observation)"
              height="15"
              rounded
              color="blue"
              class="mt-2"
            />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>研讨任务</v-card-title>
          <v-card-text>
            <div class="text-h5">{{ stats.byType.discussion?.completed || 0 }} / {{ stats.byType.discussion?.total || 0 }}</div>
            <v-progress-linear
              :model-value="calcRate(stats.byType.discussion)"
              height="15"
              rounded
              color="green"
              class="mt-2"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const stats = ref({})
const filterDate = ref('')
const filterTaskType = ref(null)

const taskTypeOptions = [
  { title: '听课', value: 'observation' },
  { title: '研讨', value: 'discussion' },
]

function calcRate(data) {
  if (!data || !data.total) return 0
  return Math.round((data.completed / data.total) * 100)
}

async function loadStats() {
  try {
    const params = {}
    if (filterDate.value) params.date = filterDate.value
    if (filterTaskType.value) params.task_type = filterTaskType.value
    stats.value = await api.getCompletionStats(params)
  } catch (e) {
    stats.value = {}
  }
}

async function exportCSV() {
  try {
    const params = {}
    if (filterDate.value) params.date = filterDate.value
    if (filterTaskType.value) params.task_type = filterTaskType.value
    const result = await api.exportStats(params)
    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `听评课统计_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    console.error(e)
  }
}

onMounted(loadStats)
</script>
