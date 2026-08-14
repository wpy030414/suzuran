<template>
  <v-container>
    <h2 class="text-h5 mb-4">分类管理</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">新建分类</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>分类名称</th>
          <th>排序</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in categories" :key="c.id">
          <td>{{ c.name }}</td>
          <td>{{ c.sort_order }}</td>
          <td>
            <v-btn size="small" color="error" @click="remove(c.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>新建分类</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="分类名称" />
          <v-text-field v-model="form.sort_order" type="number" label="排序" />
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

const categories = ref([])
const dialog = ref(false)
const form = ref({ name: '', sort_order: 0 })

async function save() {
  await api.createCategory({
    name: form.value.name,
    sort_order: parseInt(form.value.sort_order)
  })
  dialog.value = false
  categories.value = await api.getCategories()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteCategory(id)
    categories.value = await api.getCategories()
  }
}

onMounted(async () => {
  categories.value = await api.getCategories()
})
</script>
