<template>
  <v-container>
    <h2 class="text-h5 mb-4">假期余额</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">设置余额</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>用户ID</th>
          <th>假期类型</th>
          <th>年份</th>
          <th>总天数</th>
          <th>已用天数</th>
          <th>剩余天数</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="b in balances" :key="b.id">
          <td>{{ b.user_id }}</td>
          <td>{{ leaveTypes.find(t => t.id === b.leave_type_id)?.name || b.leave_type_id }}</td>
          <td>{{ b.year }}</td>
          <td>{{ b.total_days }}</td>
          <td>{{ b.used_days }}</td>
          <td>{{ (parseFloat(b.total_days) - parseFloat(b.used_days)).toFixed(1) }}</td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>设置假期余额</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.user_id" type="number" label="用户ID" />
          <v-select v-model="form.leave_type_id" :items="leaveTypes" item-title="name" item-value="id" label="假期类型" />
          <v-text-field v-model="form.year" type="number" label="年份" />
          <v-text-field v-model="form.total_days" type="number" label="总天数" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const balances = ref([])
const leaveTypes = ref([])
const dialog = ref(false)
const form = ref({ user_id: '', leave_type_id: null, year: new Date().getFullYear(), total_days: 0 })

async function save() {
  await api.createLeaveBalance({
    user_id: parseInt(form.value.user_id),
    leave_type_id: parseInt(form.value.leave_type_id),
    year: parseInt(form.value.year),
    total_days: parseFloat(form.value.total_days),
    used_days: 0
  })
  dialog.value = false
  balances.value = await api.getLeaveBalances()
}

onMounted(async () => {
  balances.value = await api.getLeaveBalances()
  leaveTypes.value = await api.getLeaveTypes()
})
</script>
