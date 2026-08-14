<template>
  <v-container>
    <h2 class="text-h5 mb-4">调代课管理</h2>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-select v-model="filterStatus" :items="statusOptions" label="状态" clearable density="compact" @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-model="filterType" :items="typeOptions" label="类型" clearable density="compact" @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-model="filterRequester" :items="teachers" item-title="name" item-value="id" label="发起教师" clearable density="compact" @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" @click="dialog = true" prepend-icon="mdi-plus">发起调代课</v-btn>
      </v-col>
    </v-row>

    <!-- Stats cards -->
    <v-row class="mb-4" v-if="stats">
      <v-col cols="6" md="3">
        <v-card color="blue-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.total || 0 }}</div>
            <div class="text-caption">总申请</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="orange-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.pending || 0 }}</div>
            <div class="text-caption">待审批</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="green-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.approved || 0 }}</div>
            <div class="text-caption">已通过</div>
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

    <!-- Table -->
    <v-table density="compact">
      <thead>
        <tr>
          <th>类型</th>
          <th>发起人</th>
          <th>对方教师</th>
          <th>课程数</th>
          <th>原因</th>
          <th>状态</th>
          <th>发起时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in substitutions" :key="s.id">
          <td>
            <v-chip :color="s.type === 'swap' ? 'purple' : 'blue'" size="small" variant="outlined">
              {{ s.type === 'swap' ? '调课' : '代课' }}
            </v-chip>
          </td>
          <td>{{ s.requester_name || `教师${s.requester_id}` }}</td>
          <td>{{ s.target_teacher_name || `教师${s.target_teacher_id}` }}</td>
          <td>{{ getSnapshotCount(s) }}</td>
          <td>{{ s.reason || '-' }}</td>
          <td><v-chip :color="statusColor(s.status)" size="small">{{ statusText(s.status) }}</v-chip></td>
          <td>{{ formatDate(s.created_at) }}</td>
          <td>
            <v-btn v-if="isPending(s.status)" size="small" color="success" variant="flat" @click="approve(s)" class="mr-1">通过</v-btn>
            <v-btn v-if="isPending(s.status)" size="small" color="error" variant="outlined" @click="reject(s)">拒绝</v-btn>
          </td>
        </tr>
        <tr v-if="substitutions.length === 0">
          <td colspan="8" class="text-center text-grey py-4">暂无调代课记录</td>
        </tr>
      </tbody>
    </v-table>

    <!-- Create dialog -->
    <v-dialog v-model="dialog" max-width="650">
      <v-card>
        <v-card-title>发起调代课申请</v-card-title>
        <v-card-text>
          <v-alert v-if="form.type === 'sub'" type="info" density="compact" class="mb-3">
            代课：申请者将会减少课时，被申请者（对方）将会增加课时。
          </v-alert>
          <v-alert v-if="form.type === 'swap'" type="info" density="compact" class="mb-3">
            调课：双方互换课程，课时总量不变。双方所选课程数必须对等。
          </v-alert>

          <v-select v-model="form.type" :items="[{title:'代课',value:'sub'},{title:'调课',value:'swap'}]" label="类型" density="compact" />
          <v-select v-model="form.requester_id" :items="teachers" item-title="name" item-value="id" label="己方教师（自己）" density="compact" />
          <v-select v-model="form.target_teacher_id" :items="teachers" item-title="name" item-value="id" label="对方教师" density="compact" />
          <v-textarea v-model="form.snapshot_ids_str" label="己方快照ID（逗号分隔）" density="compact" rows="2" />
          <v-textarea v-if="form.type === 'swap'" v-model="form.target_snapshot_ids_str" label="对方快照ID（逗号分隔，数量须与己方对等）" density="compact" rows="2" />
          <v-textarea v-model="form.reason" label="原因说明" density="compact" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="submit" :loading="submitting">提交</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reject dialog -->
    <v-dialog v-model="rejectDialog" max-width="400">
      <v-card>
        <v-card-title>拒绝原因</v-card-title>
        <v-card-text>
          <v-textarea v-model="rejectComment" label="请输入拒绝原因" rows="3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="rejectDialog = false">取消</v-btn>
          <v-btn color="error" @click="confirmReject" :loading="rejecting">确认拒绝</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Error/Success snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const substitutions = ref([])
const teachers = ref([])
const stats = ref(null)
const dialog = ref(false)
const rejectDialog = ref(false)
const rejecting = ref(false)
const rejectComment = ref('')
const rejectingId = ref(null)
const submitting = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const filterStatus = ref(null)
const filterType = ref(null)
const filterRequester = ref(null)

const statusOptions = [
  { title: '待审批', value: 'pending' },
  { title: '待审批(流程)', value: 'pending_workflow' },
  { title: '已通过', value: 'approved' },
  { title: '已拒绝', value: 'rejected' },
]
const typeOptions = [
  { title: '调课', value: 'swap' },
  { title: '代课', value: 'sub' },
]

const form = ref({
  type: 'sub',
  requester_id: null,
  target_teacher_id: null,
  snapshot_ids_str: '',
  target_snapshot_ids_str: '',
  reason: '',
})

function statusColor(s) {
  return { pending: 'warning', pending_workflow: 'warning', approved: 'success', rejected: 'error' }[s] || 'grey'
}
function statusText(s) {
  return { pending: '待审批', pending_workflow: '流程审批中', approved: '已通过', rejected: '已拒绝' }[s] || s
}
function isPending(s) { return s === 'pending' || s === 'pending_workflow' }
function formatDate(d) { return d ? new Date(d).toLocaleString('zh-CN') : '-' }
function getSnapshotCount(s) {
  try {
    const ids = typeof s.snapshot_ids === 'string' ? JSON.parse(s.snapshot_ids) : s.snapshot_ids
    return Array.isArray(ids) ? ids.length : 0
  } catch { return 0 }
}

function showMsg(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

async function loadData() {
  const params = {}
  if (filterStatus.value) params.status = filterStatus.value
  if (filterType.value) params.type = filterType.value
  if (filterRequester.value) params.requester_id = filterRequester.value
  substitutions.value = await api.getSubstitutions(params)
  try { stats.value = await api.getSubstitutionStats() } catch { /* ignore */ }
}

async function submit() {
  submitting.value = true
  try {
    const snapshotIds = form.value.snapshot_ids_str.split(',').map(s => parseInt(s.trim())).filter(Boolean)
    const targetSnapshotIds = form.value.target_snapshot_ids_str
      ? form.value.target_snapshot_ids_str.split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : null

    if (snapshotIds.length === 0) {
      showMsg('必须选择至少一个己方课程快照', 'error')
      return
    }
    if (form.value.type === 'swap' && (!targetSnapshotIds || targetSnapshotIds.length !== snapshotIds.length)) {
      showMsg('调课类型要求双方所选课程数对等！', 'error')
      return
    }

    await api.createSubstitution({
      type: form.value.type,
      requester_id: form.value.requester_id,
      target_teacher_id: form.value.target_teacher_id,
      snapshot_ids: JSON.stringify(snapshotIds),
      target_snapshot_ids: targetSnapshotIds ? JSON.stringify(targetSnapshotIds) : null,
      reason: form.value.reason,
    })
    showMsg('调代课申请已提交')
    dialog.value = false
    form.value = { type: 'sub', requester_id: null, target_teacher_id: null, snapshot_ids_str: '', target_snapshot_ids_str: '', reason: '' }
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '提交失败', 'error')
  } finally {
    submitting.value = false
  }
}

async function approve(s) {
  try {
    await api.approveSubstitution(s.id)
    showMsg('审批通过，快照已更新')
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '审批失败', 'error')
  }
}

function reject(s) {
  rejectingId.value = s.id
  rejectComment.value = ''
  rejectDialog.value = true
}

async function confirmReject() {
  rejecting.value = true
  try {
    await api.rejectSubstitution(rejectingId.value, rejectComment.value)
    showMsg('已拒绝')
    rejectDialog.value = false
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '操作失败', 'error')
  } finally {
    rejecting.value = false
  }
}

onMounted(async () => {
  teachers.value = await api.getTeachers()
  await loadData()
})
</script>
