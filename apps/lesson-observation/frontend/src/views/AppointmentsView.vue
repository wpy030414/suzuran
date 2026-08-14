<template>
  <v-container>
    <h2 class="text-h5 mb-4">听课预约</h2>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-select v-model="filterStatus" :items="statusOptions" label="状态" clearable density="compact" @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="filterDate" type="date" label="日期" density="compact" clearable @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="search" label="搜索课题" density="compact" clearable prepend-inner-icon="mdi-magnify" />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" @click="dialog = true" prepend-icon="mdi-plus" block>发起预约</v-btn>
      </v-col>
    </v-row>

    <!-- Table -->
    <v-table density="compact">
      <thead>
        <tr>
          <th>流水号</th>
          <th>授课课题</th>
          <th>授课教师</th>
          <th>听课教师</th>
          <th>时间</th>
          <th>地点</th>
          <th>附件</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in filteredAppointments" :key="a.id">
          <td><code>{{ a.serial_number }}</code></td>
          <td>{{ a.topic }}</td>
          <td>{{ a.teacher_name || `教师${a.teacher_id}` }}</td>
          <td>
            <v-chip v-for="(name, i) in parseObserverNames(a.observer_names)" :key="i" size="small" class="mr-1">{{ name }}</v-chip>
          </td>
          <td>
            <div>{{ a.time_description || `${a.date} 第${a.slot_index}节` }}</div>
          </td>
          <td>{{ a.classroom_name || '-' }}</td>
          <td>
            <v-icon v-if="a.has_attachment" color="primary">mdi-paperclip</v-icon>
            <span v-else class="text-grey">-</span>
          </td>
          <td>
            <v-chip :color="statusColor(a.status)" size="small">{{ statusText(a.status) }}</v-chip>
          </td>
          <td>
            <v-btn v-if="isAdmin && isPending(a.status)" size="small" color="success" variant="flat" @click="approve(a)" class="mr-1">通过</v-btn>
            <v-btn v-if="isAdmin && isPending(a.status)" size="small" color="error" variant="outlined" @click="reject(a)">拒绝</v-btn>
          </td>
        </tr>
        <tr v-if="filteredAppointments.length === 0">
          <td colspan="9" class="text-center text-grey py-4">暂无预约记录</td>
        </tr>
      </tbody>
    </v-table>

    <!-- Create dialog -->
    <v-dialog v-model="dialog" max-width="700">
      <v-card>
        <v-card-title>发起听课预约</v-card-title>
        <v-card-text>
          <v-alert type="info" density="compact" class="mb-3">
            审批通过后，系统将为每位听课教师自动生成听课任务和研讨任务。
            <strong>上传附件的预约视为资料审阅型，不派发任务。</strong>
          </v-alert>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.topic" label="授课课题" density="compact" :rules="[v => !!v || '必填']" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.subject" label="科目" density="compact" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.teacher_id" type="number" label="授课教师ID" density="compact" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.teacher_name" label="授课教师姓名" density="compact" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.date" type="date" label="日期" density="compact" />
            </v-col>
            <v-col cols="12" md="3">
              <v-select v-model="form.period" :items="[{title:'上午',value:'AM'},{title:'下午',value:'PM'}]" label="半日" density="compact" />
            </v-col>
            <v-col cols="12" md="3">
              <v-text-field v-model="form.slot_index" type="number" label="节次" density="compact" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.classroom_name" label="地点/班级" density="compact" />
            </v-col>
            <v-col cols="12" md="6">
              <v-textarea v-model="form.observer_ids_str" label="听课教师ID（逗号分隔）" density="compact" rows="2" />
            </v-col>
          </v-row>
          <v-checkbox v-model="form.has_attachment" label="上传附件（资料审阅型，不派发任务）" density="compact" />

          <!-- Preview time description -->
          <v-alert v-if="form.date && form.period && form.slot_index" type="success" density="compact" class="mt-2">
            时间: {{ form.date }}{{ form.period === 'AM' ? '上午' : '下午' }}第{{ form.slot_index }}节课
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="submit" :loading="submitting">提交</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const appointments = ref([])
const filterStatus = ref(null)
const filterDate = ref('')
const search = ref('')
const dialog = ref(false)
const submitting = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Simulated admin flag
const isAdmin = ref(true)

const statusOptions = [
  { title: '待审批', value: 'pending' },
  { title: '已通过', value: 'approved' },
  { title: '已拒绝', value: 'rejected' },
]

const form = ref({
  topic: '',
  teacher_id: '',
  teacher_name: '',
  subject: '',
  date: '',
  period: 'AM',
  slot_index: '',
  classroom_name: '',
  observer_ids_str: '',
  has_attachment: false,
})

const filteredAppointments = computed(() => {
  let result = appointments.value
  if (filterStatus.value) result = result.filter(a => a.status === filterStatus.value)
  if (filterDate.value) result = result.filter(a => a.date === filterDate.value)
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter(a => (a.topic || '').toLowerCase().includes(s))
  }
  return result
})

function statusColor(s) {
  return { pending: 'warning', pending_workflow: 'warning', approved: 'success', rejected: 'error', cancelled: 'grey' }[s] || 'grey'
}
function statusText(s) {
  return { pending: '待审批', pending_workflow: '流程审批中', approved: '已通过', rejected: '已拒绝', cancelled: '已取消' }[s] || s
}
function isPending(s) { return s === 'pending' || s === 'pending_workflow' }

function parseObserverNames(names) {
  if (!names) return []
  const arr = typeof names === 'string' ? JSON.parse(names) : names
  return Array.isArray(arr) ? arr : []
}

function showMsg(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

async function loadData() {
  const params = {}
  if (filterStatus.value) params.status = filterStatus.value
  if (filterDate.value) params.date = filterDate.value
  appointments.value = await api.getAppointments(params)
}

async function submit() {
  if (!form.value.topic || !form.value.teacher_id || !form.value.observer_ids_str) {
    showMsg('请填写课题、授课教师和听课教师', 'error')
    return
  }

  submitting.value = true
  try {
    const observerIds = form.value.observer_ids_str.split(',').map(s => parseInt(s.trim())).filter(Boolean)
    if (observerIds.length === 0) {
      showMsg('必须选择至少一位听课教师', 'error')
      return
    }

    await api.createAppointment({
      topic: form.value.topic,
      teacher_id: parseInt(form.value.teacher_id),
      teacher_name: form.value.teacher_name,
      subject: form.value.subject,
      date: form.value.date,
      period: form.value.period,
      slot_index: parseInt(form.value.slot_index),
      classroom_name: form.value.classroom_name,
      observer_ids: JSON.stringify(observerIds),
      has_attachment: form.value.has_attachment,
    })

    showMsg('预约已提交，等待审批')
    dialog.value = false
    form.value = {
      topic: '', teacher_id: '', teacher_name: '', subject: '',
      date: '', period: 'AM', slot_index: '', classroom_name: '',
      observer_ids_str: '', has_attachment: false,
    }
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}

async function approve(a) {
  try {
    const result = await api.approveAppointment(a.id)
    showMsg(result.tasks_dispatched ? '已通过，任务已派发' : '已通过（资料审阅型，未派发任务）')
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '操作失败', 'error')
  }
}

async function reject(a) {
  if (!confirm('确定拒绝此预约？')) return
  try {
    await api.rejectAppointment(a.id)
    showMsg('已拒绝')
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '操作失败', 'error')
  }
}

onMounted(loadData)
</script>
