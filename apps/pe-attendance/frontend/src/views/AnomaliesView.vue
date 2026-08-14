<template>
  <v-container>
    <h2 class="text-h5 mb-4">异常记录</h2>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-text-field v-model="filterDate" type="date" label="日期" density="compact" clearable @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-model="filterClassroom" :items="classrooms" item-title="name" item-value="id" label="班级" density="compact" clearable @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-model="filterStatus" :items="[{title:'未处理',value:'unresolved'},{title:'已处理',value:'resolved'}]" label="状态" density="compact" clearable @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" @click="exportCSV" prepend-icon="mdi-download" block>导出CSV</v-btn>
      </v-col>
    </v-row>

    <!-- Stats -->
    <v-row class="mb-4" v-if="stats">
      <v-col cols="6" md="3">
        <v-card color="red-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.total || 0 }}</div>
            <div class="text-caption">总异常数</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="orange-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.unresolved || 0 }}</div>
            <div class="text-caption">未处理</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="green-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.resolved || 0 }}</div>
            <div class="text-caption">已处理</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="blue-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ stats.resolutionRate || 0 }}%</div>
            <div class="text-caption">处理率</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Table -->
    <v-table density="compact">
      <thead>
        <tr>
          <th>日期</th>
          <th>节次</th>
          <th>班级</th>
          <th>学生</th>
          <th>异常类型</th>
          <th>描述</th>
          <th>状态</th>
          <th>处理时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in filteredAnomalies" :key="a.id">
          <td>{{ a.date || '-' }}</td>
          <td>{{ a.slot_index || '-' }}</td>
          <td>{{ a.classroom_name || `班级${a.classroom_id}` }}</td>
          <td>{{ a.student_name || `学生${a.student_id}` }}</td>
          <td>
            <v-chip :color="a.type === 'absent' ? 'error' : 'warning'" size="small">
              {{ a.type === 'absent' ? '缺勤' : '其他' }}
            </v-chip>
          </td>
          <td>{{ a.description || '-' }}</td>
          <td>
            <v-chip :color="a.resolved ? 'success' : 'error'" size="small">
              {{ a.resolved ? '已处理' : '未处理' }}
            </v-chip>
          </td>
          <td>{{ a.resolved_at ? formatDate(a.resolved_at) : '-' }}</td>
          <td>
            <v-btn
              v-if="!a.resolved"
              size="small"
              color="success"
              variant="flat"
              @click="openResolveDialog(a)"
              prepend-icon="mdi-check"
            >
              处理
            </v-btn>
            <v-icon v-else color="success">mdi-check-circle</v-icon>
          </td>
        </tr>
        <tr v-if="filteredAnomalies.length === 0">
          <td colspan="9" class="text-center text-grey py-4">暂无异常记录</td>
        </tr>
      </tbody>
    </v-table>

    <!-- Resolve dialog -->
    <v-dialog v-model="resolveDialog" max-width="500">
      <v-card>
        <v-card-title>处理异常</v-card-title>
        <v-card-text>
          <div class="mb-3">
            <strong>学生:</strong> {{ currentAnomaly?.student_name || `学生${currentAnomaly?.student_id}` }}
          </div>
          <div class="mb-3">
            <strong>异常类型:</strong> {{ currentAnomaly?.type === 'absent' ? '缺勤' : '其他' }}
          </div>
          <v-select
            v-model="resolveForm.resolution_type"
            :items="resolutionTypes"
            label="处理方式"
            density="compact"
          />
          <v-textarea
            v-model="resolveForm.remark"
            label="备注说明"
            density="compact"
            rows="3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="resolveDialog = false">取消</v-btn>
          <v-btn color="success" @click="submitResolve" :loading="resolving">确认处理</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const anomalies = ref([])
const classrooms = ref([])
const stats = ref(null)
const filterDate = ref('')
const filterClassroom = ref(null)
const filterStatus = ref(null)
const resolveDialog = ref(false)
const currentAnomaly = ref(null)
const resolving = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const resolutionTypes = [
  { title: '已补假条', value: 'leave_slip' },
  { title: '已联系家长', value: 'parent_contacted' },
  { title: '已补考勤', value: 'attendance_corrected' },
  { title: '其他', value: 'other' },
]

const resolveForm = ref({
  resolution_type: '',
  remark: '',
})

const filteredAnomalies = computed(() => {
  let result = anomalies.value
  if (filterDate.value) {
    result = result.filter(a => a.date === filterDate.value)
  }
  if (filterClassroom.value) {
    result = result.filter(a => a.classroom_id === filterClassroom.value)
  }
  if (filterStatus.value === 'resolved') {
    result = result.filter(a => a.resolved)
  } else if (filterStatus.value === 'unresolved') {
    result = result.filter(a => !a.resolved)
  }
  return result
})

function formatDate(d) {
  return d ? new Date(d).toLocaleString('zh-CN') : '-'
}

function showMsg(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

function openResolveDialog(anomaly) {
  currentAnomaly.value = anomaly
  resolveForm.value = { resolution_type: '', remark: '' }
  resolveDialog.value = true
}

async function loadData() {
  const params = {}
  if (filterDate.value) params.date = filterDate.value
  if (filterClassroom.value) params.classroom_id = filterClassroom.value
  anomalies.value = await api.getAnomalies(params)
  try {
    stats.value = await api.getAnomalyStats()
  } catch { /* ignore */ }
}

async function submitResolve() {
  if (!resolveForm.value.resolution_type) {
    showMsg('请选择处理方式', 'error')
    return
  }
  resolving.value = true
  try {
    await api.resolveAnomaly(currentAnomaly.value.id, {
      resolution_type: resolveForm.value.resolution_type,
      remark: resolveForm.value.remark,
      resolved: true,
      resolved_at: new Date().toISOString(),
    })
    showMsg('异常已处理')
    resolveDialog.value = false
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '处理失败', 'error')
  } finally {
    resolving.value = false
  }
}

async function exportCSV() {
  try {
    const params = {}
    if (filterDate.value) params.date = filterDate.value
    if (filterClassroom.value) params.classroom_id = filterClassroom.value
    const result = await api.exportAnomalies(params)
    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `异常记录_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    showMsg('导出成功')
  } catch (e) {
    showMsg(e.response?.data?.error || '导出失败', 'error')
  }
}

onMounted(async () => {
  classrooms.value = await api.getClassrooms()
  await loadData()
})
</script>
