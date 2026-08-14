<template>
  <v-container>
    <h2 class="text-h5 mb-4">换班申请</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">申请换班</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>原值班ID</th>
          <th>替代人ID</th>
          <th>类型</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in substitutions" :key="s.id">
          <td>{{ s.original_snapshot_id }}</td>
          <td>{{ s.substitute_user_id }}</td>
          <td>{{ s.type }}</td>
          <td>
            <v-chip :color="statusColor(s.status)" size="small">{{ statusText(s.status) }}</v-chip>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>申请换班</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.original_snapshot_id" type="number" label="原值班ID" />
          <v-text-field v-model="form.substitute_user_id" type="number" label="替代人ID" />
          <v-select v-model="form.type" :items="['swap', 'proxy']" label="类型" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">提交</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const substitutions = ref([])
const dialog = ref(false)
const form = ref({ original_snapshot_id: '', substitute_user_id: '', type: 'swap' })

function statusColor(s) {
  return { pending: 'warning', approved: 'success', rejected: 'error' }[s] || 'grey'
}

function statusText(s) {
  return { pending: '待审批', approved: '已批准', rejected: '已拒绝' }[s] || s
}

async function save() {
  await api.createSubstitution({
    original_snapshot_id: parseInt(form.value.original_snapshot_id),
    substitute_user_id: parseInt(form.value.substitute_user_id),
    type: form.value.type,
    status: 'pending'
  })
  dialog.value = false
  substitutions.value = await api.getSubstitutions()
}

onMounted(async () => {
  substitutions.value = await api.getSubstitutions()
})
</script>
