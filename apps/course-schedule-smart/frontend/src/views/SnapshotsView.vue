<template>
  <v-container>
    <h2 class="text-h5 mb-4">快照查询</h2>
    <v-row>
      <v-col cols="12" md="3">
        <v-select v-model="filters.classroom_id" :items="classrooms" item-title="name" item-value="id" label="班级" clearable density="compact" />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-model="filters.teacher_id" :items="teachers" item-title="name" item-value="id" label="教师" clearable density="compact" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="filters.date" type="date" label="日期" density="compact" />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" @click="loadSnapshots">查询</v-btn>
      </v-col>
    </v-row>

    <v-table density="compact" class="mt-4">
      <thead>
        <tr><th>日期</th><th>节次</th><th>班级</th><th>科目</th><th>教师</th><th>状态</th></tr>
      </thead>
      <tbody>
        <tr v-for="s in snapshots" :key="s.id">
          <td>{{ s.date }}</td>
          <td>{{ timeSlots.find(t => t.id === s.slot_index)?.name || s.slot_index }}</td>
          <td>{{ classrooms.find(c => c.id === s.classroom_id)?.name || s.classroom_id }}</td>
          <td>{{ subjects.find(sub => sub.id === s.subject_id)?.name || s.subject_id }}</td>
          <td>{{ teachers.find(t => t.id === s.teacher_id)?.name || s.teacher_id }}</td>
          <td>
            <v-chip :color="statusColor(s.status)" size="small">{{ s.status }}</v-chip>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const snapshots = ref([])
const classrooms = ref([])
const teachers = ref([])
const timeSlots = ref([])
const subjects = ref([])
const filters = ref({ classroom_id: null, teacher_id: null, date: '' })

function statusColor(status) {
  const map = { normal: 'success', substituted: 'warning', swapped: 'info' }
  return map[status] || 'grey'
}

async function loadSnapshots() {
  const params = {}
  if (filters.value.classroom_id) params.classroom_id = filters.value.classroom_id
  if (filters.value.teacher_id) params.teacher_id = filters.value.teacher_id
  if (filters.value.date) params.date = filters.value.date
  snapshots.value = await api.getSnapshots(params)
}

onMounted(async () => {
  const [c, t, ts, s] = await Promise.all([
    api.getClassrooms(), api.getTeachers(), api.getTimeSlots(), api.getSubjects(),
  ])
  classrooms.value = c; teachers.value = t; timeSlots.value = ts; subjects.value = s
})
</script>
