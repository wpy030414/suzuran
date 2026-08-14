<template>
  <v-container>
    <h2 class="text-h5 mb-4">使用统计</h2>

    <v-row>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>总申请数</v-card-title>
          <v-card-text class="text-h3">{{ stats.total }}</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>已批准</v-card-title>
          <v-card-text class="text-h3 text-success">{{ stats.approved }}</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>待审批</v-card-title>
          <v-card-text class="text-h3 text-warning">{{ stats.pending }}</v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-6">
      <v-card-title>使用记录</v-card-title>
      <v-table density="compact">
        <thead>
          <tr>
            <th>申请ID</th>
            <th>实际出发</th>
            <th>实际返回</th>
            <th>里程数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td>{{ log.request_id }}</td>
            <td>{{ log.actual_departure }}</td>
            <td>{{ log.actual_return }}</td>
            <td>{{ log.mileage }} km</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const stats = ref({ total: 0, approved: 0, pending: 0 })
const logs = ref([])

onMounted(async () => {
  const requests = await api.getRequests()
  stats.value.total = requests.length
  stats.value.approved = requests.filter(r => r.status === 'approved').length
  stats.value.pending = requests.filter(r => r.status === 'pending').length
  logs.value = await api.getUsageLogs()
})
</script>
