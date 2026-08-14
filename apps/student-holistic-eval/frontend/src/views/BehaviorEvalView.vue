<template>
  <v-container>
    <h2 class="text-h5 mb-4">行为评价（爱律礼勤洁）</h2>

    <!-- Filters -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-text-field v-model="filters.academic_year" label="学年" placeholder="2024-2025" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="filters.semester" :items="['上学期', '下学期']" label="学期" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="filters.campus" :items="campuses" label="校区" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="filters.classroom_id" :items="classrooms" item-title="name" item-value="id" label="班级" @update:model-value="onClassroomChange" />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="3">
            <v-text-field v-model="filters.evaluator_name" label="班主任姓名" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="mode" :items="[{title: '单人模式', value: 'single'}, {title: '批量模式', value: 'batch'}]" label="评价模式" />
          </v-col>
          <v-col cols="12" md="3" v-if="mode === 'single'">
            <v-select v-model="selectedStudentId" :items="students" :item-title="s => `${s.name} (${s.student_no})`" item-value="id" label="选择学生" />
          </v-col>
          <v-col cols="12" md="3">
            <v-btn color="primary" @click="loadEvaluations" class="mr-2">查询</v-btn>
            <v-btn color="success" @click="showSubmitDialog = true">提交评价</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Evaluations List -->
    <v-card>
      <v-card-title>已提交评价 ({{ evaluations.length }} 条)</v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>学生</th>
              <th>学号</th>
              <th>爱</th>
              <th>律</th>
              <th>礼</th>
              <th>勤</th>
              <th>洁</th>
              <th>总评</th>
              <th>评语</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in evaluations" :key="e.id">
              <td>{{ e.student_name }}</td>
              <td>{{ e.student_no }}</td>
              <td><v-rating v-model="e.ai_stars.爱" readonly density="compact" size="small" color="warning" /></td>
              <td><v-rating v-model="e.ai_stars.律" readonly density="compact" size="small" color="warning" /></td>
              <td><v-rating v-model="e.ai_stars.礼" readonly density="compact" size="small" color="warning" /></td>
              <td><v-rating v-model="e.ai_stars.勤" readonly density="compact" size="small" color="warning" /></td>
              <td><v-rating v-model="e.ai_stars.洁" readonly density="compact" size="small" color="warning" /></td>
              <td><v-rating v-model="e.overall_stars" readonly density="compact" size="small" color="warning" /></td>
              <td>{{ e.comment || '-' }}</td>
              <td>
                <v-btn size="small" color="error" @click="removeEvaluation(e.id)">删除</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- Submit Dialog -->
    <v-dialog v-model="showSubmitDialog" max-width="800" scrollable>
      <v-card>
        <v-card-title>提交行为评价</v-card-title>
        <v-card-text>
          <v-alert v-if="submitError" type="error" class="mb-4">{{ submitError }}</v-alert>
          <v-row v-if="mode === 'single'">
            <v-col cols="12">
              <div class="text-subtitle-1">学生: {{ currentStudent?.name }} ({{ currentStudent?.student_no }})</div>
            </v-col>
          </v-row>
          <div v-for="(form, idx) in submitForms" :key="idx" class="mb-4 pa-4 border rounded">
            <div class="text-subtitle-2 mb-2">{{ form.student_name }} ({{ form.student_no }})</div>
            <v-row>
              <v-col cols="6" md="4" v-for="dim in dimensions" :key="dim">
                <v-rating v-model="form.ai_stars[dim]" :label="dim" length="5" color="warning" density="compact" />
                <div class="text-caption">{{ dim }}</div>
              </v-col>
            </v-row>
            <v-row class="mt-2">
              <v-col cols="6">
                <v-rating v-model="form.overall_stars" label="总评" length="5" color="warning" density="compact" />
                <div class="text-caption">总评</div>
              </v-col>
              <v-col cols="6">
                <v-text-field v-model="form.comment" label="评语" density="compact" />
              </v-col>
            </v-row>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showSubmitDialog = false">取消</v-btn>
          <v-btn color="primary" @click="submitEvaluations" :loading="submitting">提交</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const dimensions = ['爱', '律', '礼', '勤', '洁']
const campuses = ['东校区', '西校区', '南校区', '北校区']

const classrooms = ref([])
const students = ref([])
const evaluations = ref([])

const filters = ref({
  academic_year: '2024-2025',
  semester: '上学期',
  campus: '',
  classroom_id: null,
  evaluator_name: '',
})

const mode = ref('single')
const selectedStudentId = ref(null)
const showSubmitDialog = ref(false)
const submitting = ref(false)
const submitError = ref('')

const currentStudent = computed(() => {
  return students.value.find(s => s.id === selectedStudentId.value)
})

const submitForms = computed(() => {
  const selectedClassroom = classrooms.value.find(c => c.id === filters.value.classroom_id)
  if (!selectedClassroom) return []

  const baseData = {
    academic_year: filters.value.academic_year,
    semester: filters.value.semester,
    campus: filters.value.campus,
    classroom_name: selectedClassroom.name,
    evaluator_name: filters.value.evaluator_name,
  }

  const targetStudents = mode.value === 'single' && currentStudent.value
    ? [currentStudent.value]
    : students.value

  return targetStudents.map(s => ({
    ...baseData,
    student_id: s.id,
    student_name: s.name,
    student_no: s.student_no,
    ai_stars: { '爱': 3, '律': 3, '礼': 3, '勤': 3, '洁': 3 },
    overall_stars: 3,
    comment: '',
  }))
})

async function onClassroomChange() {
  students.value = []
  if (filters.value.classroom_id) {
    students.value = await api.getStudentsByClassroom(filters.value.classroom_id)
  }
}

async function loadEvaluations() {
  const params = {}
  if (filters.value.academic_year) params.academic_year = filters.value.academic_year
  if (filters.value.semester) params.semester = filters.value.semester
  if (filters.value.campus) params.campus = filters.value.campus
  if (filters.value.classroom_id) {
    const classroom = classrooms.value.find(c => c.id === filters.value.classroom_id)
    if (classroom) params.classroom_name = classroom.name
  }
  evaluations.value = await api.getBehaviorEvaluations(params)
  // Parse ai_stars JSON
  for (const e of evaluations.value) {
    if (typeof e.ai_stars === 'string') {
      e.ai_stars = JSON.parse(e.ai_stars)
    }
  }
}

async function submitEvaluations() {
  submitError.value = ''
  submitting.value = true
  try {
    if (mode.value === 'single' && submitForms.value.length === 1) {
      await api.createBehaviorEvaluation(submitForms.value[0])
    } else {
      const result = await api.batchCreateBehaviorEvaluations(submitForms.value)
      if (result.data.errors && result.data.errors.length > 0) {
        submitError.value = `部分提交失败: ${result.data.errors.map(e => `#${e.index}: ${e.error}`).join('; ')}`
      }
    }
    showSubmitDialog.value = false
    await loadEvaluations()
  } catch (e) {
    submitError.value = e.response?.data?.error || e.message
  } finally {
    submitting.value = false
  }
}

async function removeEvaluation(id) {
  if (confirm('确定删除？')) {
    await api.deleteBehaviorEvaluation(id)
    await loadEvaluations()
  }
}

onMounted(async () => {
  classrooms.value = await api.getClassrooms()
})
</script>
