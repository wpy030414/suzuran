<template>
  <v-container>
    <h2 class="text-h5 mb-4">统计分析</h2>

    <!-- Filters -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-text-field v-model="filters.academic_year" label="学年" placeholder="2024-2025" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="filters.campus" :items="campuses" label="校区" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="filters.classroom_name" label="班级名称" />
          </v-col>
          <v-col cols="12" md="3">
            <v-btn color="primary" @click="loadStats" class="mr-2">查询</v-btn>
            <v-btn @click="switchTab('cross')" :color="activeTab === 'cross' ? 'primary' : ''">跨维度分析</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-tabs v-model="activeTab" class="mb-4">
      <v-tab value="behavior">行为评价统计</v-tab>
      <v-tab value="learning">学习评价统计</v-tab>
      <v-tab value="cross">跨维度分析</v-tab>
    </v-tabs>

    <!-- Behavior Stats -->
    <v-card v-if="activeTab === 'behavior'">
      <v-card-title>行为评价 - 各维度平均星级</v-card-title>
      <v-card-text>
        <div v-if="behaviorStats.dimension_stats" class="chart-container">
          <div v-for="dim in dimensions" :key="dim" class="bar-item">
            <div class="bar-label">{{ dim }}</div>
            <div class="bar-wrapper">
              <div class="bar" :style="{ width: barWidth(behaviorStats.dimension_stats[dim].average) }">
                {{ behaviorStats.dimension_stats[dim].average.toFixed(2) }}
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-grey">暂无数据</div>
      </v-card-text>
    </v-card>

    <!-- Learning Stats -->
    <v-card v-if="activeTab === 'learning'">
      <v-card-title>学习评价 - 各科成绩分布</v-card-title>
      <v-card-text>
        <div v-if="learningStats.subject_stats" class="subject-grid">
          <div v-for="subj in allSubjects" :key="subj" class="subject-card">
            <div class="text-subtitle-2 mb-2">{{ subj }}</div>
            <div class="grade-bars">
              <div v-for="grade in gradeOptions" :key="grade" class="grade-bar">
                <div class="grade-label">{{ grade }}</div>
                <div class="grade-bar-wrapper">
                  <div class="grade-bar-fill" :style="{ width: gradeWidth(learningStats.subject_stats[subj][grade], learningStats.subject_stats[subj].total), backgroundColor: gradeColor(grade) }">
                    {{ learningStats.subject_stats[subj][grade] }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-grey">暂无数据</div>
      </v-card-text>
    </v-card>

    <!-- Cross Dimensional Stats -->
    <v-card v-if="activeTab === 'cross'">
      <v-card-title>跨维度分析 - 行为 vs 学习</v-card-title>
      <v-card-text>
        <v-row class="mb-4">
          <v-col cols="12" md="4">
            <v-text-field v-model="crossFilters.student_id" label="学生ID (可选)" type="number" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="crossFilters.classroom_name" label="班级名称 (可选)" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="crossFilters.academic_year" label="学年" />
          </v-col>
        </v-row>
        <v-btn color="primary" @click="loadCrossStats" class="mb-4">分析</v-btn>

        <div v-if="crossStats.correlation_data && crossStats.correlation_data.length > 0">
          <div v-if="crossStats.correlation_data.length === 1" class="single-student">
            <v-card variant="outlined" class="pa-4">
              <div class="text-h6 mb-2">学生分析</div>
              <v-row>
                <v-col cols="6">
                  <div class="text-caption">行为评价平均分</div>
                  <div class="text-h4">{{ crossStats.correlation_data[0].behavior_avg.toFixed(2) }}</div>
                </v-col>
                <v-col cols="6">
                  <div class="text-caption">学习评价平均分</div>
                  <div class="text-h4">{{ crossStats.correlation_data[0].learning_avg.toFixed(2) }}</div>
                </v-col>
              </v-row>
            </v-card>
          </div>
          <div v-else class="scatter-chart">
            <svg viewBox="0 0 400 400" class="scatter-svg">
              <!-- Axes -->
              <line x1="50" y1="350" x2="380" y2="350" stroke="#ccc" stroke-width="1" />
              <line x1="50" y1="50" x2="50" y2="350" stroke="#ccc" stroke-width="1" />
              <!-- Labels -->
              <text x="215" y="390" text-anchor="middle" class="axis-label">行为评价平均分</text>
              <text x="20" y="200" text-anchor="middle" class="axis-label" transform="rotate(-90, 20, 200)">学习评价平均分</text>
              <!-- Points -->
              <circle v-for="(d, i) in crossStats.correlation_data" :key="i"
                :cx="50 + (d.behavior_avg / 5) * 300"
                :cy="350 - (d.learning_avg / 5) * 300"
                r="5" fill="#1976d2" />
            </svg>
          </div>
        </div>
        <div v-else class="text-grey">暂无数据</div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import api from '../api.js'

const campuses = ['东校区', '西校区', '南校区', '北校区']
const dimensions = ['爱', '律', '礼', '勤', '洁']
const allSubjects = ['语文', '数学', '英语', '音乐', '体育', '美术', '科学', '道法', '信息科技']
const gradeOptions = ['优', '良', '达标', '待达标']

const activeTab = ref('behavior')

const filters = ref({
  academic_year: '2024-2025',
  campus: '',
  classroom_name: '',
})

const crossFilters = ref({
  student_id: '',
  classroom_name: '',
  academic_year: '2024-2025',
})

const behaviorStats = ref({})
const learningStats = ref({})
const crossStats = ref({})

function barWidth(avg) {
  return `${(avg / 5) * 100}%`
}

function gradeWidth(count, total) {
  if (total === 0) return '0%'
  return `${(count / total) * 100}%`
}

function gradeColor(grade) {
  if (grade === '优') return '#4caf50'
  if (grade === '良') return '#2196f3'
  if (grade === '达标') return '#ff9800'
  if (grade === '待达标') return '#f44336'
  return '#9e9e9e'
}

async function loadStats() {
  const params = {}
  if (filters.value.academic_year) params.academic_year = filters.value.academic_year
  if (filters.value.campus) params.campus = filters.value.campus
  if (filters.value.classroom_name) params.classroom_name = filters.value.classroom_name

  behaviorStats.value = await api.getBehaviorStats(params)
  learningStats.value = await api.getLearningStats(params)
}

async function loadCrossStats() {
  const params = {}
  if (crossFilters.value.student_id) params.student_id = crossFilters.value.student_id
  if (crossFilters.value.classroom_name) params.classroom_name = crossFilters.value.classroom_name
  if (crossFilters.value.academic_year) params.academic_year = crossFilters.value.academic_year

  crossStats.value = await api.getCrossDimensionalStats(params)
}

function switchTab(tab) {
  activeTab.value = tab
}
</script>

<style scoped>
.chart-container {
  max-width: 600px;
}
.bar-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.bar-label {
  width: 40px;
  font-weight: bold;
}
.bar-wrapper {
  flex: 1;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}
.bar {
  background: #1976d2;
  color: white;
  padding: 8px;
  text-align: right;
  border-radius: 4px;
  min-width: 50px;
}
.subject-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}
.subject-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
}
.grade-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.grade-bar {
  display: flex;
  align-items: center;
}
.grade-label {
  width: 50px;
  font-size: 12px;
}
.grade-bar-wrapper {
  flex: 1;
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
}
.grade-bar-fill {
  color: white;
  padding: 4px 8px;
  text-align: right;
  border-radius: 4px;
  min-width: 30px;
  font-size: 12px;
}
.scatter-chart {
  display: flex;
  justify-content: center;
}
.scatter-svg {
  max-width: 400px;
  width: 100%;
}
.axis-label {
  font-size: 12px;
  fill: #666;
}
</style>
