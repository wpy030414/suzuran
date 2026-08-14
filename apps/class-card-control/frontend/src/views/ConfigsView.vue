<template>
  <v-container>
    <h2 class="text-h5 mb-4">配置管理</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">新建配置</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>终端ID</th>
          <th>亮度</th>
          <th>音量</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in configs" :key="c.id">
          <td>{{ c.client_id }}</td>
          <td>{{ c.brightness }}%</td>
          <td>{{ c.volume }}%</td>
          <td>
            <v-btn size="small" color="error" @click="remove(c.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>新建配置</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.client_id" type="number" label="终端ID" />
          <v-slider v-model="form.brightness" :min="0" :max="100" label="亮度" />
          <v-slider v-model="form.volume" :min="0" :max="100" label="音量" />
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

const configs = ref([])
const dialog = ref(false)
const form = ref({ client_id: '', brightness: 100, volume: 50 })

async function save() {
  await api.createConfig({
    client_id: parseInt(form.value.client_id),
    brightness: form.value.brightness,
    volume: form.value.volume
  })
  dialog.value = false
  configs.value = await api.getConfigs()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteConfig(id)
    configs.value = await api.getConfigs()
  }
}

onMounted(async () => {
  configs.value = await api.getConfigs()
})
</script>
