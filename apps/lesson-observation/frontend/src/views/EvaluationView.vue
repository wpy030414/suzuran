<template>
  <v-container>
    <h2 class="text-h5 mb-4">评课量表</h2>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-select v-model="filterAppointment" :items="appointments" item-title="topic" item-value="id" label="预约" density="compact" clearable @update:model-value="loadData" />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" @click="evalDialog = true" prepend-icon="mdi-plus" block>填写评课</v-btn>
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="secondary" @click="scaleDialog = true" prepend-icon="mdi-scale-balance" block>管理量表</v-btn>
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="success" @click="exportCSV" prepend-icon="mdi-download" block>导出CSV</v-btn>
      </v-col>
    </v-row>

    <!-- Stats -->
    <v-row class="mb-4" v-if="evalStats">
      <v-col cols="6" md="3">
        <v-card color="blue-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ evalStats.total || 0 }}</div>
            <div class="text-caption">总评课数</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="green-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ evalStats.avgScore || 0 }}</div>
            <div class="text-caption">平均分</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="purple-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ evalStats.maxScore || 0 }}</div>
            <div class="text-caption">最高分</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card color="orange-lighten-5">
          <v-card-text class="text-center">
            <div class="text-h4">{{ evalStats.minScore || 0 }}</div>
            <div class="text-caption">最低分</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Evaluations table -->
    <v-table density="compact">
      <thead>
        <tr>
          <th>预约课题</th>
          <th>评课人</th>
          <th>量表</th>
          <th>总分</th>
          <th>评语</th>
          <th>时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="e in enrichedEvaluations" :key="e.id">
          <td>{{ e.appointment_topic || `预约${e.appointment_id}` }}</td>
          <td>{{ e.evaluator_name || `教师${e.evaluator_id}` }}</td>
          <td>{{ e.scale_name || `量表${e.scale_id}` }}</td>
          <td>
            <v-chip :color="getScoreColor(e.total_score)" size="small">
              {{ e.total_score }}
            </v-chip>
          </td>
          <td>{{ e.comments || '-' }}</td>
          <td>{{ formatDate(e.created_at) }}</td>
        </tr>
        <tr v-if="enrichedEvaluations.length === 0">
          <td colspan="6" class="text-center text-grey py-4">暂无评课记录</td>
        </tr>
      </tbody>
    </v-table>

    <!-- Evaluation dialog -->
    <v-dialog v-model="evalDialog" max-width="700">
      <v-card>
        <v-card-title>填写评课</v-card-title>
        <v-card-text>
          <v-select
            v-model="evalForm.appointment_id"
            :items="appointments"
            item-title="topic"
            item-value="id"
            label="预约"
            density="compact"
          />
          <v-text-field v-model="evalForm.evaluator_id" type="number" label="评课人ID" density="compact" />
          <v-select
            v-model="evalForm.scale_id"
            :items="scales"
            item-title="name"
            item-value="id"
            label="量表"
            density="compact"
          />
          <v-text-field
            v-model="evalForm.total_score"
            type="number"
            label="总分"
            density="compact"
            :rules="[v => v >= 0 && v <= 100 || '0-100']"
          />
          <v-textarea v-model="evalForm.comments" label="评语" rows="3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="evalDialog = false">取消</v-btn>
          <v-btn color="primary" @click="submitEval">提交</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Scale dialog -->
    <v-dialog v-model="scaleDialog" max-width="600">
      <v-card>
        <v-card-title>管理量表</v-card-title>
        <v-card-text>
          <v-text-field v-model="scaleForm.name" label="量表名称" density="compact" />
          <v-textarea
            v-model="scaleForm.dimensions"
            label="维度（JSON格式）"
            rows="5"
            density="compact"
          />
          <v-alert type="info" density="compact" class="mt-2">
            示例: [{"name":"教学目标","score":20},{"name":"教学内容","score":20},...]
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="scaleDialog = false">取消</v-btn>
          <v-btn color="primary" @click="submitScale">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const evaluations = ref([])
const appointments = ref([])
const scales = ref([])
const evalStats = ref(null)
const evalDialog = ref(false)
const scaleDialog = ref(false)
const filterAppointment = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const evalForm = ref({
  appointment_id: null,
  evaluator_id: '',
  scale_id: null,
  total_score: '',
  comments: '',
})

const scaleForm = ref({
  name: '',
  dimensions: '[]',
})

const enrichedEvaluations = computed(() => {
  return evaluations.value.map(e => ({
    ...e,
    appointment_topic: e.appointment_topic || `预约${e.appointment_id}`,
    evaluator_name: e.evaluator_name || `教师${e.evaluator_id}`,
    scale_name: e.scale_name || `量表${e.scale_id}`,
  }))
})

function getScoreColor(score) {
  if (score >= 90) return 'success'
  if (score >= 75) return 'info'
  if (score >= 60) return 'warning'
  return 'error'
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
  evaluations.value = await api.getEvaluations(params)
  try {
    evalStats.value = await api.getEvaluationStats(params)
  } catch { /* ignore */ }
}

async function submitEval() {
  if (!evalForm.value.appointment_id || !evalForm.value.evaluator_id || !evalForm.value.scale_id) {
    showMsg('请填写完整信息', 'error')
    return
  }
  try {
    await api.createEvaluation({
      appointment_id: parseInt(evalForm.value.appointment_id),
      evaluator_id: parseInt(evalForm.value.evaluator_id),
      scale_id: parseInt(evalForm.value.scale_id),
      total_score: parseFloat(evalForm.value.total_score),
      comments: evalForm.value.comments,
      scores: '{}',
    })
    showMsg('评课已提交')
    evalDialog.value = false
    evalForm.value = { appointment_id: null, evaluator_id: '', scale_id: null, total_score: '', comments: '' }
    await loadData()
  } catch (e) {
    showMsg(e.response?.data?.error || '提交失败', 'error')
  }
}

async function submitScale() {
  if (!scaleForm.value.name) {
    showMsg('请填写量表名称', 'error')
    return
  }
  try {
    await api.createScale({
      name: scaleForm.value.name,
      dimensions: scaleForm.value.dimensions,
    })
    showMsg('量表已保存')
    scaleDialog.value = false
    scaleForm.value = { name: '', dimensions: '[]' }
    // Reload scales
    scales.value = await api.getScales()
  } catch (e) {
    showMsg(e.response?.data?.error || '保存失败', 'error')
  }
}

async function exportCSV() {
  try {
    const params = {}
    if (filterAppointment.value) params.appointment_id = filterAppointment.value
    const result = await api.exportEvaluations(params)
    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `评课记录_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    showMsg('导出成功')
  } catch (e) {
    showMsg(e.response?.data?.error || '导出失败', 'error')
  }
}

onMounted(async () => {
  appointments.value = await api.getAppointments()
  scales.value = await api.getScales()
  await loadData()
})
</script>
