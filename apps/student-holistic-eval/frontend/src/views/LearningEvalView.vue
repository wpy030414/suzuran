<template>
  <v-container>
    <h2 class="text-h5 mb-4">学习评价</h2>

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
            <v-select v-model="filters.subject" :items="allSubjects" label="科目" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="filters.teacher_name" label="任课教师" />
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
              <th>科目</th>
              <th>日常</th>
              <th>期中</th>
              <th>期末</th>
              <th>总评</th>
              <th>总评星级</th>
              <th>附言</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in evaluations" :key="e.id">
              <td>{{ e.student_name }}</td>
              <td>{{ e.subject }}</td>
              <td><v-chip size="small" :color="gradeColor(e.daily_grade)">{{ e.daily_grade || '-' }}</v-chip></td>
              <td><v-chip size="small" :color="gradeColor(e.midterm_grade)">{{ e.midterm_grade || '-' }}</v-chip></td>
              <td><v-chip size="small" :color="gradeColor(e.final_grade)">{{ e.final_grade || '-' }}</v-chip></td>
              <td><v-chip size="small" :color="gradeColor(e.total_grade)">{{ e.total_grade || '-' }}</v-chip></td>
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
    <v-dialog v-model="showSubmitDialog" max-width="1000" scrollable>
      <v-card>
        <v-card-title>提交学习评价</v-card-title>
        <v-card-text>
          <v-alert v-if="submitError" type="error" class="mb-4">{{ submitError }}</v-alert>
          <div v-for="(form, idx) in submitForms" :key="idx" class="mb-4 pa-4 border rounded">
            <div class="text-subtitle-2 mb-2">{{ form.student_name }} ({{ form.student_no }}) - {{ form.subject }}</div>
            <v-row>
              <v-col cols="6" md="3">
                <v-select v-model="form.daily_grade" :items="gradeOptions" label="日常成绩" clearable />
              </v-col>
              <v-col cols="6" md="3">
                <v-select v-model="form.midterm_grade" :items="gradeOptions" label="期中成绩" clearable />
              </v-col>
              <v-col cols="6" md="3">
                <v-select v-model="form.final_grade" :items="gradeOptions" label="期末成绩" clearable />
              </v-col>
              <v-col cols="6" md="3">
                <v-select v-model="form.total_grade" :items="gradeOptions" label="学期总评" clearable />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="6">
                <div class="text-caption mb-1">学习兴趣 (I/II/III)</div>
                <v-row dense>
                  <v-col cols="4">
                    <v-rating v-model="form.interest_1" label="I" length="5" color="warning" density="compact" />
                  </v-col>
                  <v-col cols="4">
                    <v-rating v-model="form.interest_2" label="II" length="5" color="warning" density="compact" />
                  </v-col>
                  <v-col cols="4">
                    <v-rating v-model="form.interest_3" label="III" length="5" color="warning" density="compact" />
                  </v-col>
                </v-row>
              </v-col>
              <v-col cols="12" md="6">
                <div class="text-caption mb-1">学习习惯 (I/II/III/IV)</div>
                <v-row dense>
                  <v-col cols="3">
                    <v-rating v-model="form.habit_1" length="5" color="warning" density="compact" />
                  </v-col>
                  <v-col cols="3">
                    <v-rating v-model="form.habit_2" length="5" color="warning" density="compact" />
                  </v-col>
                  <v-col cols="3">
                    <v-rating v-model="form.habit_3" length="5" color="warning" density="compact" />
                  </v-col>
                  <v-col cols="3">
                    <v-rating v-model="form.habit_4" length="5" color="warning" density="compact" />
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                <v-rating v-model="form.overall_stars" label="总评" length="5" color="warning" density="compact" />
                <div class="text-caption">总评</div>
              </v-col>
              <v-col cols="6">
                <v-text-field v-model="form.comment" label="附言" density="compact" />
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

const allSubjects = ['语文', '数学', '英语', '音乐', '体育', '美术', '科学', '道法', '信息科技']
const gradeOptions = ['优', '良', '达标', '待达标']
const campuses = ['东校区', '西校区', '南校区', '北校区']

const classrooms = ref([])
const students = ref([])
const evaluations = ref([])

const filters = ref({
  academic_year: '2024-2025',
  semester: '上学期',
  campus: '',
  classroom_id: null,
  subject: '',
  teacher_name: '',
})

const showSubmitDialog = ref(false)
const submitting = ref(false)
const submitError = ref('')

function gradeColor(grade) {
  if (grade === '优') return 'success'
  if (grade === '良') return 'info'
  if (grade === '达标') return 'warning'
  if (grade === '待达标') return 'error'
  return 'grey'
}

const submitForms = computed(() => {
  const selectedClassroom = classrooms.value.find(c => c.id === filters.value.classroom_id)
  if (!selectedClassroom || !filters.value.subject) return []

  const baseData = {
    academic_year: filters.value.academic_year,
    semester: filters.value.semester,
    campus: filters.value.campus,
    classroom_name: selectedClassroom.name,
    teacher_name: filters.value.teacher_name,
    subject: filters.value.subject,
  }

  return students.value.map(s => ({
    ...baseData,
    student_id: s.id,
    student_name: s.name,
    student_no: s.student_no,
    daily_grade: null,
    midterm_grade: null,
    final_grade: null,
    total_grade: null,
    interest_1: 3,
    interest_2: 3,
    interest_3: 3,
    habit_1: 3,
    habit_2: 3,
    habit_3: 3,
    habit_4: 3,
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
  if (filters.value.subject) params.subject = filters.value.subject
  if (filters.value.classroom_id) {
    const classroom = classrooms.value.find(c => c.id === filters.value.classroom_id)
    if (classroom) params.classroom_name = classroom.name
  }
  evaluations.value = await api.getLearningEvaluations(params)
}

async function submitEvaluations() {
  submitError.value = ''
  submitting.value = true
  try {
    const result = await api.batchCreateLearningEvaluations(submitForms.value)
    if (result.data.errors && result.data.errors.length > 0) {
      submitError.value = `部分提交失败: ${result.data.errors.map(e => `#${e.index}: ${e.error}`).join('; ')}`
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
    await api.deleteLearningEvaluation(id)
    await loadEvaluations()
  }
}

onMounted(async () => {
  classrooms.value = await api.getClassrooms()
})
</script>
