<template>
  <v-container>
    <h2 class="text-h5 mb-4">计数模式</h2>

    <v-card>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.check_date" type="date" label="检查日期" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="form.check_type" :items="['morning', 'afternoon']" label="检查类型" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.campus_name" label="校区名称" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.grade" label="年级" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.class_name" label="班级" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.reporter_name" label="报告人" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model.number="form.total_count" type="number" label="应到人数" min="0" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model.number="form.present_count" type="number" label="实到人数" min="0" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model.number="form.absent_count" type="number" label="缺勤人数" min="0" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model.number="form.abnormal_count" type="number" label="异常人数" min="0" />
          </v-col>
          <v-col cols="12" md="6">
            <v-textarea v-model="form.notes" label="备注" rows="2" />
          </v-col>
        </v-row>

        <v-btn color="primary" size="large" @click="submit" :loading="loading">提交统计</v-btn>

        <v-alert v-if="result" type="success" class="mt-4">
          成功提交统计记录
        </v-alert>
      </v-card-text>
    </v-card>
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
  total_count: 0,
  present_count: 0,
  absent_count: 0,
  abnormal_count: 0,
  notes: ''
})

const loading = ref(false)
const result = ref(null)

async function submit() {
  if (!form.value.check_date) {
    alert('请选择检查日期')
    return
  }
  if (form.value.total_count < 0) {
    alert('应到人数必须为非负整数')
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
      total_count: parseInt(form.value.total_count),
      present_count: parseInt(form.value.present_count),
      absent_count: parseInt(form.value.absent_count),
      abnormal_count: parseInt(form.value.abnormal_count),
      notes: form.value.notes
    }
    result.value = await api.countMode(data)
    // Reset form
    form.value.total_count = 0
    form.value.present_count = 0
    form.value.absent_count = 0
    form.value.abnormal_count = 0
    form.value.notes = ''
  } catch (e) {
    alert('提交失败: ' + e.message)
  } finally {
    loading.value = false
  }
}
</script>
