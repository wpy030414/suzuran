<template>
  <v-container>
    <h2 class="text-h5 mb-4">测试结果</h2>

    <v-table density="compact">
      <thead>
        <tr>
          <th>测试ID</th>
          <th>总分</th>
          <th>结果等级</th>
          <th>建议</th>
          <th>完成时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in results" :key="r.id">
          <td>{{ r.session_id }}</td>
          <td>{{ r.total_score }}</td>
          <td>
            <v-chip :color="levelColor(r.result_level)" size="small">
              {{ resultLevelText(r.result_level) }}
            </v-chip>
          </td>
          <td>{{ r.recommendations }}</td>
          <td>{{ r.completed_at }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const results = ref([])

function levelColor(level) {
  return { normal: 'success', medium: 'warning', high: 'error' }[level] || 'grey'
}

function resultLevelText(level) {
  return { normal: '正常', medium: '中等', high: '较高' }[level] || level
}

onMounted(async () => {
  results.value = await api.getResults()
})
</script>
