<template>
  <v-container>
    <h2 class="text-h5 mb-4">调代课中心</h2>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" class="mb-4">
      <v-tab value="all">全部</v-tab>
      <v-tab value="initiated">我发起的</v-tab>
      <v-tab value="pending">待我确认</v-tab>
    </v-tabs>

    <!-- Stats -->
    <v-row class="mb-4" v-if="stats">
      <v-col cols="6" md="3">
        <v-card color="blue-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.total || 0 }}</div>
            <div class="text-caption">总记录</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="orange-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.pending || 0 }}</div>
            <div class="text-caption">待确认</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="green-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.confirmed || 0 }}</div>
            <div class="text-caption">已确认</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="red-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.rejected || 0 }}</div>
            <div class="text-caption">已拒绝</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-btn color="primary" @click="dialog = true" class="mb-4" prepend-icon="mdi-plus">发起调代课</v-btn>

    <!-- Table -->
    <v-table density="compact">
      <thead>
        <tr>
          <th>类型</th>
          <th>日期</th>
          <th>节次</th>
          <th>班级</th>
          <th>原教师</th>
          <th>替代教师</th>
          <th>发起人</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in filteredSubstitutions" :key="s.id">
          <td>
            <v-chip :color="s.type === 'swap' ? 'purple' : 'blue'" size="small" variant="outlined">
              {{ s.type === 'swap' ? '调课' : '代课' }}
            </v-chip>
          </td>
          <td>{{ s.date }}</td>
          <td>{{ s.slot_index }}</td>
          <td>{{ s.classroom_id }}</td>
          <td>{{ s.original_teacher_name || `教师${s.original_teacher_id}` }}</td>
          <td>{{ s.replacement_teacher_name || `教师${s.replacement_teacher_id}` }}</td>
          <td>{{ s.initiator_name || `教师${s.initiator_id}` }}</td>
          <td>
            <v-chip :color="statusColor(s.status)" size="small">{{ statusText(s.status) }}</v-chip>
          </td>
          <td>
            <v-btn v-if="canConfirm(s)" size="small" color="success" variant="flat" @click="confirmSub(s)" class="mr-1">确认</v-btn>
            <v-btn v-if="canConfirm(s)" size="small" color="error" variant="outlined" @click="rejectSub(s)" class="mr-1">拒绝</v-btn>
            <v-btn v-if="canCancel(s)" size="small" color="warning" variant="text" @click="cancelSub(s)">撤销</v-btn>
          </td>
        </tr>
        <tr v-if="filteredSubstitutions.length === 0">
          <td colspan="9" class="text-center text-grey py-4">暂无调代课记录</td>
        </tr>
      </tbody>
    </v-table>

    <!-- Create dialog -->
    <v-dialog v-model="dialog" max-width="650">
      <v-card>
        <v-card-title>发起调代课</v-card-title>
        <v-card-text>
          <v-alert v-if="form.type === 'sub'" type="info" density="compact" class="mb-3">
            代课：由替代教师接替原教师的课程。
          </v-alert>
          <v-alert v-if="form.type === 'swap'" type="info" density="compact" class="mb-3">
            调课：双方互换各自某一节课。
          </v-alert>

          <v-select v-model="form.type" :items="[{title:'代课',value:'sub'},{title:'调课',value:'swap'}]" label="类型" density="compact" />
          <v-select v-model="form.classroom_id" :items="classrooms" item-title="name" item-value="id" label="班级" density="compact" />
          <v-text-field v-model="form.date" type="date" label="日期" density="compact" />
          <v-text-field v-model="form.slot_index" type="number" label="节次" density="compact" />
          <v-select v-model="form.original_teacher_id" :items="teachers" item-title="name" item-value="id" label="原教师" density="compact" />
          <v-select v-model="form.replacement_teacher_id" :items="teachers" item-title="name" item-value="id" label="替代教师（您自己）" density="compact" />
          <v-textarea v-model="form.reason" label="原因说明" density="compact" rows="2" />

          <!-- Swap-specific fields -->
          <template v-if="form.type === 'swap'">
            <v-divider class="my-3" />
            <div class="text-subtitle-2 mb-2">对调课程信息</div>
            <v-select v-model="form.swap_classroom_id" :items="classrooms" item-title="name" item-value="id" label="对调班级" density="compact" />
            <v-text-field v-model="form.swap_date" type="date" label="对调日期" density="compact" />
            <v-text-field v-model="form.swap_slot_index" type="number" label="对调节次" density="compact" />
            <v-select v-model="form.swap_teacher_id" :items="teachers" item-title="name" item-value="id" label="对调教师" density="compact" />
          </template>
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

const activeTab = ref('all')
const substitutions = ref([])
const classrooms = ref([])
const teachers = ref([])
const stats = ref(null)
const dialog = ref(false)
const submitting = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// Simulated current user (in production, from auth context)
const currentUserId = ref(1)

const form = ref({
  type: 'sub',
  classroom_id: null,
  date: '',
  slot_index: null,
  original_teacher_id: null,
  replacement_teacher_id: null,
  reason: '',
  swap_classroom_id: null,
  swap_date: '',
  swap_slot_index: null,
  swap_teacher_id: null,
})

const filteredSubstitutions = computed(() => {
  if (activeTab.value === 'initiated') {
    return substitutions.value.filter(s => s.initiator_id === currentUserId.value)
  }
  if (activeTab.value === 'pending') {
    return substitutions.value.filter(s => {
      if (s.status !== 'pending') return false
      if (s.type === 'sub') return s.original_teacher_id === currentUserId.value
      if (s.type === 'swap') return s.swap_teacher_id === currentUserId.value
      return false
    })
  }
  return substitutions.value
})

function statusColor(s) {
  return { pending: 'warning', confirmed: 'success', rejected: 'error', cancelled: 'grey' }[s] || 'grey'
}
function statusText(s) {
  return { pending: '待确认', confirmed: '已确认', rejected: '已拒绝', cancelled: '已撤销' }[s] || s
}

function canConfirm(s) {
  if (s.status !== 'pending') return false
  if (s.type === 'sub') return s.original_teacher_id === currentUserId.value
  if (s.type === 'swap') return s.swap_teacher_id === currentUserId.value
  return false
}

function canCancel(s) {
  return s.initiator_id === currentUserId.value && s.status !== 'rejected' && s.status !== 'cancelled'
}

function showMsg(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

async function loadData() {
  substitutions.value = await api.getSubstitutions()
  try { stats.value = await api.getSubstitutionStats() } catch { /* ignore */ }
}

async function submit() {
  submitting.value = true
  try {
    const data = {
      ...form.value,
      initiator_id: currentUserId.value,
      status: 'pending',
    }
    await api.createSubstitution(data)
    showMsg('调代课申请已提交')
    dialog.value = false
    form.value = {
      type: 'sub', classroom_id: null, date: '', slot_index: null,
      original_teacher_id: null, replacement_teacher_id: null, reason: '',
      swap_classroom_id: null, swap_date: '', swap_slot_index: null, swap_teacher_id: null,
    }
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}

async function confirmSub(s) {
  try {
    await api.confirmSubstitution(s.id, currentUserId.value)
    showMsg('已确认')
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '操作失败', 'error')
  }
}

async function rejectSub(s) {
  if (!confirm('确定拒绝此调代课申请？')) return
  try {
    await api.rejectSubstitution(s.id)
    showMsg('已拒绝')
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '操作失败', 'error')
  }
}

async function cancelSub(s) {
  if (!confirm('确定撤销此调代课申请？')) return
  try {
    await api.cancelSubstitution(s.id, currentUserId.value)
    showMsg('已撤销')
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '操作失败', 'error')
  }
}

onMounted(async () => {
  const [c, t] = await Promise.all([api.getClassrooms(), api.getTeachers()])
  classrooms.value = c
  teachers.value = t
  await loadData()
})
</script>
