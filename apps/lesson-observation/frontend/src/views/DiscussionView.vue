<template>
  <v-container>
    <h2 class="text-h5 mb-4">课后研讨</h2>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-select v-model="filterAppointment" :items="appointments" item-title="topic" item-value="id" label="预约" density="compact" clearable @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" @click="dialog = true" prepend-icon="mdi-plus" block>新增研讨记录</v-btn>
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="success" @click="exportCSV" prepend-icon="mdi-download" block>导出CSV</v-btn>
      </v-col>
    </v-row>

    <!-- Table -->
    <v-table density="compact">
      <thead>
        <tr>
          <th>预约课题</th>
          <th>参与人</th>
          <th>研讨内容</th>
          <th>结论</th>
          <th>时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in enrichedDiscussions" :key="d.id">
          <td>{{ d.appointment_topic || `预约${d.appointment_id}` }}</td>
          <td>
            <v-chip v-for="(name, i) in parseParticipants(d.participants)" :key="i" size="small" class="mr-1">
              {{ name }}
            </v-chip>
          </td>
          <td>{{ d.content }}</td>
          <td>{{ d.conclusions || '-' }}</td>
          <td>{{ formatDate(d.created_at) }}</td>
        </tr>
        <tr v-if="enrichedDiscussions.length === 0">
          <td colspan="5" class="text-center text-grey py-4">暂无研讨记录</td>
        </tr>
      </tbody>
    </v-table>

    <!-- Create dialog -->
    <v-dialog v-model="dialog" max-width="700">
      <v-card>
        <v-card-title>新增研讨记录</v-card-title>
        <v-card-text>
          <v-select
            v-model="form.appointment_id"
            :items="appointments"
            item-title="topic"
            item-value="id"
            label="预约"
            density="compact"
          />
          <v-textarea
            v-model="form.participants_str"
            label="参与人ID（逗号分隔）"
            density="compact"
            rows="2"
          />
          <v-textarea v-model="form.content" label="研讨内容" rows="4" />
          <v-textarea v-model="form.conclusions" label="结论" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="submit">提交</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const discussions = ref([])
const appointments = ref([])
const dialog = ref(false)
const filterAppointment = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const form = ref({
  appointment_id: null,
  participants_str: '',
  content: '',
  conclusions: '',
})

const enrichedDiscussions = computed(() => {
  return discussions.value.map(d => ({
    ...d,
    appointment_topic: d.appointment_topic || `预约${d.appointment_id}`,
  }))
})

function parseParticipants(p) {
  if (!p) return []
  const arr = typeof p === 'string' ? JSON.parse(p) : p
  return Array.isArray(arr) ? arr : []
}

function formatDate(d) {
  return d ? new Date(d).toLocaleString('zh-CN') : '-'
}

function showMsg(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

async function loadData() {
  const params = {}
  if (filterAppointment.value) params.appointment_id = filterAppointment.value
  discussions.value = await api.getDiscussions(params)
}

async function submit() {
  if (!form.value.appointment_id || !form.value.participants_str) {
    showMsg('请填写完整信息', 'error')
    return
  }
  try {
    const participants = form.value.participants_str.split(',').map(s => parseInt(s.trim())).filter(Boolean)
    await api.createDiscussion({
      appointment_id: parseInt(form.value.appointment_id),
      participants: JSON.stringify(participants),
      content: form.value.content,
      conclusions: form.value.conclusions,
    })
    showMsg('研讨记录已提交')
    dialog.value = false
    form.value = { appointment_id: null, participants_str: '', content: '', conclusions: '' }
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '提交失败', 'error')
  }
}

async function exportCSV() {
  try {
    const params = {}
    if (filterAppointment.value) params.appointment_id = filterAppointment.value
    const result = await api.exportDiscussions(params)
    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `研讨记录_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    showMsg('导出成功')
  } catch (e) {
    showMsg(e.response?.data?.error || '导出失败', 'error')
  }
}

onMounted(async () => {
  appointments.value = await api.getAppointments()
  await loadData()
})
</script>
