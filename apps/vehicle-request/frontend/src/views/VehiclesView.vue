<template>
  <v-container>
    <h2 class="text-h5 mb-4">车辆管理</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">添加车辆</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>车牌号</th>
          <th>车型</th>
          <th>司机ID</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="v in vehicles" :key="v.id">
          <td>{{ v.plate_number }}</td>
          <td>{{ v.model }}</td>
          <td>{{ v.driver_id }}</td>
          <td>
            <v-chip :color="v.status === 'available' ? 'success' : 'grey'" size="small">
              {{ v.status === 'available' ? '可用' : '使用中' }}
            </v-chip>
          </td>
          <td>
            <v-btn size="small" color="error" @click="remove(v.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>添加车辆</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.plate_number" label="车牌号" />
          <v-text-field v-model="form.model" label="车型" />
          <v-text-field v-model="form.driver_id" type="number" label="司机ID" />
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

const vehicles = ref([])
const dialog = ref(false)
const form = ref({ plate_number: '', model: '', driver_id: '' })

async function save() {
  await api.createVehicle({
    plate_number: form.value.plate_number,
    model: form.value.model,
    driver_id: parseInt(form.value.driver_id),
    status: 'available'
  })
  dialog.value = false
  vehicles.value = await api.getVehicles()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteVehicle(id)
    vehicles.value = await api.getVehicles()
  }
}

onMounted(async () => {
  vehicles.value = await api.getVehicles()
})
</script>
