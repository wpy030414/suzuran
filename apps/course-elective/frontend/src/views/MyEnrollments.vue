<template>
  <v-container>
    <h2 class="text-h5 mb-4">我的选课</h2>

    <!-- Student info -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model="studentId" type="number" label="学生ID" density="compact" @keyup.enter="load" />
          </v-col>
          <v-col cols="12" md="4">
            <v-btn color="primary" @click="load" class="mr-2">查询</v-btn>
            <v-btn variant="outlined" @click="clear">清空</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Stats -->
    <v-row class="mb-4" v-if="enrollments.length > 0">
      <v-col cols="6" md="3">
        <v-card color="blue-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ enrollments.length }}</div>
            <div class="text-caption">已选课程</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="green-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ totalDuration }}</div>
            <div class="text-caption">总时长(分钟)</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="purple-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ uniqueTypes }}</div>
            <div class="text-caption">课程类型</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="orange-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ 90 - totalDuration }}</div>
            <div class="text-caption">剩余可选(分钟)</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Enrollments table -->
    <v-table density="compact" v-if="enrollments.length > 0">
      <thead>
        <tr>
          <th>课程名称</th>
          <th>类型</th>
          <th>时长</th>
          <th>教师</th>
          <th>选课时间</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in enrichedEnrollments" :key="e.id">
          <td>{{ e.course_name || `课程${e.course_id}` }}</td>
          <td>
            <v-chip size="small" color="info">{{ e.duration_type || '-' }}</v-chip>
          </td>
          <td>{{ e.duration_minutes || '-' }} 分钟</td>
          <td>{{ e.teacher_name || '-' }}</td>
          <td>{{ formatDate(e.enrolled_at) }}</td>
          <td>
            <v-chip :color="e.status === 'active' ? 'success' : 'grey'" size="small">
              {{ statusText(e.status) }}
            </v-chip>
          </td>
          <td>
            <v-btn
              v-if="e.status === 'active'"
              size="small"
              color="error"
              variant="outlined"
              @click="drop(e)"
            >
              退课
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-alert v-if="studentId && enrollments.length === 0" type="info" class="mt-4">
      该学生暂无选课记录
    </v-alert>

    <!-- Validation warning -->
    <v-alert v-if="totalDuration > 90" type="error" class="mt-4">
      警告：您选择的课程总时长已超过90分钟！
    </v-alert>
    <v-alert v-if="hasDuplicateType" type="warning" class="mt-4">
      警告：您选择了多个相同类型的课程！
    </v-alert>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../api.js'

const studentId = ref('')
const enrollments = ref([])
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const enrichedEnrollments = computed(() => {
  return enrollments.value.map(e => ({
    ...e,
    course_name: e.course_name || `课程${e.course_id}`,
    teacher_name: e.teacher_name || '-',
    duration_type: e.duration_type || '-',
    duration_minutes: e.duration_minutes || 0,
  }))
})

const totalDuration = computed(() => {
  return enrollments.value.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
})

const uniqueTypes = computed(() => {
  const types = new Set(enrollments.value.map(e => e.duration_type).filter(Boolean))
  return types.size
})

const hasDuplicateType = computed(() => {
  const typeCount = {}
  for (const e of enrollments.value) {
    if (e.duration_type) {
      typeCount[e.duration_type] = (typeCount[e.duration_type] || 0) + 1
      if (typeCount[e.duration_type] > 1) return true
    }
  }
  return false
})

function statusText(s) {
  return { active: '已选', cancelled: '已取消', dropped: '已退课' }[s] || s
}

function formatDate(d) {
  return d ? new Date(d).toLocaleString('zh-CN') : '-'
}

function showMsg(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

function clear() {
  studentId.value = ''
  enrollments.value = []
}

async function load() {
  if (!studentId.value) {
    showMsg('请输入学生ID', 'error')
    return
  }
  try {
    enrollments.value = await api.getStudentEnrollments(studentId.value)
  } catch (e) {
    showMsg(e.response?.data?.error || '查询失败', 'error')
  }
}

async function drop(e) {
  if (!confirm(`确定退课"${e.course_name || `课程${e.course_id}`}"？`)) return
  try {
    await api.unenroll(e.id)
    showMsg('退课成功')
    await load()
  } catch (err) {
    showMsg(err.response?.data?.error || '退课失败', 'error')
  }
}
</script>
