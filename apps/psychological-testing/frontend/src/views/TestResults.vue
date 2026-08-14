<template>
  <v-container>
    <h2 class="text-h5 mb-4">测试结果</h2>

    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="filterGrade"
              :items="gradeOptions"
              label="年级筛选"
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filterClass"
              :items="classOptions"
              label="班级筛选"
              clearable
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-title>结果列表</v-card-title>
      <v-table density="compact">
        <thead>
          <tr>
            <th>学生</th>
            <th>年级/班级</th>
            <th>总分</th>
            <th>风险等级</th>
            <th>维度得分</th>
            <th>建议</th>
            <th>完成时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filteredResults" :key="r.id">
            <td>{{ r.student_name || `学生#${r.student_id}` }}</td>
            <td>{{ r.grade }} {{ r.class_name }}</td>
            <td>{{ r.total_score }}</td>
            <td>
              <v-chip :color="riskColor(r.risk_level)" size="small">
                {{ riskLevelText(r.risk_level) }}
              </v-chip>
            </td>
            <td>
              <div v-if="r.dimension_scores">
                <v-chip
                  v-for="(score, dim) in getDimensionScores(r.dimension_scores)"
                  :key="dim"
                  size="x-small"
                  class="mr-1"
                >
                  {{ dim }}: {{ score }}
                </v-chip>
              </div>
            </td>
            <td class="text-caption">{{ r.recommendations }}</td>
            <td>{{ formatDate(r.completed_at) }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const results = ref([])
const sessions = ref([])
const filterGrade = ref(null)
const filterClass = ref(null)

const gradeOptions = ['高一', '高二', '高三', '初一', '初二', '初三']
const classOptions = ['1班', '2班', '3班', '4班', '5班']

const filteredResults = computed(() => {
  return results.value.filter(r => {
    const session = sessions.value.find(s => s.id === r.session_id)
    if (!session) return false
    if (filterGrade.value && session.grade !== filterGrade.value) return false
    if (filterClass.value && session.class_name !== filterClass.value) return false
    return true
  })
})

function riskColor(level) {
  return { normal: 'success', mild: 'info', moderate: 'warning', severe: 'error' }[level] || 'grey'
}

function riskLevelText(level) {
  return { normal: '正常', mild: '轻度', moderate: '中度', severe: '重度' }[level] || level
}

function getDimensionScores(scores) {
  try {
    const obj = typeof scores === 'string' ? JSON.parse(scores) : scores
    return obj || {}
  } catch {
    return {}
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN')
}

onMounted(async () => {
  results.value = await api.getResults()
  sessions.value = await api.getSessions()
})
</script>
