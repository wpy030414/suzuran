<template>
  <v-container>
    <h2 class="text-h5 mb-4">点名模式</h2>

    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-text-field v-model="form.check_date" type="date" label="检查日期" />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-model="form.check_type" :items="['morning', 'afternoon']" label="检查类型" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="form.campus_name" label="校区名称" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="form.grade" label="年级" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="form.class_name" label="班级" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="form.reporter_name" label="报告人" />
      </v-col>
    </v-row>

    <v-card class="mb-4">
      <v-card-title>学生列表</v-card-title>
      <v-card-text>
        <v-btn color="primary" @click="addStudent" class="mb-2">添加学生</v-btn>
        <v-table density="compact">
          <thead>
            <tr>
              <th>学生ID</th>
              <th>学生姓名</th>
              <th>状态</th>
              <th>体温</th>
              <th>异常详情</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, idx) in form.students" :key="idx">
              <td>
                <v-text-field v-model="s.student_id" type="number" density="compact" hide-details />
              </td>
              <td>
                <v-text-field v-model="s.student_name" density="compact" hide-details />
              </td>
              <td>
                <v-select v-model="s.status" :items="['present', 'absent', 'abnormal']" density="compact" hide-details />
              </td>
              <td>
                <v-text-field v-model="s.temperature" type="number" step="0.1" density="compact" hide-details />
              </td>
              <td>
                <v-text-field v-model="s.abnormal_details" density="compact" hide-details :disabled="s.status !== 'abnormal'" />
              </td>
              <td>
                <v-btn size="small" color="error" @click="removeStudent(idx)">删除</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <v-btn color="primary" size="large" @click="submit" :loading="loading">提交点名</v-btn>

    <v-alert v-if="result" type="success" class="mt-4">
      成功提交 {{ result.count }} 条记录
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import api from '../api.js'

const form = ref({
  check_date: new Date().toISOString().split('T')[0],
  check_type: 'morning',
  campus_name: '',
  grade: '',
  class_name: '',
  reporter_name: '',
  students: []
})

const loading = ref(false)
const result = ref(null)

function addStudent() {
  form.value.students.push({
    student_id: '',
    student_name: '',
    status: 'present',
    temperature: '',
    abnormal_details: ''
  })
}

function removeStudent(idx) {
  form.value.students.splice(idx, 1)
}

async function submit() {
  if (!form.value.check_date) {
    alert('请选择检查日期')
    return
  }
  if (form.value.students.length === 0) {
    alert('请至少添加一名学生')
    return
  }

  loading.value = true
  try {
    const data = {
      check_date: form.value.check_date,
      check_type: form.value.check_type,
      campus_name: form.value.campus_name,
      grade: form.value.grade,
      class_name: form.value.class_name,
      reporter_name: form.value.reporter_name,
      students: form.value.students.map(s => ({
        student_id: parseInt(s.student_id),
        student_name: s.student_name,
        status: s.status,
        temperature: s.temperature ? parseFloat(s.temperature) : null,
        abnormal_details: s.abnormal_details
      }))
    }
    result.value = await api.rollCall(data)
    form.value.students = []
  } catch (e) {
    alert('提交失败: ' + e.message)
  } finally {
    loading.value = false
  }
}
</script>
