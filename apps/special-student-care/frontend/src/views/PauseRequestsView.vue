<template>
  <v-container>
    <h2 class="text-h5 mb-4">暂缓关爱审批</h2>
    <v-table density="compact">
      <thead>
        <tr>
          <th>学生</th>
          <th>发起人</th>
          <th>理由</th>
          <th>审批人</th>
          <th>状态</th>
          <th>时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in requests" :key="r.id">
          <td>{{ r.student_name }}</td>
          <td>{{ r.initiator_name }}</td>
          <td>{{ r.reason?.substring(0, 30) }}{{ r.reason?.length > 30 ? '...' : '' }}</td>
          <td>{{ r.grade_director_name }}</td>
          <td>
            <v-chip :color="statusColor(r.status)" size="small">{{ statusText(r.status) }}</v-chip>
          </td>
          <td>{{ formatDate(r.created_at) }}</td>
          <td>
            <template v-if="r.status === 'pending' && isApprover(r)">
              <v-btn size="small" color="success" @click="approve(r.id, 'approve')" class="mr-1">同意</v-btn>
              <v-btn size="small" color="error" @click="approve(r.id, 'reject')">拒绝</v-btn>
            </template>
            <span v-else class="text-grey">-</span>
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
  return { pending: 'warning', approved: 'success', rejected: 'error' }[s] || 'grey'
}
function statusText(s) {
  return { pending: '待审批', approved: '已通过', rejected: '已拒绝' }[s] || s
}
function formatDate(d) {
  return d ? new Date(d).toLocaleString('zh-CN') : ''
}
function isApprover(r) {
  const userId = parseInt(localStorage.getItem('user_id') || '0')
  return r.grade_director_id === userId
}

async function approve(id, action) {
  if (!confirm(`确定${action === 'approve' ? '同意' : '拒绝'}该暂缓申请？`)) return
  await api.approvePauseRequest(id, action)
  requests.value = await api.getPauseRequests()
}

onMounted(async () => {
  requests.value = await api.getPauseRequests()
})
</script>
