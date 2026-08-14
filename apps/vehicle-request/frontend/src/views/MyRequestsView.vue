<template>
  <v-container>
    <h2 class="text-h5 mb-4">我的申请</h2>
    <v-btn color="primary" @click="$router.push('/apply')" class="mb-4">申请用车</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>目的地</th>
          <th>用途</th>
          <th>出发时间</th>
          <th>返回时间</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in requests" :key="r.id">
          <td>{{ r.destination }}</td>
          <td>{{ r.purpose }}</td>
          <td>{{ r.departure_time }}</td>
          <td>{{ r.return_time }}</td>
          <td>
            <v-chip :color="statusColor(r.status)" size="small">{{ statusText(r.status) }}</v-chip>
          </td>
          <td>
            <v-btn v-if="r.status === 'pending'" size="small" color="error" @click="remove(r.id)">撤销</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const requests = ref([])

function statusColor(s) {
  return { pending: 'warning', approved: 'success', rejected: 'error', completed: 'info' }[s] || 'grey'
}

function statusText(s) {
  return { pending: '待审批', approved: '已批准', rejected: '已拒绝', completed: '已完成' }[s] || s
}

async function remove(id) {
  if (confirm('确定撤销？')) {
    await api.deleteRequest(id)
    requests.value = await api.getRequests()
  }
}

onMounted(async () => {
  requests.value = await api.getRequests()
})
</script>
