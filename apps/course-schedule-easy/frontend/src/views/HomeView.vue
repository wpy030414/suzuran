<template>
  <v-container>
    <h2 class="text-h5 mb-4">实时课表查询</h2>

    <!-- Query controls -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-btn-toggle v-model="queryMode" density="compact" mandatory>
              <v-btn value="classroom">按班级</v-btn>
              <v-btn value="teacher">按教师</v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-if="queryMode === 'classroom'" v-model="classroomId" :items="classrooms"
              item-title="name" item-value="id" label="班级" density="compact" />
            <v-select v-else v-model="teacherId" :items="teachers"
              item-title="name" item-value="id" label="教师" density="compact" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="date" type="date" label="日期" density="compact" />
          </v-col>
          <v-col cols="12" md="3">
            <v-btn color="primary" @click="loadSchedule" :loading="loading" block>查询</v-btn>
          </v-col>
        </v-row>
        <!-- Week navigation -->
        <v-row class="mt-2">
          <v-col cols="12">
            <v-btn size="small" variant="text" @click="prevWeek" prepend-icon="mdi-chevron-left">上一周</v-btn>
            <span class="mx-2 text-caption">{{ weekLabel }}</span>
            <v-btn size="small" variant="text" @click="nextWeek" append-icon="mdi-chevron-right">下一周</v-btn>
            <v-btn size="small" variant="text" @click="goToday" class="ml-2">今天</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Classroom mode: weekly grid -->
    <v-card v-if="queryMode === 'classroom' && scheduleData.length > 0">
      <v-card-title>
        {{ currentClassroomName }} 周课表
        <v-chip v-if="hasSubstitutions" color="orange" size="small" class="ml-2">含调代课</v-chip>
      </v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>节次</th>
              <th v-for="day in weekDays" :key="day">{{ day }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in sortedSlots" :key="slot.sort_order">
              <td><strong>{{ slot.name }}</strong></td>
              <td v-for="dayIdx in 7" :key="dayIdx">
                <v-chip
                  v-if="getCell(slot.sort_order, dayIdx)"
                  size="small"
                  :color="getCell(slot.sort_order, dayIdx).substituted ? 'orange' : 'blue-lighten-4'"
                >
                  {{ getCellText(getCell(slot.sort_order, dayIdx)) }}
                  <template v-if="getCell(slot.sort_order, dayIdx).substituted">
                    <span class="font-weight-bold">[{{ getCell(slot.sort_order, dayIdx).sub_type }}]</span>
                  </template>
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- Teacher mode: aggregated view -->
    <v-card v-if="queryMode === 'teacher' && scheduleData.length > 0">
      <v-card-title>
        {{ currentTeacherName }} 个人课表
        <v-chip v-if="hasSubstitutions" color="orange" size="small" class="ml-2">含调代课</v-chip>
      </v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>节次</th>
              <th v-for="day in weekDays" :key="day">{{ day }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="slot in teacherSlots" :key="slot.slot_index + '_' + slot.dayKey">
              <td>第{{ slot.slot_index + 1 }}节</td>
              <td v-for="dayIdx in 7" :key="dayIdx">
                <v-chip
                  v-if="getTeacherCell(slot, dayIdx)"
                  size="small"
                  :color="getTeacherCell(slot, dayIdx).substituted ? 'orange' : 'teal-lighten-4'"
                >
                  {{ getTeacherCell(slot, dayIdx).classroom_name }}
                  {{ getTeacherCell(slot, dayIdx).subject_name }}
                  <template v-if="getTeacherCell(slot, dayIdx).substituted">
                    [{{ getTeacherCell(slot, dayIdx).sub_type }}]
                  </template>
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <v-alert v-if="!loading && scheduleData.length === 0" type="info">
      {{ queryMode === 'classroom' ? '请选择班级后查询' : '请选择教师后查询' }}
    </v-alert>

    <!-- Legend -->
    <v-card class="mt-4" variant="outlined">
      <v-card-text>
        <v-chip color="blue-lighten-4" size="small" class="mr-2">正常</v-chip>
        <v-chip color="orange" size="small" class="mr-2">调代课</v-chip>
        <span class="text-caption">[代] = 代课 | [调] = 调课</span>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const queryMode = ref('classroom')
const classroomId = ref(null)
const teacherId = ref(null)
const date = ref(new Date().toISOString().split('T')[0])
const classrooms = ref([])
const teachers = ref([])
const timeSlots = ref([])
const subjects = ref([])
const scheduleData = ref([])
const loading = ref(false)

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const currentClassroomName = computed(() => {
  const c = classrooms.value.find(c => c.id === classroomId.value)
  return c?.name || ''
})

const currentTeacherName = computed(() => {
  const t = teachers.value.find(t => t.id === teacherId.value)
  return t?.name || ''
})

const sortedSlots = computed(() => {
  return [...timeSlots.value].sort((a, b) => a.sort_order - b.sort_order)
})

const weekLabel = computed(() => {
  const d = new Date(date.value)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return `${monday.toLocaleDateString('zh-CN')} - ${sunday.toLocaleDateString('zh-CN')}`
})

const hasSubstitutions = computed(() => {
  if (queryMode.value === 'classroom') {
    for (const s of scheduleData.value) {
      if (s.weeklyData) {
        for (const slots of Object.values(s.weeklyData)) {
          if (Array.isArray(slots) && slots.some(sl => sl.substituted)) return true
        }
      }
    }
  } else {
    return scheduleData.value.some(s => s.substituted)
  }
  return false
})

const teacherSlots = computed(() => {
  // Group by slot_index
  const slotMap = {}
  for (const item of scheduleData.value) {
    const key = item.slot_index
    if (!slotMap[key]) slotMap[key] = item
  }
  return Object.values(slotMap).sort((a, b) => a.slot_index - b.slot_index)
})

function getCell(slotIndex, dayIdx) {
  const dayKey = `day_${dayIdx === 7 ? 0 : dayIdx}`
  for (const schedule of scheduleData.value) {
    const daySlots = schedule.weeklyData?.[dayKey] || []
    const slot = daySlots.find(s => s.slot_index === slotIndex)
    if (slot) return slot
  }
  return null
}

function getCellText(cell) {
  if (!cell) return ''
  const subj = subjects.value.find(s => s.id === cell.subject_id)
  const teacher = teachers.value.find(t => t.id === cell.teacher_id)
  const subjName = cell.subject_name || subj?.name || '?'
  const teacherName = cell.teacher_name || teacher?.name || '?'
  return `${subjName} ${teacherName}`
}

function getTeacherCell(slot, dayIdx) {
  const dayKey = `day_${dayIdx === 7 ? 0 : dayIdx}`
  return scheduleData.value.find(s => s.slot_index === slot.slot_index && s.dayKey === dayKey) || null
}

function prevWeek() {
  const d = new Date(date.value)
  d.setDate(d.getDate() - 7)
  date.value = d.toISOString().split('T')[0]
  loadSchedule()
}

function nextWeek() {
  const d = new Date(date.value)
  d.setDate(d.getDate() + 7)
  date.value = d.toISOString().split('T')[0]
  loadSchedule()
}

function goToday() {
  date.value = new Date().toISOString().split('T')[0]
  loadSchedule()
}

async function loadSchedule() {
  loading.value = true
  try {
    const params = { date: date.value }
    if (queryMode.value === 'classroom' && classroomId.value) {
      params.classroom_id = classroomId.value
    } else if (queryMode.value === 'teacher' && teacherId.value) {
      params.teacher_id = teacherId.value
    }
    const result = await api.getRealtimeSchedule(params)
    scheduleData.value = result.rows || []
  } catch (e) {
    scheduleData.value = []
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
  timeSlots.value = ts
  subjects.value = s
  loadSchedule()
})
</script>
