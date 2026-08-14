<template>
  <v-container>
    <h2 class="text-h5 mb-4">巡课</h2>
    <v-row>
      <v-col cols="12" md="3">
        <v-select v-model="campusId" :items="campuses" item-title="name" item-value="id" label="校区" />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-model="slotIndex" :items="timeSlots" item-title="name" item-value="id" label="节次" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="date" type="date" label="日期" />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" @click="loadClasses" :loading="loading">查询</v-btn>
      </v-col>
    </v-row>

    <v-table density="compact" class="mt-4" v-if="classes.length">
      <thead>
        <tr><th>班级</th><th>科目</th><th>授课教师</th><th>情况</th></tr>
      </thead>
      <tbody>
        <tr v-for="c in classes" :key="c.snapshot_id">
          <td>{{ classrooms.find(cl => cl.id === c.classroom_id)?.name || c.classroom_id }}</td>
          <td>{{ subjects.find(s => s.id === c.subject_id)?.name || c.subject_id }}</td>
          <td>{{ teachers.find(t => t.id === c.teacher_id)?.name || c.teacher_id }}</td>
          <td>
            <v-select v-model="c.inspection_status" :items="['正常','异常']" density="compact" hide-details />
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const campuses = ref([])
const classrooms = ref([])
const timeSlots = ref([])
const subjects = ref([])
const teachers = ref([])
const campusId = ref(null)
const slotIndex = ref(null)
const date = ref(new Date().toISOString().split('T')[0])
const classes = ref([])
const loading = ref(false)

async function loadClasses() {
  loading.value = true
  try {
    classes.value = await api.getInspectionClasses({
      campus_id: campusId.value,
      slot_index: slotIndex.value,
      date: date.value,
    })
  } finally { loading.value = false }
}

onMounted(async () => {
  const [c, cl, ts, s, t] = await Promise.all([
    api.getClassrooms(), api.getClassrooms(), api.getTimeSlots(), api.getSubjects(), api.getTeachers(),
  ])
  campuses.value = c; classrooms.value = cl; timeSlots.value = ts; subjects.value = s; teachers.value = t
})
</script>
