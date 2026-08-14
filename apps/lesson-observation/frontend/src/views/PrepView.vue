<template>
  <v-container>
    <h2 class="text-h5 mb-4">集体备课</h2>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-text-field v-model="filterDate" type="date" label="日期" density="compact" clearable @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" @click="dialog = true" prepend-icon="mdi-plus" block>新增备课记录</v-btn>
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="success" @click="exportCSV" prepend-icon="mdi-download" block>导出CSV</v-btn>
      </v-col>
    </v-row>

    <!-- Table -->
    <v-table density="compact">
      <thead>
        <tr>
          <th>日期</th>
          <th>主题</th>
          <th>教研组</th>
          <th>参与人</th>
          <th>成果</th>
          <th>时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in enrichedRecords" :key="p.id">
          <td>{{ p.date }}</td>
          <td>{{ p.topic }}</td>
          <td>{{ p.group_name || `教研组${p.group_id}` }}</td>
          <td>
            <v-chip v-for="(name, i) in parseParticipants(p.participants)" :key="i" size="small" class="mr-1">
              {{ name }}
            </v-chip>
          </td>
          <td>{{ formatOutcomes(p.outcomes) }}</td>
          <td>{{ formatDate(p.created_at) }}</td>
        </tr>
        <tr v-if="enrichedRecords.length === 0">
          <td colspan="6" class="text-center text-grey py-4">暂无备课记录</td>
        </tr>
      </tbody>
    </v-table>

    <!-- Create dialog -->
    <v-dialog v-model="dialog" max-width="700">
      <v-card>
        <v-card-title>新增备课记录</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.group_id" type="number" label="教研组ID" density="compact" />
          <v-text-field v-model="form.date" type="date" label="日期" density="compact" />
          <v-text-field v-model="form.topic" label="主题" density="compact" />
          <v-textarea
            v-model="form.participants_str"
            label="参与人ID（逗号分隔）"
            density="compact"
            rows="2"
          />
          <v-textarea v-model="form.outcomes" label="成果（JSON格式）" rows="3" density="compact" />
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

const records = ref([])
const dialog = ref(false)
const filterDate = ref('')
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const form = ref({
  group_id: '',
  date: '',
  topic: '',
  participants_str: '',
  outcomes: '',
})

const enrichedRecords = computed(() => {
  return records.value.map(p => ({
    ...p,
    group_name: p.group_name || `教研组${p.group_id}`,
  }))
})

function parseParticipants(p) {
  if (!p) return []
  const arr = typeof p === 'string' ? JSON.parse(p) : p
  return Array.isArray(arr) ? arr : []
}

function formatOutcomes(o) {
  if (!o) return '-'
  try {
    const obj = typeof o === 'string' ? JSON.parse(o) : o
    return typeof obj === 'object' ? JSON.stringify(obj) : obj
  } catch {
    return o
  }
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
  if (filterDate.value) params.date = filterDate.value
  records.value = await api.getPrepRecords(params)
}

async function submit() {
  if (!form.value.group_id || !form.value.date || !form.value.topic) {
    showMsg('请填写完整信息', 'error')
    return
  }
  try {
    const participants = form.value.participants_str.split(',').map(s => parseInt(s.trim())).filter(Boolean)
    await api.createPrepRecord({
      group_id: parseInt(form.value.group_id),
      date: form.value.date,
      topic: form.value.topic,
      participants: JSON.stringify(participants),
      outcomes: form.value.outcomes || '{}',
    })
    showMsg('备课记录已提交')
    dialog.value = false
    form.value = { group_id: '', date: '', topic: '', participants_str: '', outcomes: '' }
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '提交失败', 'error')
  }
}

async function exportCSV() {
  try {
    const params = {}
    if (filterDate.value) params.date = filterDate.value
    const result = await api.exportPrepRecords(params)
    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `备课记录_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    showMsg('导出成功')
  } catch (e) {
    showMsg(e.response?.data?.error || '导出失败', 'error')
  }
}

onMounted(loadData)
</script>
