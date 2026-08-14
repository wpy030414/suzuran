<template>
  <v-container>
    <h2 class="text-h5 mb-4">教师管理</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">添加教师</v-btn>
    <v-table density="compact">
      <thead><tr><th>用户ID</th><th>考核组织ID</th><th>职位</th><th>职称</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="t in teachers" :key="t.id">
          <td>{{ t.user_id }}</td>
          <td>{{ t.assessment_org_id }}</td>
          <td>{{ t.position }}</td>
          <td>{{ t.title }}</td>
          <td>
            <v-btn size="small" color="error" @click="remove(t.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>添加教师</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.user_id" type="number" label="用户ID" />
          <v-text-field v-model="form.assessment_org_id" type="number" label="考核组织ID" />
          <v-text-field v-model="form.position" label="职位" />
          <v-text-field v-model="form.title" label="职称" />
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

const teachers = ref([])
const dialog = ref(false)
const form = ref({ user_id: '', assessment_org_id: '', position: '', title: '' })

async function save() {
  await api.createTeacher({
    user_id: parseInt(form.value.user_id),
    assessment_org_id: parseInt(form.value.assessment_org_id),
    position: form.value.position,
    title: form.value.title,
  })
  dialog.value = false
  teachers.value = await api.getTeachers()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteTeacher(id)
    teachers.value = await api.getTeachers()
  }
}

onMounted(async () => { teachers.value = await api.getTeachers() })
</script>
