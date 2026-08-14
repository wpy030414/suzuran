<template>
  <v-container>
    <h2 class="text-h5 mb-4">班级管理</h2>

    <!-- Classrooms List -->
    <v-card class="mb-4">
      <v-card-title>
        班级列表
        <v-spacer />
        <v-btn color="primary" @click="classroomDialog = true" prepend-icon="mdi-plus">添加班级</v-btn>
      </v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>班级名称</th>
              <th>校区</th>
              <th>学年</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in classrooms" :key="c.id">
              <td>{{ c.name }}</td>
              <td>{{ c.campus }}</td>
              <td>{{ c.academic_year }}</td>
              <td>
                <v-btn size="small" color="primary" @click="selectClassroom(c)" class="mr-2">管理学生</v-btn>
                <v-btn size="small" color="error" @click="removeClassroom(c.id)">删除</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- Students Management -->
    <v-card v-if="selectedClassroom">
      <v-card-title>
        {{ selectedClassroom.name }} - 学生管理
        <v-spacer />
        <v-btn color="primary" @click="studentDialog = true" prepend-icon="mdi-plus">添加学生</v-btn>
      </v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>学号</th>
              <th>姓名</th>
              <th>性别</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in students" :key="s.id">
              <td>{{ s.student_no }}</td>
              <td>{{ s.name }}</td>
              <td>{{ s.gender || '-' }}</td>
              <td>
                <v-btn size="small" color="error" @click="removeStudent(s.id)">删除</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- Add Classroom Dialog -->
    <v-dialog v-model="classroomDialog" max-width="500">
      <v-card>
        <v-card-title>添加班级</v-card-title>
        <v-card-text>
          <v-text-field v-model="classroomForm.name" label="班级名称 (例如: 2024级1班)" />
          <v-text-field v-model="classroomForm.campus" label="校区" />
          <v-text-field v-model="classroomForm.academic_year" label="学年 (例如: 2024-2025)" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="classroomDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveClassroom">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Student Dialog -->
    <v-dialog v-model="studentDialog" max-width="500">
      <v-card>
        <v-card-title>添加学生</v-card-title>
        <v-card-text>
          <v-text-field v-model="studentForm.student_no" label="学号" />
          <v-text-field v-model="studentForm.name" label="姓名" />
          <v-select v-model="studentForm.gender" :items="['男', '女']" label="性别" clearable />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="studentDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveStudent">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const classrooms = ref([])
const students = ref([])
const selectedClassroom = ref(null)

const classroomDialog = ref(false)
const classroomForm = ref({ name: '', campus: '', academic_year: '' })

const studentDialog = ref(false)
const studentForm = ref({ student_no: '', name: '', gender: '' })

async function loadClassrooms() {
  classrooms.value = await api.getClassrooms()
}

function selectClassroom(c) {
  selectedClassroom.value = c
  loadStudents()
}

async function loadStudents() {
  if (!selectedClassroom.value) return
  students.value = await api.getStudentsByClassroom(selectedClassroom.value.id)
}

async function saveClassroom() {
  await api.createClassroom(classroomForm.value)
  classroomDialog.value = false
  classroomForm.value = { name: '', campus: '', academic_year: '' }
  await loadClassrooms()
}

async function removeClassroom(id) {
  if (confirm('确定删除该班级？')) {
    await api.deleteClassroom(id)
    if (selectedClassroom.value && selectedClassroom.value.id === id) {
      selectedClassroom.value = null
      students.value = []
    }
    await loadClassrooms()
  }
}

async function saveStudent() {
  await api.createStudent({
    ...studentForm.value,
    classroom_id: selectedClassroom.value.id,
  })
  studentDialog.value = false
  studentForm.value = { student_no: '', name: '', gender: '' }
  await loadStudents()
}

async function removeStudent(id) {
  if (confirm('确定删除该学生？')) {
    await api.deleteStudent(id)
    await loadStudents()
  }
}

onMounted(loadClassrooms)
</script>
