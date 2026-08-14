<template>
  <v-container>
    <h2 class="text-h5 mb-4">缺勤记录管理</h2>

    <v-btn color="primary" @click="openDialog" class="mb-4">新增缺勤记录</v-btn>

    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-select v-model="filterType" :items="['all', 'sick', 'personal', 'unexcused']" item-title="text" item-value="value" label="缺勤类型" clearable density="compact" @update:model-value="loadData" />
      </v-col>
    </v-row>

    <v-table density="compact">
      <thead>
        <tr>
          <th>学生</th>
          <th>年级班级</th>
          <th>校区</th>
          <th>缺勤日期</th>
          <th>类型</th>
          <th>原因</th>
          <th>自动生成</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in records" :key="a.id">
          <td>{{ a.student_name || `学生#${a.student_id}` }}</td>
          <td>{{ a.grade }} {{ a.class_name }}</td>
          <td>{{ a.campus_name || `校区#${a.campus_id}` }}</td>
          <td>{{ a.absent_date }}</td>
          <td>
            <v-chip :color="typeColor(a.absence_type)" size="small">
              {{ typeText(a.absence_type) }}
            </v-chip>
          </td>
          <td>{{ a.reason }}</td>
          <td>
            <v-chip v-if="a.auto_generated" color="warning" size="small">自动</v-chip>
            <span v-else>-</span>
          </td>
          <td>
            <v-chip :color="statusColor(a.status)" size="small">
              {{ statusText(a.status) }}
            </v-chip>
          </td>
          <td>
            <v-btn size="small" color="error" @click="remove(a.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-alert v-if="records.length === 0" type="info" class="mt-4">暂无缺勤记录</v-alert>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>新增缺勤记录</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.student_id" type="number" label="学生ID" />
          <v-text-field v-model="form.student_name" label="学生姓名" />
          <v-text-field v-model="form.grade" label="年级" />
          <v-text-field v-model="form.class_name" label="班级" />
          <v-text-field v-model="form.campus_name" label="校区名称" />
          <v-text-field v-model="form.absent_date" type="date" label="缺勤日期" />
          <v-select v-model="form.absence_type" :items="['sick', 'personal', 'unexcused']" label="缺勤类型" />
          <v-textarea v-model="form.reason" label="缺勤原因" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const records = ref([])
const dialog = ref(false)
const filterType = ref('all')
const form = ref({
  student_id: '',
  student_name: '',
  grade: '',
  class_name: '',
  campus_name: '',
  absent_date: '',
  absence_type: 'personal',
  reason: ''
})

function typeColor(t) {
  return { sick: 'error', personal: 'warning', unexcused: 'grey' }[t] || 'grey'
}

function typeText(t) {
  return { sick: '病假', personal: '事假', unexcused: '未请假' }[t] || t
}

function statusColor(s) {
  return { pending: 'warning', approved: 'success', rejected: 'error' }[s] || 'grey'
}

function statusText(s) {
  return { pending: '待确认', approved: '已确认', rejected: '已拒绝' }[s] || s
}

function openDialog() {
  form.value = {
    student_id: '',
    student_name: '',
    grade: '',
    class_name: '',
    campus_name: '',
    absent_date: new Date().toISOString().split('T')[0],
    absence_type: 'personal',
    reason: ''
  }
  dialog.value = true
}

async function loadData() {
  const params = {}
  if (filterType.value && filterType.value !== 'all') {
    params.absence_type = filterType.value
  }
  records.value = await api.getAbsentRecords(params)
}

async function save() {
  await api.createAbsentRecord({
    student_id: parseInt(form.value.student_id),
    student_name: form.value.student_name,
    grade: form.value.grade,
    class_name: form.value.class_name,
    campus_name: form.value.campus_name,
    absent_date: form.value.absent_date,
    absence_type: form.value.absence_type,
    reason: form.value.reason,
    status: 'pending'
  })
  dialog.value = false
  await loadData()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteAbsentRecord(id)
    await loadData()
  }
}

onMounted(loadData)
</script>
