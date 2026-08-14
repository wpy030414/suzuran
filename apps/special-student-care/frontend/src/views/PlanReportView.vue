<template>
  <v-container>
    <h2 class="text-h5 mb-4">班级计划上报情况</h2>

    <v-row class="mb-4">
      <v-col cols="4">
        <v-select v-model="filters.grade_id" :items="grades" item-title="grade_name" item-value="id" label="年级" clearable />
      </v-col>
      <v-col cols="4">
        <v-select v-model="filters.period_type" :items="periodOptions" item-title="text" item-value="value" label="周期类型" />
      </v-col>
      <v-col cols="4" v-if="filters.period_type === 'month'">
        <v-text-field v-model="filters.period_month" type="month" label="月份" />
      </v-col>
      <v-col cols="4" v-if="filters.period_type === 'semester'">
        <v-text-field v-model="filters.academic_year" label="学年" />
      </v-col>
    </v-row>

    <v-btn color="primary" @click="loadReport" class="mb-4">查询</v-btn>

    <v-alert type="info" variant="tonal" class="mb-4" v-if="report.summary">
      <strong>上报率：</strong>{{ report.summary.rate }}% ({{ report.summary.reported }}/{{ report.summary.total }})
    </v-alert>

    <v-table density="compact">
      <thead>
        <tr>
          <th>班级</th>
          <th>班主任</th>
          <th>是否上报</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in report.classes" :key="c.class_id">
          <td>{{ c.class_name }}</td>
          <td>{{ c.teacher_name }}</td>
          <td>
            <v-chip :color="c.has_reported ? 'success' : 'error'" size="small">
              {{ c.has_reported ? '已上报' : '未上报' }}
            </v-chip>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const grades = ref([])
const report = ref({ classes: [], summary: null })
const filters = ref({
  grade_id: null,
  period_type: 'month',
  period_month: new Date().toISOString().substring(0, 7),
  academic_year: ''
})

const periodOptions = [
  { text: '月', value: 'month' },
  { text: '学期', value: 'semester' }
]

async function loadReport() {
  report.value = await api.getPlanReport(filters.value)
}

onMounted(async () => {
  grades.value = await api.getGrades()
  await loadReport()
})
</script>
