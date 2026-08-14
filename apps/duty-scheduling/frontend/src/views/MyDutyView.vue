<template>
  <v-container>
    <h2 class="text-h5 mb-4">我的值班</h2>

    <v-table density="compact">
      <thead>
        <tr>
          <th>日期</th>
          <th>班次</th>
          <th>地点</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in snapshots" :key="s.id">
          <td>{{ s.date }}</td>
          <td>{{ shifts.find(sh => sh.id === s.shift_id)?.name || s.shift_id }}</td>
          <td>{{ locations.find(l => l.id === s.location_id)?.name || s.location_id }}</td>
          <td>
            <v-chip :color="statusColor(s.status)" size="small">{{ statusText(s.status) }}</v-chip>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const snapshots = ref([])
const shifts = ref([])
const locations = ref([])

function statusColor(s) {
  return { scheduled: 'info', completed: 'success', missed: 'error' }[s] || 'grey'
}

function statusText(s) {
  return { scheduled: '已安排', completed: '已完成', missed: '缺勤' }[s] || s
}

onMounted(async () => {
  snapshots.value = await api.getSnapshots()
  shifts.value = await api.getShifts()
  locations.value = await api.getLocations()
})
</script>
