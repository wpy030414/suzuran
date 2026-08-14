<template>
  <v-container>
    <h2 class="text-h5 mb-4">选修课选课</h2>

    <!-- Student info -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-text-field v-model="studentName" label="学生姓名" density="compact" :rules="[v => !!v || '必填']" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="studentGrade" :items="grades" label="年级" density="compact" @update:model-value="onGradeChange" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="studentClassroom" label="班级" density="compact" />
          </v-col>
          <v-col cols="12" md="3">
            <div class="text-caption">已选 {{ selectedCourses.length }} 门 / 合计 {{ totalMinutes }} 分钟</div>
            <div class="text-caption" v-if="totalMinutes > 0">剩余可选: {{ 90 - totalMinutes }} 分钟</div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Selected courses -->
    <v-card v-if="selectedCourses.length > 0" class="mb-4">
      <v-card-title>已选课程</v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr><th>课程名称</th><th>课时</th><th>时长</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in selectedCourses" :key="c.id">
              <td>{{ c.name }}</td>
              <td>{{ c.duration_type }}</td>
              <td>{{ c.duration_minutes }} 分钟</td>
              <td>
                <v-btn size="small" color="error" variant="text" @click="removeCourse(c)">退选</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- Available courses -->
    <h3 class="text-h6 mb-2">全部课程</h3>
    <v-row>
      <v-col cols="12" md="4" v-for="course in filteredCourses" :key="course.id">
        <v-card :class="{ 'border-success': isSelected(course) }">
          <v-card-title class="text-subtitle-1">
            {{ course.name }}
            <v-chip v-if="isSelected(course)" color="success" size="small" class="ml-2">已选</v-chip>
          </v-card-title>
          <v-card-subtitle>
            课时: {{ course.duration_type }} |
            剩余: <span :class="{ 'text-error': course.remaining_seats === 0 }">{{ course.remaining_seats }}</span>/{{ course.capacity }}
          </v-card-subtitle>
          <v-card-text>
            <div>{{ course.description || '暂无简介' }}</div>
            <div class="text-caption mt-1" v-if="course.teacher_name">授课教师: {{ course.teacher_name }}</div>
          </v-card-text>
          <v-card-actions>
            <v-btn
              color="primary"
              size="small"
              @click="enrollCourse(course)"
              :disabled="!canEnroll(course)"
              :loading="enrollingId === course.id"
            >
              {{ isSelected(course) ? '已选' : course.remaining_seats === 0 ? '已满' : '选课' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" v-if="filteredCourses.length === 0">
        <v-alert type="info">暂无适合当前年级的课程</v-alert>
      </v-col>
    </v-row>

    <!-- Submit -->
    <v-btn
      v-if="selectedCourses.length > 0"
      color="success"
      size="large"
      @click="submitEnrollment"
      :loading="submitting"
      class="mt-4"
      block
    >
      提交选课 ({{ selectedCourses.length }} 门课程)
    </v-btn>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const studentName = ref('')
const studentGrade = ref('')
const studentClassroom = ref('')
const grades = [
  { title: '三年级', value: 3 },
  { title: '四年级', value: 4 },
  { title: '五年级', value: 5 },
  { title: '六年级', value: 6 },
]

const courses = ref([])
const selectedCourses = ref([])
const enrollingId = ref(null)
const submitting = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const filteredCourses = computed(() => {
  if (!studentGrade.value) return courses.value
  return courses.value.filter(c => {
    const levels = typeof c.grade_levels === 'string' ? JSON.parse(c.grade_levels) : c.grade_levels
    return Array.isArray(levels) && levels.includes(studentGrade.value)
  })
})

const totalMinutes = computed(() => {
  return selectedCourses.value.reduce((sum, c) => sum + (c.duration_minutes || 0), 0)
})

function onGradeChange() {
  // Clear selected courses when grade changes
  selectedCourses.value = []
}

function isSelected(course) {
  return selectedCourses.value.some(c => c.id === course.id)
}

function canEnroll(course) {
  if (isSelected(course)) return false
  if (course.remaining_seats === 0) return false
  if (!studentName.value || !studentGrade.value) return false

  // Check same duration type
  const sameType = selectedCourses.value.find(c => c.duration_type === course.duration_type)
  if (sameType) return false

  // Check total duration
  const courseMinutes = course.duration_minutes || 0
  if (totalMinutes.value + courseMinutes > 90) return false

  return true
}

function enrollCourse(course) {
  if (!canEnroll(course)) {
    // Show specific error
    if (!studentName.value || !studentGrade.value) {
      showMsg('请先填写学生信息', 'warning')
      return
    }
    const sameType = selectedCourses.value.find(c => c.duration_type === course.duration_type)
    if (sameType) {
      showMsg('您不能选择多个同种类型的课程！', 'error')
      return
    }
    const courseMinutes = course.duration_minutes || 0
    if (totalMinutes.value + courseMinutes > 90) {
      showMsg('您不能选择合计超过90分钟的课程！', 'error')
      return
    }
    if (course.remaining_seats === 0) {
      showMsg('该课程已满员，您不能选择！', 'error')
      return
    }
    return
  }

  // Add to selected list (client-side only, will submit later)
  selectedCourses.value.push(course)
  showMsg(`已选择 ${course.name}`, 'success')
}

function removeCourse(course) {
  selectedCourses.value = selectedCourses.value.filter(c => c.id !== course.id)
  showMsg(`已退选 ${course.name}`)
}

async function submitEnrollment() {
  if (!studentName.value || !studentGrade.value || !studentClassroom.value) {
    showMsg('请填写完整的学生信息', 'error')
    return
  }
  if (selectedCourses.value.length === 0) {
    showMsg('请至少选择一门课程', 'warning')
    return
  }

  submitting.value = true
  try {
    for (const course of selectedCourses.value) {
      await api.enroll({
        student_name: studentName.value,
        student_grade: studentGrade.value,
        student_classroom: studentClassroom.value,
        course_id: course.id,
      })
    }
    showMsg(`成功选课 ${selectedCourses.value.length} 门！`, 'success')
    selectedCourses.value = []
    // Refresh course list
    const result = await api.getCourses({ grade_level: studentGrade.value })
    courses.value = result.rows || []
  } catch (e) {
    showMsg(e.response?.data?.error || '选课失败', 'error')
  } finally {
    submitting.value = false
  }
}

function showMsg(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

onMounted(async () => {
  const result = await api.getCourses()
  courses.value = result.rows || []
})
</script>
