<template>
  <v-container>
    <h2 class="text-h5 mb-4">请假类型</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">新增类型</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>名称</th>
          <th>描述</th>
          <th>最大天数</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in types" :key="t.id">
          <td>{{ t.name }}</td>
          <td>{{ t.description }}</td>
          <td>{{ t.max_days }}</td>
          <td>
            <v-btn size="small" color="error" @click="remove(t.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>新增请假类型</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="名称" />
          <v-textarea v-model="form.description" label="描述" rows="2" />
          <v-text-field v-model="form.max_days" type="number" label="最大天数" />
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

const types = ref([])
const dialog = ref(false)
const form = ref({ name: '', description: '', max_days: 0 })

async function save() {
  await api.createLeaveType({
    name: form.value.name,
    description: form.value.description,
    max_days: parseInt(form.value.max_days)
  })
  dialog.value = false
  types.value = await api.getLeaveTypes()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteLeaveType(id)
    types.value = await api.getLeaveTypes()
  }
}

onMounted(async () => { types.value = await api.getLeaveTypes() })
</script>
