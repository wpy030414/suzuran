<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">设备管理</h2>
      <v-spacer />
      <v-btn color="primary" to="/devices/new" prepend-icon="mdi-plus">添加设备</v-btn>
    </div>

    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          label="搜索设备"
          prepend-icon="mdi-magnify"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="filterType"
          :items="deviceTypes"
          label="设备类型"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="filterStatus"
          :items="statusOptions"
          label="状态"
          clearable
          hide-details
        />
      </v-col>
    </v-row>

    <v-table density="compact">
      <thead>
        <tr>
          <th>名称</th>
          <th>设备ID</th>
          <th>类型</th>
          <th>位置</th>
          <th>状态</th>
          <th>最后心跳</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in filteredDevices" :key="d.id">
          <td>{{ d.name }}</td>
          <td>{{ d.ezcloud_device_id }}</td>
          <td>
            <v-chip size="small" color="info">{{ deviceTypeLabels[d.device_type] || d.device_type }}</v-chip>
          </td>
          <td>{{ d.location }}</td>
          <td>
            <v-chip :color="d.is_online ? 'success' : 'grey'" size="small">
              <v-icon start>{{ d.is_online ? 'mdi-check-circle' : 'mdi-close-circle' }}</v-icon>
              {{ d.is_online ? '在线' : '离线' }}
            </v-chip>
          </td>
          <td>{{ formatTime(d.last_heartbeat) }}</td>
          <td>
            <v-btn size="small" color="primary" :to="`/devices/${d.id}/edit`" icon="mdi-pencil" />
            <v-btn size="small" color="error" @click="remove(d.id)" icon="mdi-delete" />
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const devices = ref([])
const search = ref('')
const filterType = ref(null)
const filterStatus = ref(null)

const deviceTypes = [
  { title: '门', value: 'door' },
  { title: '闸机', value: 'gate' },
  { title: '道闸', value: 'barrier' }
]

const statusOptions = [
  { title: '在线', value: 'online' },
  { title: '离线', value: 'offline' }
]

const deviceTypeLabels = {
  door: '门',
  gate: '闸机',
  barrier: '道闸'
}

const filteredDevices = computed(() => {
  return devices.value.filter(d => {
    if (search.value && !d.name.includes(search.value) && !d.ezcloud_device_id.includes(search.value)) {
      return false
    }
    if (filterType.value && d.device_type !== filterType.value) return false
    if (filterStatus.value) {
      if (filterStatus.value === 'online' && !d.is_online) return false
      if (filterStatus.value === 'offline' && d.is_online) return false
    }
    return true
  })
})

function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}

async function remove(id) {
  if (confirm('确定删除此设备？')) {
    await api.deleteDevice(id)
    devices.value = await api.getDevices()
  }
}

onMounted(async () => {
  devices.value = await api.getDevices()
})
</script>
