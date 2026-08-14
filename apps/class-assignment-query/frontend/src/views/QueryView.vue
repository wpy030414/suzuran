<template>
  <v-container>
    <h2 class="text-h5 mb-4">分班查询</h2>

    <v-card class="mb-4">
      <v-card-text>
        <v-select
          v-model="queryForm.batch_id"
          :items="batches"
          item-title="display"
          item-value="id"
          label="选择分班批次"
          class="mb-4"
        />
        <v-text-field v-model="queryForm.student_name" label="学生姓名" class="mb-4" />
        <v-text-field v-model="queryForm.id_number" label="身份证号" class="mb-4" />
        <v-btn color="primary" @click="query" :loading="loading">查询</v-btn>
      </v-card-text>
    </v-card>

    <v-alert v-if="queryResult" type="success" class="mb-4">
      <p class="text-h6">查询结果</p>
      <p>学生姓名：{{ queryResult.student_name }}</p>
      <p>分班结果：{{ queryResult.classroom_name }}</p>
    </v-alert>

    <v-alert v-if="queryError" type="error">
      {{ queryError }}
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const batches = ref([])
const queryForm = ref({ batch_id: null, student_name: '', id_number: '' })
const queryResult = ref(null)
const queryError = ref(null)
const loading = ref(false)

async function query() {
  loading.value = true
  queryResult.value = null
  queryError.value = null
  try {
    queryResult.value = await api.queryAssignment(queryForm.value)
  } catch (e) {
    queryError.value = e.response?.data?.error || '查询失败'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const batchList = await api.getBatches()
  batches.value = batchList.map(b => ({
    id: b.id,
    display: `${b.academic_year} ${b.grade_level} (${b.release_date})`
  }))
})
</script>
