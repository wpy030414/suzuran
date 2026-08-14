<template>
  <v-container>
    <h2 class="text-h5 mb-4">基础数据管理</h2>

    <v-tabs v-model="tab">
      <v-tab value="campuses">校区</v-tab>
      <v-tab value="classrooms">班级</v-tab>
      <v-tab value="subjects">科目</v-tab>
      <v-tab value="timeSlots">节次</v-tab>
      <v-tab value="teachers">教师池</v-tab>
    </v-tabs>

    <v-window v-model="tab" class="mt-4">
      <!-- 校区 -->
      <v-window-item value="campuses">
        <v-btn size="small" color="primary" @click="openDialog('campuses')" class="mb-2">新增</v-btn>
        <v-table density="compact">
          <thead><tr><th>名称</th><th>地址</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="item in campuses" :key="item.id">
              <td>{{ item.name }}</td><td>{{ item.address }}</td>
              <td>
                <v-btn size="small" variant="text" @click="editItem('campuses', item)">编辑</v-btn>
                <v-btn size="small" variant="text" color="error" @click="deleteItem('campuses', item.id)">删除</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-window-item>

      <!-- 班级 -->
      <v-window-item value="classrooms">
        <v-btn size="small" color="primary" @click="openDialog('classrooms')" class="mb-2">新增</v-btn>
        <v-table density="compact">
          <thead><tr><th>名称</th><th>校区ID</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="item in classrooms" :key="item.id">
              <td>{{ item.name }}</td><td>{{ item.campus_id }}</td>
              <td>
                <v-btn size="small" variant="text" @click="editItem('classrooms', item)">编辑</v-btn>
                <v-btn size="small" variant="text" color="error" @click="deleteItem('classrooms', item.id)">删除</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-window-item>

      <!-- 科目 -->
      <v-window-item value="subjects">
        <v-btn size="small" color="primary" @click="openDialog('subjects')" class="mb-2">新增</v-btn>
        <v-table density="compact">
          <thead><tr><th>名称</th><th>颜色</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="item in subjects" :key="item.id">
              <td>{{ item.name }}</td><td>{{ item.color }}</td>
              <td>
                <v-btn size="small" variant="text" @click="editItem('subjects', item)">编辑</v-btn>
                <v-btn size="small" variant="text" color="error" @click="deleteItem('subjects', item.id)">删除</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-window-item>

      <!-- 节次 -->
      <v-window-item value="timeSlots">
        <v-btn size="small" color="primary" @click="openDialog('timeSlots')" class="mb-2">新增</v-btn>
        <v-table density="compact">
          <thead><tr><th>名称</th><th>开始</th><th>结束</th><th>排序</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="item in timeSlots" :key="item.id">
              <td>{{ item.name }}</td><td>{{ item.start_time }}</td><td>{{ item.end_time }}</td><td>{{ item.sort_order }}</td>
              <td>
                <v-btn size="small" variant="text" @click="editItem('timeSlots', item)">编辑</v-btn>
                <v-btn size="small" variant="text" color="error" @click="deleteItem('timeSlots', item.id)">删除</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-window-item>

      <!-- 教师池 -->
      <v-window-item value="teachers">
        <v-btn size="small" color="primary" @click="openDialog('teachers')" class="mb-2">新增</v-btn>
        <v-table density="compact">
          <thead><tr><th>名称</th><th>用户ID</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="item in teachers" :key="item.id">
              <td>{{ item.name }}</td><td>{{ item.user_id }}</td>
              <td>
                <v-btn size="small" variant="text" @click="editItem('teachers', item)">编辑</v-btn>
                <v-btn size="small" variant="text" color="error" @click="deleteItem('teachers', item.id)">删除</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-window-item>
    </v-window>

    <!-- 通用编辑对话框 -->
    <v-dialog v-model="dialogOpen" max-width="500">
      <v-card>
        <v-card-title>{{ editingId ? '编辑' : '新增' }}</v-card-title>
        <v-card-text>
          <v-text-field v-for="field in currentFields" :key="field.key"
            v-model="formData[field.key]" :label="field.label" density="compact" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialogOpen = false">取消</v-btn>
          <v-btn color="primary" @click="saveItem">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const tab = ref('campuses')
const campuses = ref([])
const classrooms = ref([])
const subjects = ref([])
const timeSlots = ref([])
const teachers = ref([])

const dialogOpen = ref(false)
const editingId = ref(null)
const currentTable = ref('')
const formData = ref({})

const fieldMap = {
  campuses: [{ key: 'name', label: '名称' }, { key: 'address', label: '地址' }],
  classrooms: [{ key: 'name', label: '名称' }, { key: 'campus_id', label: '校区ID' }],
  subjects: [{ key: 'name', label: '名称' }, { key: 'color', label: '颜色' }],
  timeSlots: [{ key: 'name', label: '名称' }, { key: 'start_time', label: '开始时间' }, { key: 'end_time', label: '结束时间' }, { key: 'sort_order', label: '排序' }],
  teachers: [{ key: 'name', label: '名称' }, { key: 'user_id', label: '用户ID' }],
}

const currentFields = ref([])

const apiMap = {
  campuses: { list: () => api.getClassrooms().then(() => api.getClassrooms()), create: api.createClassroom, update: api.updateClassroom, delete: api.deleteClassroom },
}

function openDialog(table) {
  currentTable.value = table
  editingId.value = null
  formData.value = {}
  currentFields.value = fieldMap[table] || []
  dialogOpen.value = true
}

function editItem(table, item) {
  currentTable.value = table
  editingId.value = item.id
  formData.value = { ...item }
  currentFields.value = fieldMap[table] || []
  dialogOpen.value = true
}

async function saveItem() {
  const table = currentTable.value
  if (editingId.value) {
    await api.update(table === 'timeSlots' ? 'time-slots' : table, editingId.value, formData.value)
  } else {
    await api.create(table === 'timeSlots' ? 'time-slots' : table, formData.value)
  }
  dialogOpen.value = false
  await loadAll()
}

async function deleteItem(table, id) {
  if (confirm('确定删除？')) {
    await api.delete(table === 'timeSlots' ? 'time-slots' : table, id)
    await loadAll()
  }
}

async function loadAll() {
  campuses.value = await api.getClassrooms() // placeholder - should be separate
  classrooms.value = await api.getClassrooms()
  subjects.value = await api.getSubjects()
  timeSlots.value = await api.getTimeSlots()
  teachers.value = await api.getTeachers()
}

onMounted(loadAll)
</script>
