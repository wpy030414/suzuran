<template>
  <v-container>
    <h2 class="text-h5 mb-4">模板管理</h2>

    <v-card>
      <v-card-title>
        评价模板列表
        <v-spacer />
        <v-btn color="primary" @click="dialog = true" prepend-icon="mdi-plus">添加模板</v-btn>
      </v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>标题</th>
              <th>图片预览</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in templates" :key="t.id">
              <td>{{ t.title }}</td>
              <td>
                <v-img :src="t.image_url" width="100" height="60" cover />
              </td>
              <td>
                <v-btn size="small" color="error" @click="removeTemplate(t.id)">删除</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- Add Template Dialog -->
    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>添加模板</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.title" label="标题 (命名规范: {科目}评价-{段别})" placeholder="语文评价-低段" />
          <v-text-field v-model="form.image_url" label="图片 URL" />
          <v-alert type="info" class="mt-2">
            <div class="text-caption">
              <strong>命名规范:</strong><br>
              低段: 语文评价-低段、数学评价-低段...<br>
              中高段: 语文评价-中高段、数学评价-中高段...信息科技评价-中高段
            </div>
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveTemplate">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const templates = ref([])
const dialog = ref(false)
const form = ref({ title: '', image_url: '' })

async function loadTemplates() {
  templates.value = await api.getTemplates()
}

async function saveTemplate() {
  await api.createTemplate(form.value)
  dialog.value = false
  form.value = { title: '', image_url: '' }
  await loadTemplates()
}

async function removeTemplate(id) {
  if (confirm('确定删除？')) {
    await api.deleteTemplate(id)
    await loadTemplates()
  }
}

onMounted(loadTemplates)
</script>
