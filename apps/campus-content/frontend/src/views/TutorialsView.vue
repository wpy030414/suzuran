<template>
  <v-container>
    <h2 class="text-h5 mb-4">教程</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">发布教程</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>标题</th>
          <th>分类</th>
          <th>发布时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in tutorials" :key="t.id">
          <td>{{ t.title }}</td>
          <td>{{ t.category }}</td>
          <td>{{ t.published_at }}</td>
          <td>
            <v-btn size="small" color="error" @click="remove(t.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>发布教程</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.title" label="标题" />
          <v-text-field v-model="form.category" label="分类" />
          <v-textarea v-model="form.content" label="内容" rows="5" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">发布</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const tutorials = ref([])
const dialog = ref(false)
const form = ref({ title: '', category: '', content: '' })

async function save() {
  await api.createTutorial({
    title: form.value.title,
    category: form.value.category,
    content: form.value.content,
    author_id: 1,
    status: 'published',
    published_at: new Date().toISOString()
  })
  dialog.value = false
  tutorials.value = await api.getTutorials()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteTutorial(id)
    tutorials.value = await api.getTutorials()
  }
}

onMounted(async () => {
  tutorials.value = await api.getTutorials()
})
</script>
