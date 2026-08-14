<template>
  <v-container>
    <h2 class="text-h5 mb-4">课程管理</h2>

    <!-- Search and filter -->
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          label="搜索课程"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          clearable
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="filterDuration"
          :items="durationOptions"
          label="课时筛选"
          density="compact"
          clearable
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="filterGrade"
          :items="grades"
          label="年级筛选"
          density="compact"
          clearable
        />
      </v-col>
      <v-col cols="12" md="2">
        <v-btn color="primary" @click="dialog = true" prepend-icon="mdi-plus" block>新增</v-btn>
      </v-col>
    </v-row>

    <!-- Stats -->
    <v-row class="mb-4">
      <v-col cols="6" md="3">
        <v-card color="blue-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ courses.length }}</div>
            <div class="text-caption">总课程数</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="green-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ totalEnrolled }}</div>
            <div class="text-caption">总选课人次</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="orange-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ totalCapacity }}</div>
            <div class="text-caption">总容量</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="purple-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ avgFillRate }}%</div>
            <div class="text-caption">平均填充率</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Table -->
    <v-table density="compact">
      <thead>
        <tr>
          <th>课程名称</th>
          <th>课时</th>
          <th>适合年级</th>
          <th>容量</th>
          <th>已选</th>
          <th>剩余</th>
          <th>填充率</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in filteredCourses" :key="c.id">
          <td>
            <strong>{{ c.name }}</strong>
            <div class="text-caption" v-if="c.description">{{ c.description.substring(0, 30) }}...</div>
          </td>
          <td><v-chip size="small" color="info">{{ c.duration_type }}</v-chip></td>
          <td>
            <v-chip v-for="g in parseGradeLevels(c.grade_levels)" :key="g" size="small" class="mr-1">{{ g }}年级</v-chip>
          </td>
          <td>{{ c.capacity }}</td>
          <td>{{ c.enrolled_count }}</td>
          <td :class="{ 'text-error': c.remaining_seats === 0 }">{{ c.remaining_seats }}</td>
          <td>
            <v-progress-linear :model-value="getFillRate(c)" height="20" rounded>
              <template v-slot:default="{ value }">
                <strong>{{ value }}%</strong>
              </template>
            </v-progress-linear>
          </td>
          <td>
            <v-btn size="small" variant="text" @click="editCourse(c)">编辑</v-btn>
            <v-btn size="small" variant="text" color="error" @click="remove(c.id)">删除</v-btn>
            <v-btn size="small" variant="text" color="primary" @click="viewStudents(c)">学生</v-btn>
          </td>
        </tr>
        <tr v-if="filteredCourses.length === 0">
          <td colspan="8" class="text-center text-grey py-4">暂无课程</td>
        </tr>
      </tbody>
    </v-table>

    <!-- Create/Edit dialog -->
    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>{{ editingId ? '编辑课程' : '新增课程' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="课程名称" density="compact" :rules="[v => !!v || '必填']" />
          <v-select v-model="form.duration_type" :items="durationOptions" label="课时" density="compact" />
          <v-combobox v-model="form.grade_levels" :items="gradeNumbers" label="适合年级" multiple chips density="compact" />
          <v-text-field v-model="form.capacity" type="number" label="容量" density="compact" :rules="[v => v > 0 || '必须大于0']" />
          <v-text-field v-model="form.teacher_name" label="授课教师" density="compact" />
          <v-textarea v-model="form.description" label="简介" density="compact" rows="3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Student list dialog -->
    <v-dialog v-model="studentDialog" max-width="600">
      <v-card>
        <v-card-title>{{ studentCourse?.name }} - 学生名单</v-card-title>
        <v-card-text>
          <v-table density="compact" v-if="students.length > 0">
            <thead>
              <tr><th>序号</th><th>年级</th><th>班级</th><th>姓名</th></tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in students" :key="i">
                <td>{{ i + 1 }}</td>
                <td>{{ s.grade }}年级</td>
                <td>{{ s.classroom }}</td>
                <td>{{ s.name }}</td>
              </tr>
            </tbody>
          </v-table>
          <v-alert v-else type="info">暂无学生选课</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-btn @click="exportStudents">导出CSV</v-btn>
          <v-spacer />
          <v-btn @click="studentDialog = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const courses = ref([])
const search = ref('')
const filterDuration = ref('')
const filterGrade = ref('')
const dialog = ref(false)
const editingId = ref(null)
const studentDialog = ref(false)
const studentCourse = ref(null)
const students = ref([])
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const durationOptions = ['30分钟', '60分钟', '90分钟']
const grades = [
  { title: '三年级', value: 3 },
  { title: '四年级', value: 4 },
  { title: '五年级', value: 5 },
  { title: '六年级', value: 6 },
]
const gradeNumbers = [3, 4, 5, 6]

const form = ref({
  name: '',
  duration_type: '30分钟',
  grade_levels: [],
  capacity: 40,
  teacher_name: '',
  description: '',
})

const filteredCourses = computed(() => {
  let result = courses.value
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter(c => c.name.toLowerCase().includes(s) || (c.description || '').toLowerCase().includes(s))
  }
  if (filterDuration.value) {
    result = result.filter(c => c.duration_type === filterDuration.value)
  }
  if (filterGrade.value) {
    result = result.filter(c => {
      const levels = typeof c.grade_levels === 'string' ? JSON.parse(c.grade_levels) : c.grade_levels
      return Array.isArray(levels) && levels.includes(filterGrade.value)
    })
  }
  return result
})

const totalEnrolled = computed(() => courses.value.reduce((sum, c) => sum + (c.enrolled_count || 0), 0))
const totalCapacity = computed(() => courses.value.reduce((sum, c) => sum + (c.capacity || 0), 0))
const avgFillRate = computed(() => {
  if (courses.value.length === 0) return 0
  const rates = courses.value.map(c => getFillRate(c))
  return (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1)
})

function getFillRate(c) {
  if (!c.capacity) return 0
  return Math.round(((c.enrolled_count || 0) / c.capacity) * 100)
}

function parseGradeLevels(levels) {
  if (!levels) return []
  const arr = typeof levels === 'string' ? JSON.parse(levels) : levels
  return Array.isArray(arr) ? arr : []
}

function editCourse(c) {
  editingId.value = c.id
  form.value = {
    name: c.name,
    duration_type: c.duration_type,
    grade_levels: parseGradeLevels(c.grade_levels),
    capacity: c.capacity,
    teacher_name: c.teacher_name || '',
    description: c.description || '',
  }
  dialog.value = true
}

async function save() {
  const data = {
    ...form.value,
    grade_levels: JSON.stringify(form.value.grade_levels),
    enrolled_count: 0,
  }

  // Calculate duration_minutes
  const match = data.duration_type.match(/(\d+)/)
  if (match) data.duration_minutes = parseInt(match[1])

  if (editingId.value) {
    await api.updateCourse(editingId.value, data)
  } else {
    await api.createCourse(data)
  }
  dialog.value = false
  editingId.value = null
  form.value = { name: '', duration_type: '30分钟', grade_levels: [], capacity: 40, teacher_name: '', description: '' }
  await loadCourses()
  showMsg('保存成功')
}

async function remove(id) {
  if (confirm('确定删除此课程？')) {
    await api.deleteCourse(id)
    await loadCourses()
    showMsg('删除成功')
  }
}

async function viewStudents(c) {
  studentCourse.value = c
  try {
    const result = await api.getCourseStudents(c.id)
    students.value = result.students || []
  } catch {
    students.value = []
  }
  studentDialog.value = true
}

async function exportStudents() {
  if (!studentCourse.value) return
  try {
    const result = await api.exportCourseStudents(studentCourse.value.id)
    const csvData = result.data
    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${studentCourse.value.name}_学生名单.csv`
    link.click()
    showMsg('导出成功')
  } catch (e) {
    showMsg('导出失败', 'error')
  }
}

function showMsg(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

async function loadCourses() {
  const result = await api.getCourses()
  courses.value = result.rows || []
}

onMounted(loadCourses)
</script>
