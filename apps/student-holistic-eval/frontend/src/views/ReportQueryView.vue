<template>
  <v-container>
    <h2 class="text-h5 mb-4">报告查询</h2>

    <!-- Query Form -->
    <v-card class="mb-4">
      <v-card-title>查询条件</v-card-title>
      <v-card-text>
        <v-alert v-if="queryError" type="error" class="mb-4">{{ queryError }}</v-alert>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model="query.academic_year" label="学年 *" placeholder="2024-2025" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="query.campus" :items="campuses" label="校区 *" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="query.classroom_name" label="班级名称 *" placeholder="2024级1班" />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model="query.student_name" label="学生姓名 *" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="query.student_no" label="学号 *" />
          </v-col>
          <v-col cols="12" md="4">
            <v-btn color="primary" @click="generateReport" :loading="loading" block>生成报告</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Report Display -->
    <div v-if="report">
      <!-- Basic Info -->
      <v-card class="mb-4">
        <v-card-title>基本信息</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6" md="3"><strong>学年:</strong> {{ report.academic_year }}</v-col>
            <v-col cols="6" md="3"><strong>校区:</strong> {{ report.campus }}</v-col>
            <v-col cols="6" md="3"><strong>班级:</strong> {{ report.classroom_name }}</v-col>
            <v-col cols="6" md="3"><strong>段别:</strong> {{ report.segment }}</v-col>
          </v-row>
          <v-row>
            <v-col cols="6" md="3"><strong>姓名:</strong> {{ report.student_name }}</v-col>
            <v-col cols="6" md="3"><strong>学号:</strong> {{ report.student_no }}</v-col>
            <v-col cols="6" md="3"><strong>生成时间:</strong> {{ formatDate(report.generated_at) }}</v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Behavior Section -->
      <v-card class="mb-4">
        <v-card-title>行为评价（爱律礼勤洁）</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6" v-for="semester in ['上学期', '下学期']" :key="semester">
              <v-card variant="outlined" class="pa-4">
                <div class="text-h6 mb-3">{{ semester }}</div>
                <div v-if="behaviorData[semester]">
                  <!-- Pentagon Chart -->
                  <div class="pentagon-container mb-3">
                    <svg viewBox="0 0 200 200" class="pentagon-chart">
                      <!-- Background pentagon -->
                      <polygon :points="pentagonPoints(5)" fill="none" stroke="#e0e0e0" stroke-width="1" />
                      <polygon :points="pentagonPoints(4)" fill="none" stroke="#e0e0e0" stroke-width="1" />
                      <polygon :points="pentagonPoints(3)" fill="none" stroke="#e0e0e0" stroke-width="1" />
                      <polygon :points="pentagonPoints(2)" fill="none" stroke="#e0e0e0" stroke-width="1" />
                      <polygon :points="pentagonPoints(1)" fill="none" stroke="#e0e0e0" stroke-width="1" />
                      <!-- Data polygon -->
                      <polygon :points="dataPentagonPoints(behaviorData[semester].ai_stars)" fill="rgba(25, 118, 210, 0.3)" stroke="#1976d2" stroke-width="2" />
                      <!-- Labels -->
                      <text v-for="(dim, i) in dimensions" :key="dim" :x="labelPos(i).x" :y="labelPos(i).y" text-anchor="middle" class="pentagon-label">{{ dim }}</text>
                    </svg>
                  </div>
                  <v-row dense>
                    <v-col cols="6" v-for="dim in dimensions" :key="dim">
                      <div class="text-caption">{{ dim }}</div>
                      <v-rating :model-value="behaviorData[semester].ai_stars[dim]" readonly density="compact" size="small" color="warning" />
                    </v-col>
                  </v-row>
                  <div class="mt-2">
                    <strong>总评:</strong>
                    <v-rating :model-value="behaviorData[semester].overall_stars" readonly density="compact" size="small" color="warning" />
                  </div>
                  <div v-if="behaviorData[semester].comment" class="mt-2 text-body-2">
                    <strong>评语:</strong> {{ behaviorData[semester].comment }}
                  </div>
                </div>
                <div v-else class="text-grey">暂无数据</div>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Learning Section -->
      <v-card class="mb-4">
        <v-card-title>学习评价</v-card-title>
        <v-card-text>
          <v-table density="compact">
            <thead>
              <tr>
                <th>科目</th>
                <th>学期</th>
                <th>日常</th>
                <th>期中</th>
                <th>期末</th>
                <th>总评</th>
                <th>兴趣</th>
                <th>习惯</th>
                <th>总评星级</th>
                <th>附言</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="subject in subjects" :key="subject">
                <tr v-for="semester in ['上学期', '下学期']" :key="`${subject}-${semester}`">
                  <td v-if="semester === '上学期'" :rowspan="2" class="font-weight-bold">{{ subject }}</td>
                  <td>{{ semester }}</td>
                  <td v-if="learningData[subject] && learningData[subject][semester]">
                    <v-chip size="small" :color="gradeColor(learningData[subject][semester].daily_grade)">{{ learningData[subject][semester].daily_grade || '-' }}</v-chip>
                  </td>
                  <td v-else>-</td>
                  <td v-if="learningData[subject] && learningData[subject][semester]">
                    <v-chip size="small" :color="gradeColor(learningData[subject][semester].midterm_grade)">{{ learningData[subject][semester].midterm_grade || '-' }}</v-chip>
                  </td>
                  <td v-else>-</td>
                  <td v-if="learningData[subject] && learningData[subject][semester]">
                    <v-chip size="small" :color="gradeColor(learningData[subject][semester].final_grade)">{{ learningData[subject][semester].final_grade || '-' }}</v-chip>
                  </td>
                  <td v-else>-</td>
                  <td v-if="learningData[subject] && learningData[subject][semester]">
                    <v-chip size="small" :color="gradeColor(learningData[subject][semester].total_grade)">{{ learningData[subject][semester].total_grade || '-' }}</v-chip>
                  </td>
                  <td v-else>-</td>
                  <td v-if="learningData[subject] && learningData[subject][semester]">
                    <v-rating :model-value="avgStars(learningData[subject][semester], 'interest')" readonly density="compact" size="small" color="warning" />
                  </td>
                  <td v-else>-</td>
                  <td v-if="learningData[subject] && learningData[subject][semester]">
                    <v-rating :model-value="avgStars(learningData[subject][semester], 'habit')" readonly density="compact" size="small" color="warning" />
                  </td>
                  <td v-else>-</td>
                  <td v-if="learningData[subject] && learningData[subject][semester]">
                    <v-rating :model-value="learningData[subject][semester].overall_stars" readonly density="compact" size="small" color="warning" />
                  </td>
                  <td v-else>-</td>
                  <td v-if="learningData[subject] && learningData[subject][semester]">
                    {{ learningData[subject][semester].comment || '-' }}
                  </td>
                  <td v-else>-</td>
                </tr>
              </template>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <!-- Template Images -->
      <v-card v-if="report.template_images && report.template_images.length > 0" class="mb-4">
        <v-card-title>评价模板</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="4" v-for="tpl in report.template_images" :key="tpl.id">
              <v-card variant="outlined">
                <v-img :src="tpl.image_url" height="200" cover />
                <v-card-text>{{ tpl.title }}</v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Export Button -->
      <v-btn color="primary" @click="exportReport" prepend-icon="mdi-download" class="mb-4">导出报告</v-btn>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../api.js'

const campuses = ['东校区', '西校区', '南校区', '北校区']
const dimensions = ['爱', '律', '礼', '勤', '洁']
const lowSegmentSubjects = ['语文', '数学', '英语', '音乐', '体育', '美术', '科学', '道法']
const highSegmentSubjects = [...lowSegmentSubjects, '信息科技']

const query = ref({
  academic_year: '',
  campus: '',
  classroom_name: '',
  student_name: '',
  student_no: '',
})

const queryError = ref('')
const loading = ref(false)
const report = ref(null)

const behaviorData = computed(() => {
  if (!report.value || !report.value.behavior_data) return {}
  const data = typeof report.value.behavior_data === 'string' ? JSON.parse(report.value.behavior_data) : report.value.behavior_data
  return data
})

const learningData = computed(() => {
  if (!report.value || !report.value.learning_data) return {}
  const data = typeof report.value.learning_data === 'string' ? JSON.parse(report.value.learning_data) : report.value.learning_data
  return data
})

const subjects = computed(() => {
  if (!report.value) return []
  return report.value.segment === '中高段' ? highSegmentSubjects : lowSegmentSubjects
})

function gradeColor(grade) {
  if (grade === '优') return 'success'
  if (grade === '良') return 'info'
  if (grade === '达标') return 'warning'
  if (grade === '待达标') return 'error'
  return 'grey'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN')
}

function avgStars(data, type) {
  if (!data) return 0
  const prefix = type === 'interest' ? 'interest_' : 'habit_'
  const count = type === 'interest' ? 3 : 4
  let total = 0, cnt = 0
  for (let i = 1; i <= count; i++) {
    const val = data[`${prefix}${i}`]
    if (val) {
      total += parseInt(val)
      cnt++
    }
  }
  return cnt > 0 ? Math.round(total / cnt) : 0
}

// Pentagon chart helpers
function pentagonPoints(level) {
  const cx = 100, cy = 100, r = 80 * (level / 5)
  const points = []
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 * i / 5) - Math.PI / 2
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    points.push(`${x},${y}`)
  }
  return points.join(' ')
}

function dataPentagonPoints(aiStars) {
  if (!aiStars) return pentagonPoints(0)
  const cx = 100, cy = 100, maxR = 80
  const points = []
  const dims = ['爱', '律', '礼', '勤', '洁']
  for (let i = 0; i < 5; i++) {
    const val = aiStars[dims[i]] || 0
    const r = maxR * (val / 5)
    const angle = (Math.PI * 2 * i / 5) - Math.PI / 2
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    points.push(`${x},${y}`)
  }
  return points.join(' ')
}

function labelPos(i) {
  const cx = 100, cy = 100, r = 95
  const angle = (Math.PI * 2 * i / 5) - Math.PI / 2
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle) + 5,
  }
}

async function generateReport() {
  queryError.value = ''
  // Validate all required fields
  const missing = []
  if (!query.value.academic_year) missing.push('学年')
  if (!query.value.campus) missing.push('校区')
  if (!query.value.classroom_name) missing.push('班级名称')
  if (!query.value.student_name) missing.push('学生姓名')
  if (!query.value.student_no) missing.push('学号')

  if (missing.length > 0) {
    queryError.value = `请填写必填字段: ${missing.join(', ')}`
    return
  }

  loading.value = true
  try {
    const result = await api.generateReport(query.value)
    report.value = result.data
    // Parse template_images if it's a string
    if (report.value.template_images && typeof report.value.template_images === 'string') {
      report.value.template_images = JSON.parse(report.value.template_images)
    }
  } catch (e) {
    queryError.value = e.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

function exportReport() {
  alert('报告导出功能（模拟）：报告已准备导出')
}
</script>

<style scoped>
.pentagon-container {
  display: flex;
  justify-content: center;
  align-items: center;
}
.pentagon-chart {
  width: 180px;
  height: 180px;
}
.pentagon-label {
  font-size: 12px;
  fill: #666;
}
</style>
