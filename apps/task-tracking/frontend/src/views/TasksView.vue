<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">任务看板</h2>
      <v-spacer />
      <v-btn-toggle v-model="viewMode" mandatory density="compact" class="mr-2">
        <v-btn value="kanban" size="small">
          <v-icon start>mdi-view-column</v-icon>看板
        </v-btn>
        <v-btn value="gantt" size="small">
          <v-icon start>mdi-chart-gantt</v-icon>甘特图
        </v-btn>
      </v-btn-toggle>
      <v-btn color="primary" @click="dialog = true">
        <v-icon start>mdi-plus</v-icon>新建任务
      </v-btn>
    </div>

    <!-- 看板视图 -->
    <div v-if="viewMode === 'kanban'">
      <v-row>
        <v-col cols="12" md="3" v-for="status in statuses" :key="status">
          <v-card :color="statusColor(status)" variant="tonal" class="mb-2">
            <v-card-title class="text-subtitle-1">
              {{ statusText(status) }}
              <v-chip size="small" class="ml-2">{{ tasksByStatus(status).length }}</v-chip>
            </v-card-title>
          </v-card>
          <v-card v-for="task in tasksByStatus(status)" :key="task.id" class="mb-2" variant="outlined">
            <v-card-text>
              <div class="font-weight-bold mb-1">{{ task.title }}</div>
              <div class="text-caption text-grey mb-2">{{ task.summary || '无摘要' }}</div>
              <div class="d-flex align-center">
                <v-chip size="x-small" class="mr-1">{{ task.school_name || '未分类' }}</v-chip>
                <v-chip v-if="task.is_field_trip" size="x-small" color="warning">外勤</v-chip>
                <v-spacer />
                <v-chip v-if="task.blocked_reason" size="x-small" color="error">阻塞</v-chip>
              </div>
              <div class="text-caption mt-2">执行人: {{ task.assignee_id }}</div>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn v-if="task.status === 'pending'" size="x-small" color="info" @click="startTask(task.id)">开始</v-btn>
              <v-btn v-if="task.status !== 'blocked' && task.status !== 'completed'" size="x-small" color="warning" @click="blockDialog = true; selectedTask = task">阻塞</v-btn>
              <v-btn v-if="task.status === 'blocked'" size="x-small" color="success" @click="unblock(task.id)">解除</v-btn>
              <v-btn v-if="task.status !== 'completed'" size="x-small" color="success" @click="complete(task.id)">完成</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- 甘特图视图 -->
    <div v-if="viewMode === 'gantt'">
      <v-card>
        <v-card-text>
          <div v-for="task in ganttTasks" :key="task.id" class="gantt-row d-flex align-center mb-1">
            <div class="gantt-label text-caption" style="width: 200px; flex-shrink: 0;">
              {{ task.title }}
            </div>
            <div class="gantt-bar flex-grow-1" style="height: 24px; background: #f5f5f5; position: relative; border-radius: 4px;">
              <div
                :style="ganttBarStyle(task)"
                class="gantt-fill"
                :title="`${task.title} - ${statusText(task.status)}`"
              ></div>
            </div>
            <v-chip size="x-small" class="ml-2" :color="statusColor(task.status)">{{ statusText(task.status) }}</v-chip>
          </div>
          <div v-if="ganttTasks.length === 0" class="text-center text-grey pa-4">暂无任务数据</div>
        </v-card-text>
      </v-card>
    </div>

    <!-- 新建任务对话框 -->
    <v-dialog v-model="dialog" max-width="700">
      <v-card>
        <v-card-title>新建任务</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.title" label="任务标题 *" />
          <v-textarea v-model="form.description" label="任务描述" rows="3" />
          <v-row>
            <v-col cols="6">
              <v-select v-model="form.school_id" :items="schools" item-title="name" item-value="id" label="学校" />
            </v-col>
            <v-col cols="6">
              <v-select v-model="form.project_id" :items="projects" item-title="name" item-value="id" label="项目" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="form.assignee_id" type="number" label="执行人ID *" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.approver_id" type="number" label="审批人ID" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-select v-model="form.priority" :items="priorityOptions" item-title="text" item-value="value" label="优先级" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.expected_completion" type="date" label="期望完成时间" />
            </v-col>
          </v-row>
          <v-checkbox v-model="form.is_field_trip" label="外勤任务" />
          <div v-if="form.is_field_trip">
            <v-row>
              <v-col cols="6">
                <v-text-field v-model="form.field_trip_date" type="date" label="占用日期 *" />
              </v-col>
              <v-col cols="6">
                <v-select v-model="form.field_trip_period" :items="['上午', '下午', '全天']" label="占用时间段" />
              </v-col>
            </v-row>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">提交审批</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 阻塞对话框 -->
    <v-dialog v-model="blockDialog" max-width="400">
      <v-card>
        <v-card-title>标记阻塞</v-card-title>
        <v-card-text>
          <v-textarea v-model="blockReason" label="阻塞原因 *" rows="3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="blockDialog = false">取消</v-btn>
          <v-btn color="warning" @click="confirmBlock">确认阻塞</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const viewMode = ref('kanban')
const tasks = ref([])
const ganttTasks = ref([])
const schools = ref([])
const projects = ref([])
const dialog = ref(false)
const blockDialog = ref(false)
const blockReason = ref('')
const selectedTask = ref(null)
const snackbar = ref({ show: false, text: '', color: 'success' })

const form = ref({
  title: '', description: '', assignee_id: '', approver_id: '',
  school_id: null, project_id: null, priority: 'normal',
  expected_completion: '', is_field_trip: false,
  field_trip_date: '', field_trip_period: ''
})

const statuses = ['pending', 'in_progress', 'blocked', 'completed']
const priorityOptions = [
  { text: '高', value: 'high' },
  { text: '普通', value: 'normal' },
  { text: '低', value: 'low' }
]

function statusColor(s) {
  return { pending: 'warning', in_progress: 'info', blocked: 'error', completed: 'success' }[s] || 'grey'
}

function statusText(s) {
  return { pending: '待处理', in_progress: '进行中', blocked: '已阻塞', completed: '已完成' }[s] || s
}

function tasksByStatus(status) {
  return tasks.value.filter(t => t.status === status)
}

function ganttBarStyle(task) {
  // 简化的甘特图条样式
  const totalDays = 30
  const created = new Date(task.start || task.created_at)
  const end = new Date(task.end || task.expected_completion || task.created_at)
  const now = new Date()
  const startOffset = Math.max(0, (created - now) / (1000 * 60 * 60 * 24))
  const duration = Math.max(1, (end - created) / (1000 * 60 * 60 * 24))
  const left = Math.min(100, (startOffset / totalDays) * 100)
  const width = Math.min(100 - left, (duration / totalDays) * 100)

  return {
    position: 'absolute',
    left: `${left}%`,
    width: `${width}%`,
    height: '100%',
    backgroundColor: { pending: '#fb8c00', in_progress: '#2196f3', blocked: '#f44336', completed: '#4caf50' }[task.status] || '#9e9e9e',
    borderRadius: '4px',
    opacity: '0.8'
  }
}

async function save() {
  try {
    await api.createTask({
      ...form.value,
      assignee_id: parseInt(form.value.assignee_id),
      creator_id: 1,
      approver_id: form.value.approver_id ? parseInt(form.value.approver_id) : null,
      school_id: form.value.school_id ? parseInt(form.value.school_id) : null,
      project_id: form.value.project_id ? parseInt(form.value.project_id) : null,
      tag_ids: []
    })
    dialog.value = false
    snackbar.value = { show: true, text: '任务已提交审批', color: 'success' }
    await loadData()
  } catch (e) {
    snackbar.value = { show: true, text: e.response?.data?.error || '创建失败', color: 'error' }
  }
}

async function startTask(id) {
  await api.updateTask(id, { status: 'in_progress' })
  await loadData()
}

async function block(id) {
  selectedTask.value = tasks.value.find(t => t.id === id)
  blockDialog.value = true
}

async function confirmBlock() {
  if (!blockReason.value) return
  await api.blockTask(selectedTask.value.id, { reason: blockReason.value })
  blockDialog.value = false
  blockReason.value = ''
  snackbar.value = { show: true, text: '任务已标记为阻塞', color: 'warning' }
  await loadData()
}

async function unblock(id) {
  await api.unblockTask(id, { resolution: '已解决' })
  snackbar.value = { show: true, text: '阻塞已解除', color: 'success' }
  await loadData()
}

async function complete(id) {
  try {
    await api.completeTask(id)
    snackbar.value = { show: true, text: '任务已完成', color: 'success' }
    await loadData()
  } catch (e) {
    snackbar.value = { show: true, text: e.response?.data?.error || '操作失败', color: 'error' }
  }
}

async function loadData() {
  const [t, g, s, p] = await Promise.all([
    api.getTasks(),
    api.getGanttData(),
    api.getSchools(),
    api.getProjects()
  ])
  tasks.value = t
  ganttTasks.value = g.tasks || []
  schools.value = s
  projects.value = p
}

onMounted(loadData)
</script>

<style scoped>
.gantt-row:hover {
  background: #f5f5f5;
}
</style>
