<template>
  <v-container>
    <h2 class="text-h5 mb-4">报表页面</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">注册页面</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>应用名称</th>
          <th>描述</th>
          <th>报表URL</th>
          <th>权重</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in pages" :key="p.id">
          <td>{{ p.app_name }}</td>
          <td>{{ p.description }}</td>
          <td>
            <a :href="p.report_url" target="_blank">{{ p.report_url }}</a>
          </td>
          <td>{{ p.weight }}</td>
          <td>
            <v-btn size="small" color="error" @click="remove(p.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>注册报表页面</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.app_name" label="应用名称" />
          <v-textarea v-model="form.description" label="描述" rows="2" />
          <v-text-field v-model="form.report_url" label="报表URL" />
          <v-text-field v-model="form.icon_url" label="图标URL（可选）" />
          <v-text-field v-model="form.weight" type="number" label="权重" />
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

const pages = ref([])
const dialog = ref(false)
const form = ref({ app_name: '', description: '', report_url: '', icon_url: '', weight: 0 })

async function save() {
  await api.createPage({
    app_name: form.value.app_name,
    description: form.value.description,
    report_url: form.value.report_url,
    icon_url: form.value.icon_url,
    weight: parseInt(form.value.weight),
    registered_by: 1
  })
  dialog.value = false
  pages.value = await api.getPages()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deletePage(id)
    pages.value = await api.getPages()
  }
}

onMounted(async () => {
  pages.value = await api.getPages()
})
</script>
