<template>
  <v-container>
    <h2 class="text-h5 mb-4">标签管理</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">新增标签</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>名称</th>
          <th>用户数</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tags" :key="t.id">
          <td>{{ t.name }}</td>
          <td>{{ getUserCount(t) }}</td>
          <td>
            <v-btn size="small" color="error" @click="remove(t.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>新增标签</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="标签名称" class="mb-4" />
          <v-textarea
            v-model="form.user_ids"
            label="用户ID（逗号分隔）"
            rows="3"
          />
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

const tags = ref([])
const dialog = ref(false)
const form = ref({ name: '', user_ids: '' })

function getUserCount(tag) {
  const userIds = typeof tag.user_ids === 'string' ? JSON.parse(tag.user_ids) : tag.user_ids
  return userIds ? userIds.length : 0
}

async function save() {
  const userIds = form.value.user_ids.split(',').map(s => parseInt(s.trim())).filter(Boolean)
  await api.createTag({
    name: form.value.name,
    user_ids: JSON.stringify(userIds)
  })
  dialog.value = false
  tags.value = await api.getTags()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteTag(id)
    tags.value = await api.getTags()
  }
}

onMounted(async () => {
  tags.value = await api.getTags()
})
</script>
