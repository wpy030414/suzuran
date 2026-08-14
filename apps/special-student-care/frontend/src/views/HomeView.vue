<template>
  <v-container>
    <h2 class="text-h5 mb-4">首页工作台</h2>

    <!-- 学术信息 -->
    <v-alert type="info" variant="tonal" class="mb-4">
      <strong>当前学年学期：</strong>{{ academicInfo.academicYear }}学年 第{{ academicInfo.semester }}学期
    </v-alert>

    <!-- 待关爱任务 -->
    <v-card class="mb-4" color="warning" variant="tonal">
      <v-card-title>
        <v-icon start>mdi-alert-circle</v-icon>
        待关爱任务（{{ pendingTasks.length }}）
      </v-card-title>
      <v-card-text>
        <v-list v-if="pendingTasks.length > 0">
          <v-list-item v-for="task in pendingTasks" :key="task.item_id">
            <v-list-item-title>{{ task.student_name }}</v-list-item-title>
            <v-list-item-subtitle>
              计划{{ task.planned_count }}次，已完成{{ task.completed_count }}次，剩余{{ task.remaining_count }}次
            </v-list-item-subtitle>
            <template v-slot:append>
              <v-btn size="small" color="primary" @click="goToRecord(task)">去关爱</v-btn>
              <v-btn size="small" color="warning" @click="openPauseDialog(task)" class="ml-2">暂缓</v-btn>
            </template>
          </v-list-item>
        </v-list>
        <p v-else class="text-grey">暂无待关爱任务</p>
      </v-card-text>
    </v-card>

    <!-- 我包保的学生 -->
    <v-card class="mb-4">
      <v-card-title>我包保的学生（{{ myStudents.length }}）</v-card-title>
      <v-card-text>
        <v-table density="compact" v-if="myStudents.length > 0">
          <thead>
            <tr>
              <th>姓名</th>
              <th>类型</th>
              <th>关爱级别</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in myStudents" :key="s.id">
              <td>{{ s.name }}</td>
              <td>{{ s.condition_type }}</td>
              <td>{{ s.care_level?.level_name || '-' }}</td>
              <td>
                <v-chip :color="statusColor(s.status)" size="small">{{ statusText(s.status) }}</v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
        <p v-else class="text-grey">暂无包保学生</p>
      </v-card-text>
    </v-card>

    <!-- 本班特殊学生（班主任可见） -->
    <v-card class="mb-4" v-if="classStudents.length > 0">
      <v-card-title>本班特殊学生（{{ classStudents.length }}）</v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>姓名</th>
              <th>班级</th>
              <th>类型</th>
              <th>包保责任人</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in classStudents" :key="s.id">
              <td>{{ s.name }}</td>
              <td>{{ s.class_name }}</td>
              <td>{{ s.condition_type }}</td>
              <td>{{ s.responsible_teacher_name }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- 我的提醒 -->
    <v-card class="mb-4" v-if="myReminders.length > 0">
      <v-card-title>我的提醒（{{ myReminders.length }}）</v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item v-for="r in myReminders" :key="r.id" @click="markRead(r.id)">
            <v-list-item-title>{{ r.content }}</v-list-item-title>
            <v-list-item-subtitle>{{ formatDate(r.created_at) }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- 暂缓关爱对话框 -->
    <v-dialog v-model="pauseDialog" max-width="500">
      <v-card>
        <v-card-title>暂缓关爱申请</v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" class="mb-4">
            <strong>警告：</strong>暂缓关爱等效于在本周期计划中撤销对该学生的关爱安排，审批通过后不可撤销！
          </v-alert>
          <p class="mb-2">学生：{{ pauseForm.student_name }}</p>
          <v-textarea v-model="pauseForm.reason" label="暂缓理由" rows="3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="pauseDialog = false">取消</v-btn>
          <v-btn color="warning" @click="submitPause" :loading="pauseLoading">确认申请</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api.js'

const router = useRouter()

const academicInfo = ref({ academicYear: '', semester: 1 })
const pendingTasks = ref([])
const myStudents = ref([])
const classStudents = ref([])
const myReminders = ref([])

const pauseDialog = ref(false)
const pauseLoading = ref(false)
const pauseForm = ref({ student_id: null, student_name: '', plan_id: null, reason: '' })

function statusColor(status) {
  return { active: 'success', paused: 'warning', closed: 'grey' }[status] || 'grey'
}

function statusText(status) {
  return { active: '关爱中', paused: '已暂缓', closed: '已结案' }[status] || status
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

function goToRecord(task) {
  router.push({ path: '/records', query: { student_id: task.student_id, student_name: task.student_name } })
}

function openPauseDialog(task) {
  pauseForm.value = {
    student_id: task.student_id,
    student_name: task.student_name,
    plan_id: task.plan_id,
    reason: ''
  }
  pauseDialog.value = true
}

async function submitPause() {
  if (!pauseForm.value.reason.trim()) {
    alert('请填写暂缓理由')
    return
  }
  pauseLoading.value = true
  try {
    await api.createPauseRequest(pauseForm.value)
    alert('暂缓申请已提交，等待年级组长审批')
    pauseDialog.value = false
    await loadDashboard()
  } catch (e) {
    alert('提交失败：' + (e.response?.data?.error || e.message))
  } finally {
    pauseLoading.value = false
  }
}

async function markRead(id) {
  await api.markReminderRead(id)
  myReminders.value = myReminders.value.filter(r => r.id !== id)
}

async function loadDashboard() {
  try {
    const data = await api.getHomeDashboard()
    academicInfo.value = data.academic_info
    pendingTasks.value = data.pending_tasks
    myStudents.value = data.my_students
    classStudents.value = data.class_students
    myReminders.value = data.my_reminders
  } catch (e) {
    console.error('Failed to load dashboard:', e)
  }
}

onMounted(loadDashboard)
</script>
