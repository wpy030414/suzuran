<template>
  <v-container>
    <h2 class="text-h5 mb-4">健康检查记录</h2>

    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-text-field v-model="filterDate" type="date" label="选择日期" density="compact" @change="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-model="filterCampus" :items="campuses" item-title="text" item-value="value" label="校区" clearable density="compact" @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="filterGrade" label="年级" clearable density="compact" @keyup.enter="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="filterClass" label="班级" clearable density="compact" @keyup.enter="loadData" />
      </v-col>
    </v-row>

    <v-table density="compact">
      <thead>
        <tr>
          <th>学生</th>
          <th>年级班级</th>
          <th>校区</th>
          <th>日期</th>
          <th>类型</th>
          <th>体温</th>
          <th>状态</th>
          <th>异常详情</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in checks" :key="c.id">
          <td>{{ c.student_name || `学生#${c.student_id}` }}</td>
          <td>{{ c.grade }} {{ c.class_name }}</td>
          <td>{{ c.campus_name || `校区#${c.campus_id}` }}</td>
          <td>{{ c.check_date }}</td>
          <td>
            <v-chip :color="c.check_type === 'morning' ? 'primary' : 'secondary'" size="small">
              {{ c.check_type === 'morning' ? '晨检' : '午检' }}
            </v-chip>
          </td>
          <td>{{ c.temperature ? c.temperature + '°C' : '-' }}</td>
          <td>
            <v-chip :color="statusColor(c.status)" size="small">
              {{ statusText(c.status) }}
            </v-chip>
          </td>
          <td>{{ c.abnormal_details || '-' }}</td>
          <td>
            <v-btn size="small" color="error" @click="remove(c.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-alert v-if="checks.length === 0" type="info" class="mt-4">暂无检查记录</v-alert>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const checks = ref([])
const filterDate = ref(new Date().toISOString().split('T')[0])
const filterCampus = ref(null)
const filterGrade = ref('')
const filterClass = ref('')
const campuses = ref([])

function statusColor(s) {
  if (s === 'normal' || s === 'present') return 'success'
  if (s === 'absent') return 'warning'
  if (s === 'abnormal') return 'error'
  return 'grey'
}

function statusText(s) {
  const map = { normal: '正常', present: '出勤', absent: '缺勤', abnormal: '异常', count_summary: '汇总' }
  return map[s] || s
}

async function loadData() {
  const params = {}
  if (filterDate.value) params.check_date = filterDate.value
  if (filterCampus.value) params.campus_id = filterCampus.value
  if (filterGrade.value) params.grade = filterGrade.value
  if (filterClass.value) params.class_name = filterClass.value
  checks.value = await api.getHealthChecks(params)
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteHealthCheck(id)
    await loadData()
  }
}

onMounted(async () => {
  await loadData()
})
</script>
