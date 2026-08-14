<template>
  <v-container>
    <h2 class="text-h5 mb-4">学校管理</h2>
    <v-btn color="primary" @click="openDialog()" class="mb-4">
      <v-icon start>mdi-plus</v-icon>新建学校
    </v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>名称</th>
          <th>别名</th>
          <th>地址</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="school in schools" :key="school.id">
          <td>{{ school.name }}</td>
          <td>{{ school.alias || '-' }}</td>
          <td>{{ school.address || '-' }}</td>
          <td>
            <v-btn size="small" variant="text" @click="openDialog(school)">编辑</v-btn>
            <v-btn size="small" color="error" variant="text" @click="remove(school.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>{{ editingId ? '编辑学校' : '新建学校' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="学校名称 *" />
          <v-text-field v-model="form.alias" label="别名" />
          <v-text-field v-model="form.address" label="地址" />
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

const schools = ref([])
const dialog = ref(false)
const editingId = ref(null)
const form = ref({ name: '', alias: '', address: '' })

function openDialog(school = null) {
  if (school) {
    editingId.value = school.id
    form.value = { name: school.name, alias: school.alias || '', address: school.address || '' }
  } else {
    editingId.value = null
    form.value = { name: '', alias: '', address: '' }
  }
  dialog.value = true
}

async function save() {
  if (!form.value.name) return
  if (editingId.value) {
    await api.updateSchool(editingId.value, form.value)
  } else {
    await api.createSchool(form.value)
  }
  dialog.value = false
  schools.value = await api.getSchools()
}

async function remove(id) {
  if (confirm('确定删除该学校？')) {
    await api.deleteSchool(id)
    schools.value = await api.getSchools()
  }
}

onMounted(async () => {
  schools.value = await api.getSchools()
})
</script>
