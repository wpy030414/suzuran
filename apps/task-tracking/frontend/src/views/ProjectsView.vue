<template>
  <v-container>
    <h2 class="text-h5 mb-4">项目管理</h2>
    <v-btn color="primary" @click="openDialog()" class="mb-4">
      <v-icon start>mdi-plus</v-icon>新建项目
    </v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>名称</th>
          <th>学校</th>
          <th>标签</th>
          <th>描述</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in projects" :key="p.id">
          <td>{{ p.name }}</td>
          <td>{{ getSchoolName(p.school_id) }}</td>
          <td>{{ getTagName(p.tag_id) }}</td>
          <td>{{ p.description || '-' }}</td>
          <td>
            <v-btn size="small" variant="text" @click="openDialog(p)">编辑</v-btn>
            <v-btn size="small" color="error" variant="text" @click="remove(p.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>{{ editingId ? '编辑项目' : '新建项目' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="项目名称 *" />
          <v-select v-model="form.school_id" :items="schools" item-title="name" item-value="id" label="学校 *" />
          <v-select v-model="form.tag_id" :items="tags" item-title="name" item-value="id" label="任务标签 *" />
          <v-textarea v-model="form.description" label="描述" rows="2" />
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

const projects = ref([])
const schools = ref([])
const tags = ref([])
const dialog = ref(false)
const editingId = ref(null)
const form = ref({ name: '', school_id: null, tag_id: null, description: '' })

function getSchoolName(id) {
  const s = schools.value.find(s => s.id === id)
  return s ? s.name : `#${id}`
}

function getTagName(id) {
  const t = tags.value.find(t => t.id === id)
  return t ? t.name : `#${id}`
}

function openDialog(project = null) {
  if (project) {
    editingId.value = project.id
    form.value = { name: project.name, school_id: project.school_id, tag_id: project.tag_id, description: project.description || '' }
  } else {
    editingId.value = null
    form.value = { name: '', school_id: null, tag_id: null, description: '' }
  }
  dialog.value = true
}

async function save() {
  if (!form.value.name || !form.value.school_id || !form.value.tag_id) return
  if (editingId.value) {
    await api.updateProject(editingId.value, form.value)
  } else {
    await api.createProject(form.value)
  }
  dialog.value = false
  projects.value = await api.getProjects()
}

async function remove(id) {
  if (confirm('确定删除该项目？')) {
    await api.deleteProject(id)
    projects.value = await api.getProjects()
  }
}

onMounted(async () => {
  const [p, s, t] = await Promise.all([api.getProjects(), api.getSchools(), api.getTags()])
  projects.value = p
  schools.value = s
  tags.value = t
})
</script>
