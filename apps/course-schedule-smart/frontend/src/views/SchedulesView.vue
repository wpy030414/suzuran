<template>
  <v-container>
    <h2 class="text-h5 mb-4">课表管理</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">新建课表</v-btn>

    <v-table density="compact">
      <thead>
        <tr><th>班级</th><th>学期</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="s in schedules" :key="s.id">
          <td>{{ classrooms.find(c => c.id === s.classroom_id)?.name || s.classroom_id }}</td>
          <td>{{ s.semester_start }} ~ {{ s.semester_end }}</td>
          <td>
            <v-btn size="small" variant="text" @click="editSchedule(s)">编辑</v-btn>
            <v-btn size="small" variant="text" color="error" @click="deleteSchedule(s.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="800">
      <v-card>
        <v-card-title>{{ editingId ? '编辑课表' : '新建课表' }}</v-card-title>
        <v-card-text>
          <v-select v-model="form.classroom_id" :items="classrooms" item-title="name" item-value="id" label="班级" />
          <v-text-field v-model="form.semester_start" type="date" label="学期开始" />
          <v-text-field v-model="form.semester_end" type="date" label="学期结束" />

          <div class="mt-4">
            <h3 class="text-subtitle-1 mb-2">每周课表</h3>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>节次</th>
                  <th v-for="day in weekDays" :key="day">{{ day }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="slot in timeSlots" :key="slot.id">
                  <td>{{ slot.name }}</td>
                  <td v-for="dayIdx in 7" :key="dayIdx">
                    <v-select v-model="weeklyData[`day_${dayIdx}`][slot.id]"
                      :items="subjectTeacherOptions" item-title="label" item-value="value"
                      density="compact" hide-details clearable />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveSchedule">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const schedules = ref([])
const classrooms = ref([])
const timeSlots = ref([])
const subjects = ref([])
const teachers = ref([])
const dialog = ref(false)
const editingId = ref(null)
const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const form = ref({ classroom_id: null, semester_start: '', semester_end: '' })
const weeklyData = ref({})

const subjectTeacherOptions = computed(() => {
  const opts = []
  for (const subj of subjects.value) {
    for (const t of teachers.value) {
      opts.push({ label: `${subj.name} - ${t.name}`, value: `${subj.id}:${t.id}` })
    }
  }
  return opts
})

function initWeeklyData() {
  const data = {}
  for (let d = 1; d <= 7; d++) {
    data[`day_${d}`] = {}
    for (const slot of timeSlots.value) {
      data[`day_${d}`][slot.id] = null
    }
  }
  return data
}

function editSchedule(s) {
  editingId.value = s.id
  form.value = { classroom_id: s.classroom_id, semester_start: s.semester_start, semester_end: s.semester_end }
  weeklyData.value = typeof s.weekly_data === 'string' ? JSON.parse(s.weekly_data) : (s.weekly_data || initWeeklyData())
  dialog.value = true
}

async function saveSchedule() {
  const data = {
    ...form.value,
    weekly_data: JSON.stringify(weeklyData.value),
  }
  if (editingId.value) {
    await api.updateSchedule(editingId.value, data)
  } else {
    await api.createSchedule(data)
  }
  dialog.value = false
  editingId.value = null
  await loadSchedules()
}

async function deleteSchedule(id) {
  if (confirm('确定删除？')) {
    await api.deleteSchedule(id)
    await loadSchedules()
  }
}

async function loadSchedules() {
  schedules.value = await api.getSchedules()
}

onMounted(async () => {
  const [c, ts, s, t] = await Promise.all([
    api.getClassrooms(),
    api.getTimeSlots(),
    api.getSubjects(),
    api.getTeachers(),
  ])
  classrooms.value = c
  timeSlots.value = ts.sort((a, b) => a.sort_order - b.sort_order)
  subjects.value = s
  teachers.value = t
  weeklyData.value = initWeeklyData()
  await loadSchedules()
})
</script>
