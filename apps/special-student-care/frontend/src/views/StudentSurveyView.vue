<template>
  <v-container>
    <h2 class="text-h5 mb-4">学生情况动态摸排</h2>

    <v-row class="mb-4">
      <v-col cols="4">
        <v-text-field v-model="filters.search" label="搜索学生姓名" clearable />
      </v-col>
      <v-col cols="4">
        <v-select v-model="filters.grade_id" :items="grades" item-title="grade_name" item-value="id" label="年级" clearable />
      </v-col>
      <v-col cols="4">
        <v-select v-model="filters.class_id" :items="classes" item-title="class_name" item-value="id" label="班级" clearable />
      </v-col>
    </v-row>

    <v-btn color="primary" @click="loadSurvey" class="mb-4">查询</v-btn>

    <v-alert type="info" variant="tonal" class="mb-4">
      <strong>在案学生：</strong>{{ survey.total }}人
    </v-alert>

    <v-table density="compact">
      <thead>
        <tr>
          <th>学号</th>
          <th>姓名</th>
          <th>年级</th>
          <th>班级</th>
          <th>类型</th>
          <th>关爱级别</th>
          <th>监护人</th>
          <th>电话</th>
          <th>包保责任人</th>
          <th>年级组长</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in survey.students" :key="s.id">
          <td>{{ s.student_code }}</td>
          <td>{{ s.name }}</td>
          <td>{{ s.grade_name }}</td>
          <td>{{ s.class_name }}</td>
          <td>{{ s.condition_type }}</td>
          <td>{{ s.care_level?.level_name || '-' }}</td>
          <td>{{ s.guardian_name }}</td>
          <td>{{ s.guardian_phone }}</td>
          <td>{{ s.responsible_teacher_name }}</td>
          <td>{{ s.grade_director }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const grades = ref([])
const classes = ref([])
const survey = ref({ students: [], total: 0 })
const filters = ref({
  search: '',
  grade_id: null,
  class_id: null
})

async function loadSurvey() {
  survey.value = await api.getStudentSurvey(filters.value)
}

onMounted(async () => {
  grades.value = await api.getGrades()
  classes.value = await api.getClasses()
  await loadSurvey()
})
</script>
