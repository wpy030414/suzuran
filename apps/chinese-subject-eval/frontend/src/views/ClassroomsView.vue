<template>
  <v-container>
    <div class="d-flex align-center mb-4 flex-wrap ga-2">
      <h2 class="text-h5">班级管理</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">新建班级</v-btn>
    </div>

    <v-alert v-if="classrooms.length === 0" type="info" variant="tonal">暂无班级</v-alert>
    <v-row>
      <v-col v-for="c in classrooms" :key="c.id" cols="12" md="6" lg="4">
        <v-card>
          <v-card-title class="d-flex align-center">
            <span>{{ c.name }}</span>
            <v-spacer />
            <v-chip size="small" color="primary">{{ getStudents(c).length }} 人</v-chip>
          </v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item v-for="s in getStudents(c)" :key="s.id" :title="s.name" :subtitle="`ID: ${s.id}`" />
            </v-list>
            <v-btn size="small" variant="text" prepend-icon="mdi-account-plus" @click="openAddStudent(c)">添加学生</v-btn>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn size="small" color="error" variant="text" @click="removeClassroom(c.id)">删除班级</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Create classroom dialog -->
    <v-dialog v-model="createDialog" max-width="500">
      <v-card>
        <v-card-title>新建班级</v-card-title>
        <v-card-text>
          <v-text-field v-model="newClassroomName" label="班级名称 (格式: 2023级01班)" hint="必须以4位入学年份开头" persistent-hint />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="createDialog = false">取消</v-btn>
          <v-btn color="primary" @click="createClassroom" :disabled="!canCreate">创建</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add student dialog -->
    <v-dialog v-model="addStudentDialog" max-width="500">
      <v-card>
        <v-card-title>添加学生到 {{ selectedClassroom?.name }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="newStudentName" label="学生姓名" />
          <v-text-field v-model="newStudentId" type="number" label="学生ID" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="addStudentDialog = false">取消</v-btn>
          <v-btn color="primary" @click="addStudent" :disabled="!canAddStudent">添加</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const classrooms = ref([])
const createDialog = ref(false)
const addStudentDialog = ref(false)
const newClassroomName = ref('')
const newStudentName = ref('')
const newStudentId = ref('')
const selectedClassroom = ref(null)

const canCreate = computed(() => /^\d{4}级/.test(newClassroomName.value))
const canAddStudent = computed(() => newStudentName.value && newStudentId.value)

function getStudents(classroom) {
  const students = typeof classroom.student_ids === 'string' ? JSON.parse(classroom.student_ids) : classroom.student_ids
  return students || []
}

function openCreate() {
  newClassroomName.value = ''
  createDialog.value = true
}

function openAddStudent(classroom) {
  selectedClassroom.value = classroom
  newStudentName.value = ''
  newStudentId.value = ''
  addStudentDialog.value = true
}

async function createClassroom() {
  try {
    await api.createClassroom({ name: newClassroomName.value, student_ids: [] })
    createDialog.value = false
    classrooms.value = await api.getClassrooms()
  } catch (e) {
    alert(e.response?.data?.error || '创建失败')
  }
}

async function addStudent() {
  try {
    const students = getStudents(selectedClassroom.value)
    students.push({ id: parseInt(newStudentId.value), name: newStudentName.value })
    await api.updateClassroom(selectedClassroom.value.id, { student_ids: students })
    addStudentDialog.value = false
    classrooms.value = await api.getClassrooms()
  } catch (e) {
    alert(e.response?.data?.error || '添加失败')
  }
}

async function removeClassroom(id) {
  if (confirm('确定删除此班级？')) {
    await api.deleteClassroom(id)
    classrooms.value = await api.getClassrooms()
  }
}

onMounted(async () => { classrooms.value = await api.getClassrooms() })
</script>
