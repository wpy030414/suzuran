<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <v-icon size="32" color="primary" class="mr-2">mdi-chart-bar</v-icon>
      <h2 class="text-h5">审查报表</h2>
    </div>

    <v-card class="mb-4">
      <v-card-title>生成审查报表</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model="generateForm.date" type="date" label="日期" density="compact" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="generateForm.meal_type" :items="['早餐', '午餐', '晚餐']" label="餐次" density="compact" />
          </v-col>
          <v-col cols="12" md="4">
            <v-btn color="primary" block @click="generate" :loading="generating" prepend-icon="mdi-auto-fix">
              自动生成
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-title>
        审查记录
        <v-chip size="small" class="ml-2" color="primary">{{ reviews.length }}</v-chip>
      </v-card-title>
      <v-card-text>
        <v-table density="compact" v-if="reviews.length > 0">
          <thead>
            <tr>
              <th>日期</th>
              <th>餐次</th>
              <th>总订餐数</th>
              <th>已用餐</th>
              <th>缺勤</th>
              <th>用餐率</th>
              <th>可视化</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in reviews" :key="r.id">
              <td>{{ r.date }}</td>
              <td>{{ r.meal_type }}</td>
              <td>{{ r.total_ordered }}</td>
              <td class="text-success">{{ r.total_consumed }}</td>
              <td class="text-error">{{ r.total_absent }}</td>
              <td>
                <v-chip :color="getRateColor(calcRate(r))" size="small">
                  {{ calcRate(r) }}%
                </v-chip>
              </td>
              <td style="min-width: 150px;">
                <v-progress-linear
                  :model-value="calcRate(r)"
                  :color="getRateColor(calcRate(r))"
                  rounded
                  height="16"
                >
                  <template v-slot:default>
                    <span class="text-caption text-white">{{ calcRate(r) }}%</span>
                  </template>
                </v-progress-linear>
              </td>
            </tr>
          </tbody>
        </v-table>
        <div v-else class="text-center text-grey py-8">
          <v-icon size="48" class="mb-2">mdi-inbox</v-icon>
          <div>暂无审查记录，请先生成报表</div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import api from '../api.js'

const showSnackbar = inject('showSnackbar', () => {})

const reviews = ref([])
const generating = ref(false)
const generateForm = ref({
  date: new Date().toISOString().split('T')[0],
  meal_type: '午餐'
})

function calcRate(r) {
  if (!r.total_ordered || r.total_ordered === 0) return 0
  return Math.round((r.total_consumed / r.total_ordered) * 100)
}

function getRateColor(rate) {
  if (rate >= 90) return 'success'
  if (rate >= 70) return 'info'
  if (rate >= 50) return 'warning'
  return 'error'
}

async function loadReviews() {
  try {
    reviews.value = await api.getReviews()
  } catch (e) {
    console.error(e)
  }
}

async function generate() {
  generating.value = true
  try {
    await api.generateReview(generateForm.value)
    showSnackbar('报表生成成功', 'success')
    await loadReviews()
  } catch (e) {
    showSnackbar('生成失败: ' + (e.response?.data?.error || e.message), 'error')
  } finally {
    generating.value = false
  }
}

onMounted(loadReviews)
</script>
