<template>
  <v-container>
    <h2 class="text-h5 mb-4">我的请假</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">申请请假</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>请假类型</th>
          <th>开始日期</th>
          <th>结束日期</th>
          <th>原因</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in requests" :key="r.id">
          <td>{{ leaveTypes.find(t => t.id === r.leave_type_id)?.name || r.leave_type_id }}</td>
          <td>{{ r.start_date }}</td>
          <td>{{ r.end_date }}</td>
          <td>{{ r.reason }}</td>
          <td>
            <v-chip :color="statusColor(r.status)" size="small">{{ statusText(r.status) }}</v-chip>
          </td>
          <td>
            <v-btn v-if="r.status === 'pending'" size="small" color="error" @click="remove(r.id)">撤销</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>申请请假</v-card-title>
        <v-card-text>
          <v-select v-model="form.leave_type_id" :items="leaveTypes" item-title="name" item-value="id" label="请假类型" />
          <v-text-field v-model="form.start_date" type="date" label="开始日期" />
          <v-text-field v-model="form.end_date" type="date" label="结束日期" />
          <v-textarea v-model="form.reason" label="请假原因" rows="3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="submit">提交</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const requests = ref([])
const leaveTypes = ref([])
const dialog = ref(false)
const form = ref({ leave_type_id: null, start_date: '', end_date: '', reason: '' })

function statusColor(s) {
  return { pending: 'warning', approved: 'success', rejected: 'error' }[s] || 'grey'
}

function statusText(s) {
  return { pending: '待审批', approved: '已批准', rejected: '已拒绝' }[s] || s
}

async function submit() {
  await api.createLeaveRequest({
    user_id: 1, // TODO: get from auth context
    leave_type_id: parseInt(form.value.leave_type_id),
    start_date: form.value.start_date,
    end_date: form.value.end_date,
    reason: form.value.reason
  })
  dialog.value = false
  requests.value = await api.getLeaveRequests()
}

async function remove(id) {
  if (confirm('确定撤销？')) {
    await api.deleteLeaveRequest(id)
    requests.value = await api.getLeaveRequests()
  }
}

onMounted(async () => {
  requests.value = await api.getLeaveRequests()
  leaveTypes.value = await api.getLeaveTypes()
})
</script>
