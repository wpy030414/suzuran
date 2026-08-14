<template>
  <v-container>
    <h2 class="text-h5 mb-4">体育课考勤</h2>

    <!-- Step 1: Create PE class session -->
    <v-card v-if="!peClassId" class="mb-4">
      <v-card-title>开始考勤</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-select
              v-model="form.classroom_id"
              :items="classrooms"
              item-title="name"
              item-value="id"
              label="班级"
              density="compact"
              @update:model-value="onClassroomChange"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="form.pe_teacher_name"
              label="体育教师"
              density="compact"
              readonly
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="form.date" type="date" label="日期" density="compact" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="form.slot_index" type="number" label="节次" density="compact" />
          </v-col>
        </v-row>
        <div v-if="form.classroom_id" class="text-caption mt-2">
          班主任: {{ currentClassroom?.homeroom_teacher_name || '未配置' }} |
          学生人数: {{ students.length }}
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="startClass" :loading="starting" :disabled="!canStart">开始点名</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Step 2: Attendance taking -->
    <v-card v-if="peClassId">
      <v-card-title>
        考勤记录 - {{ currentClassroom?.name }}
        <v-chip class="ml-2" size="small">{{ form.date }} 第{{ form.slot_index }}节</v-chip>
      </v-card-title>
      <v-card-text>
        <!-- Role selector -->
        <v-btn-toggle v-model="currentRole" class="mb-4">
          <v-btn value="pe_teacher">体育老师（点到勤）</v-btn>
          <v-btn value="homeroom">班主任（报请假）</v-btn>
        </v-btn-toggle>

        <v-table density="compact">
          <thead>
            <tr>
              <th>学生</th>
              <th v-if="currentRole === 'homeroom'">请假</th>
              <th v-if="currentRole === 'pe_teacher'">到勤</th>
              <th>竞合结果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in students" :key="s.id">
              <td>{{ s.name }}</td>
              <td v-if="currentRole === 'homeroom'">
                <v-checkbox v-model="s.hasLeave" density="compact" hide-details color="warning" />
              </td>
              <td v-if="currentRole === 'pe_teacher'">
                <v-checkbox v-model="s.present" density="compact" hide-details color="success" />
              </td>
              <td>
                <v-chip :color="getResultColor(s)" size="small">{{ getResultText(s) }}</v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>

        <!-- Summary -->
        <v-row class="mt-4">
          <v-col cols="12" md="4">
            <v-alert type="success" density="compact">
              到勤: {{ students.filter(s => s.present).length }} / {{ students.length }}
            </v-alert>
          </v-col>
          <v-col cols="12" md="4">
            <v-alert type="warning" density="compact">
              请假: {{ students.filter(s => s.hasLeave).length }} / {{ students.length }}
            </v-alert>
          </v-col>
          <v-col cols="12" md="4">
            <v-alert type="error" density="compact">
              异常: {{ students.filter(s => !s.present && !s.hasLeave).length }} / {{ students.length }}
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-btn color="success" @click="submitAttendance" :loading="submitting">提交考勤</v-btn>
        <v-btn color="warning" @click="doReconcile" :loading="reconciling">竞合比对</v-btn>
        <v-btn variant="outlined" @click="resetClass">重新开始</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Reconciliation result -->
    <v-card v-if="reconcileResult" class="mt-4">
      <v-card-title>竞合比对结果</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <div class="text-h4 text-success">{{ reconcileResult.normal }}</div>
            <div class="text-caption">正常</div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="text-h4 text-error">{{ reconcileResult.anomaly }}</div>
            <div class="text-caption">异常</div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="text-h4">{{ reconcileResult.total }}</div>
            <div class="text-caption">总计</div>
          </v-col>
        </v-row>
        <v-alert v-if="reconcileResult.anomalies && reconcileResult.anomalies.length > 0" type="error" class="mt-4">
          <div class="font-weight-bold">异常学生:</div>
          <div v-for="a in reconcileResult.anomalies" :key="a.student_id">
            {{ a.student_name || `学生${a.student_id}` }}
          </div>
        </v-alert>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const classrooms = ref([])
const students = ref([])
const peClassId = ref(null)
const currentRole = ref('pe_teacher')
const starting = ref(false)
const submitting = ref(false)
const reconciling = ref(false)
const reconcileResult = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const form = ref({
  classroom_id: null,
  pe_teacher_id: null,
  pe_teacher_name: '',
  date: new Date().toISOString().split('T')[0],
  slot_index: '',
})

const currentClassroom = computed(() => {
  return classrooms.value.find(c => c.id === form.value.classroom_id)
})

const canStart = computed(() => {
  return form.value.classroom_id && form.value.date && form.value.slot_index
})

function onClassroomChange(classroomId) {
  const classroom = classrooms.value.find(c => c.id === classroomId)
  if (classroom) {
    form.value.pe_teacher_id = classroom.pe_teacher_id
    form.value.pe_teacher_name = classroom.pe_teacher_name || ''
    // Load students
    loadStudents(classroomId)
  }
}

async function loadStudents(classroomId) {
  try {
    const result = await api.getStudentsByClassroom(classroomId)
    students.value = result.map(s => ({
      id: s.id,
      name: s.name,
      present: true, // default present
      hasLeave: false,
    }))
  } catch {
    students.value = []
  }
}

function getResultColor(s) {
  if (!s.present && !s.hasLeave) return 'error'
  if (s.present && s.hasLeave) return 'warning' // leave but present
  return 'success'
}

function getResultText(s) {
  if (!s.present && !s.hasLeave) return '异常'
  if (!s.present && s.hasLeave) return '正常（已请假）'
  if (s.present && s.hasLeave) return '正常（请假但到勤）'
  return '正常'
}

async function startClass() {
  starting.value = true
  try {
    const result = await api.createClass({
      classroom_id: form.value.classroom_id,
      pe_teacher_id: form.value.pe_teacher_id,
      date: form.value.date,
      slot_index: parseInt(form.value.slot_index),
    })
    peClassId.value = result.id
    // Students already loaded from onClassroomChange
    showMsg('考勤已开始')
  } catch (e) {
    showMsg(e.response?.data?.error || '创建失败', 'error')
  } finally {
    starting.value = false
  }
}

async function submitAttendance() {
  submitting.value = true
  try {
    // Submit attendance records (PE teacher perspective)
    const attendanceRecords = students.value.map(s => ({
      student_id: s.id,
      status: s.present ? 'present' : 'absent',
    }))
    await api.batchAttendance({
      pe_class_id: peClassId.value,
      records: attendanceRecords,
      teacher_id: form.value.pe_teacher_id,
    })

    // Submit leave reports (homeroom teacher perspective)
    const leaveRecords = students.value.filter(s => s.hasLeave).map(s => ({
      student_id: s.id,
      student_name: s.name,
      reason: '已请假',
    }))
    if (leaveRecords.length > 0) {
      await api.batchLeaves({
        pe_class_id: peClassId.value,
        leaves: leaveRecords,
        teacher_id: currentClassroom.value?.homeroom_teacher_id,
      })
    }

    showMsg('考勤提交成功！')
  } catch (e) {
    showMsg(e.response?.data?.error || '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}

async function doReconcile() {
  reconciling.value = true
  try {
    const result = await api.reconcile(peClassId.value)
    reconcileResult.value = result
    if (result.anomaly > 0) {
      showMsg(`发现 ${result.anomaly} 条异常`, 'warning')
    } else {
      showMsg('竞合比对完成，全部正常', 'success')
    }
  } catch (e) {
    showMsg(e.response?.data?.error || '比对失败', 'error')
  } finally {
    reconciling.value = false
  }
}

function resetClass() {
  peClassId.value = null
  reconcileResult.value = null
  students.value = []
}

function showMsg(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

onMounted(async () => {
  classrooms.value = await api.getClassrooms()
})
</script>
