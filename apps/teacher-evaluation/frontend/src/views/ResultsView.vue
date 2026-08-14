<template>
  <v-container>
    <h2 class="text-h5 mb-4">评价结果</h2>

    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-select
          v-model="selectedActivity"
          :items="activities"
          item-title="name"
          item-value="id"
          label="选择活动"
          @update:model-value="loadResults"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="sortBy"
          :items="sortOptions"
          label="排序方式"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" @click="exportCSV" :disabled="!selectedActivity" prepend-icon="mdi-download">
          导出 CSV
        </v-btn>
      </v-col>
      <v-col cols="12" md="2">
        <v-btn color="secondary" @click="loadResults" :disabled="!selectedActivity" prepend-icon="mdi-refresh">
          刷新
        </v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="!selectedActivity" type="info">
      请选择一个活动以查看评价结果
    </v-alert>

    <div v-else>
      <v-table density="compact" class="elevation-1">
        <thead>
          <tr>
            <th>排名</th>
            <th>被评价人ID</th>
            <th>B1 工作量</th>
            <th>B2 职业道德</th>
            <th>B3 德育工作</th>
            <th>B4 班主任工作</th>
            <th>B5 教学常规</th>
            <th>B6 专业发展</th>
            <th>B7 教学效果</th>
            <th>B8 育人成效</th>
            <th>B9-B12 工作成效</th>
            <th>总分</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in sortedResults" :key="r.evaluatee_id">
            <td>{{ r.rank }}</td>
            <td>{{ r.evaluatee_id }}</td>
            <td :class="scoreClass(r.dimension_scores.b1, 10)">{{ formatScore(r.dimension_scores.b1) }}</td>
            <td :class="scoreClass(r.dimension_scores.b2, 10)">{{ formatScore(r.dimension_scores.b2) }}</td>
            <td :class="scoreClass(r.dimension_scores.b3, 7)">{{ formatScore(r.dimension_scores.b3) }}</td>
            <td :class="scoreClass(r.dimension_scores.b4, 3)">{{ formatScore(r.dimension_scores.b4) }}</td>
            <td :class="scoreClass(r.dimension_scores.b5, 40)">{{ formatScore(r.dimension_scores.b5) }}</td>
            <td :class="scoreClass(r.dimension_scores.b6, 10)">{{ formatScore(r.dimension_scores.b6) }}</td>
            <td :class="scoreClass(r.dimension_scores.b7, 3)">{{ formatScore(r.dimension_scores.b7) }}</td>
            <td :class="scoreClass(r.dimension_scores.b8, 7)">{{ formatScore(r.dimension_scores.b8) }}</td>
            <td :class="scoreClass(r.dimension_scores.b9, 10)">{{ formatScore(r.dimension_scores.b9) }}</td>
            <td class="font-weight-bold">{{ formatScore(r.total_score) }}</td>
          </tr>
        </tbody>
      </v-table>

      <!-- Score Distribution Chart -->
      <v-card class="mt-6" v-if="sortedResults.length > 0">
        <v-card-title>分数分布</v-card-title>
        <v-card-text>
          <div class="chart-container">
            <div v-for="r in sortedResults" :key="r.evaluatee_id" class="bar-row">
              <div class="bar-label">教师 #{{ r.evaluatee_id }}</div>
              <div class="bar-wrapper">
                <div
                  class="bar"
                  :style="{ width: barWidth(r.total_score) + '%', backgroundColor: barColor(r.total_score) }"
                >
                  <span class="bar-value">{{ formatScore(r.total_score) }}</span>
                </div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-alert v-if="sortedResults.length === 0" type="info" class="mt-4">
        暂无评价结果，请先进行评价并汇总
      </v-alert>
    </div>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const activities = ref([])
const results = ref([])
const selectedActivity = ref(null)
const sortBy = ref('total_score')
const snackbar = ref({ show: false, text: '', color: 'success' })

const sortOptions = [
  { title: '按总分降序', value: 'total_score' },
  { title: '按被评价人ID', value: 'evaluatee_id' },
]

const sortedResults = computed(() => {
  const sorted = [...results.value]
  if (sortBy.value === 'total_score') {
    sorted.sort((a, b) => b.total_score - a.total_score)
  } else if (sortBy.value === 'evaluatee_id') {
    sorted.sort((a, b) => a.evaluatee_id - b.evaluatee_id)
  }
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }))
})

const maxScore = computed(() => {
  return Math.max(...results.value.map(r => r.total_score), 1)
})

function formatScore(val) {
  return (parseFloat(val) || 0).toFixed(2)
}

function scoreClass(score, maxExpected) {
  const ratio = (parseFloat(score) || 0) / maxExpected
  if (ratio >= 0.8) return 'bg-green-lighten-4'
  if (ratio >= 0.6) return 'bg-yellow-lighten-4'
  if (ratio < 0.4) return 'bg-red-lighten-4'
  return ''
}

function barWidth(score) {
  return (score / maxScore.value) * 100
}

function barColor(score) {
  const ratio = score / maxScore.value
  if (ratio >= 0.8) return '#4CAF50'
  if (ratio >= 0.6) return '#FFC107'
  if (ratio >= 0.4) return '#FF9800'
  return '#F44336'
}

async function loadResults() {
  if (!selectedActivity.value) return
  try {
    results.value = await api.getResultsByActivity(selectedActivity.value)
  } catch (e) {
    showSnackbar('加载结果失败: ' + (e.response?.data?.error || e.message), 'error')
  }
}

async function exportCSV() {
  if (!selectedActivity.value) return
  try {
    const data = await api.getResultsExport(selectedActivity.value)
    const blob = new Blob([data.csv_content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `教师评价结果_活动${selectedActivity.value}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showSnackbar('导出成功', 'success')
  } catch (e) {
    showSnackbar('导出失败: ' + (e.response?.data?.error || e.message), 'error')
  }
}

function showSnackbar(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

onMounted(async () => {
  activities.value = await api.getActivities()
})
</script>

<style scoped>
.chart-container {
  max-height: 400px;
  overflow-y: auto;
}

.bar-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.bar-label {
  width: 100px;
  font-size: 12px;
  flex-shrink: 0;
}

.bar-wrapper {
  flex: 1;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}

.bar {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  transition: width 0.3s ease;
}

.bar-value {
  color: white;
  font-size: 12px;
  font-weight: bold;
}
</style>
