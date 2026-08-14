<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 mb-4">课表查询</h2>
      </v-col>
    </v-row>

    <!-- 查询条件 -->
    <v-row>
      <v-col cols="12" md="3">
        <v-select v-model="queryMode" :items="queryModes" label="查询维度" density="compact" />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-if="queryMode === 'class'" v-model="selectedClassroom" :items="classrooms"
          item-title="name" item-value="id" label="班级" density="compact" />
        <v-select v-else v-model="selectedTeacher" :items="teachers"
          item-title="name" item-value="id" label="教师" density="compact" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="weekStart" type="date" label="周起始日" density="compact" />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" @click="loadSchedule" :loading="loading">查询</v-btn>
      </v-col>
    </v-row>

    <!-- 课表网格 -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-table density="compact">
          <thead>
            <tr>
              <th>节次</th>
              <th v-for="day in weekDays" :key="day">{{ day }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in timeSlots" :key="slot.id">
              <td><strong>{{ slot.name }}</strong></td>
              <td v-for="(dayIdx, day) in 7" :key="day">
                <v-chip v-if="getCell(slot.id, day)" size="small" :color="getSubjectColor(getCell(slot.id, day).subject_id)">
                  {{ getCellText(getCell(slot.id, day)) }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const queryMode = ref('class')
const queryModes = [
  { title: '按班级', value: 'class' },
  { title: '按教师', value: 'teacher' },
]

const classrooms = ref([])
const teachers = ref([])
const timeSlots = ref([])
const subjects = ref([])
const snapshots = ref([])
const selectedClassroom = ref(null)
const selectedTeacher = ref(null)
const weekStart = ref(new Date().toISOString().split('T')[0])
const loading = ref(false)

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function getCell(slotId, dayOfWeek) {
  return snapshots.value.find(s => s.slot_index === slotId && new Date(s.date).getDay() === (dayOfWeek % 7))
}

function getCellText(cell) {
  if (!cell) return ''
  const subj = subjects.value.find(s => s.id === cell.subject_id)
  const teacher = teachers.value.find(t => t.id === cell.teacher_id)
  return `${subj?.name || '?'} ${teacher?.name || '?'}`
}

function getSubjectColor(subjectId) {
  const colors = ['blue-lighten-4', 'green-lighten-4', 'orange-lighten-4', 'purple-lighten-4', 'pink-lighten-4', 'teal-lighten-4']
  return colors[subjectId % colors.length]
}

async function loadSchedule() {
  loading.value = true
  try {
    const params = {}
    if (queryMode.value === 'class' && selectedClassroom.value) {
      params.classroom_id = selectedClassroom.value
    } else if (queryMode.value === 'teacher' && selectedTeacher.value) {
      params.teacher_id = selectedTeacher.value
    }
    // Get week range
    const start = new Date(weekStart.value)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    snapshots.value = await api.getSnapshots({
      ...params,
      date_from: start.toISOString().split('T')[0],
      date_to: end.toISOString().split('T')[0],
    })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const [c, t, ts, s] = await Promise.all([
    api.getClassrooms(),
    api.getTeachers(),
    api.getTimeSlots(),
    api.getSubjects(),
  ])
  classrooms.value = c
  teachers.value = t
  timeSlots.value = ts.sort((a, b) => a.sort_order - b.sort_order)
  subjects.value = s
})
</script>
