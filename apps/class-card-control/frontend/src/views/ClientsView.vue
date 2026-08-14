<template>
  <v-container>
    <h2 class="text-h5 mb-4">终端管理</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">添加终端</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>名称</th>
          <th>设备ID</th>
          <th>教室ID</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in clients" :key="c.id">
          <td>{{ c.name }}</td>
          <td>{{ c.device_id }}</td>
          <td>{{ c.classroom_id }}</td>
          <td>
            <v-chip :color="c.status === 'online' ? 'success' : 'grey'" size="small">
              {{ c.status === 'online' ? '在线' : '离线' }}
            </v-chip>
          </td>
          <td>
            <v-btn size="small" color="error" @click="remove(c.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>添加终端</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="名称" />
          <v-text-field v-model="form.device_id" label="设备ID" />
          <v-text-field v-model="form.classroom_id" type="number" label="教室ID" />
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

const clients = ref([])
const dialog = ref(false)
const form = ref({ name: '', device_id: '', classroom_id: '' })

async function save() {
  await api.createClient({
    name: form.value.name,
    device_id: form.value.device_id,
    classroom_id: parseInt(form.value.classroom_id),
    status: 'online'
  })
  dialog.value = false
  clients.value = await api.getClients()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteClient(id)
    clients.value = await api.getClients()
  }
}

onMounted(async () => {
  clients.value = await api.getClients()
})
</script>
