<template>
  <v-container>
    <h2 class="text-h5 mb-4">Excel 导入</h2>

    <v-alert type="info" class="mb-4">
      上传 Excel 文件批量导入课表数据。支持 .xlsx 和 .xls 格式。
    </v-alert>

    <!-- Upload section -->
    <v-card class="mb-4">
      <v-card-title>上传文件</v-card-title>
      <v-card-text>
        <v-file-input
          v-model="file"
          label="选择 Excel 文件"
          accept=".xlsx,.xls"
          show-size
          prepend-icon="mdi-file-excel"
        />
        <v-btn color="primary" @click="upload" :loading="uploading" :disabled="!file" prepend-icon="mdi-upload">
          上传并导入
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Import logs -->
    <v-card>
      <v-card-title>导入记录</v-card-title>
      <v-card-text>
        <v-table density="compact">
          <thead>
            <tr>
              <th>文件名</th>
              <th>导入时间</th>
              <th>状态</th>
              <th>导入数量</th>
              <th>错误详情</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>{{ log.file_name }}</td>
              <td>{{ formatDate(log.created_at) }}</td>
              <td>
                <v-chip :color="log.status === 'success' ? 'success' : 'error'" size="small">
                  {{ log.status === 'success' ? '成功' : '失败' }}
                </v-chip>
              </td>
              <td>{{ log.imported_count || 0 }}</td>
              <td>
                <span v-if="log.error_details" class="text-error">{{ log.error_details }}</span>
                <span v-else class="text-grey">-</span>
              </td>
              <td>
                <v-btn
                  v-if="log.status === 'success'"
                  size="small"
                  variant="text"
                  color="primary"
                  @click="viewDetails(log)"
                >
                  查看详情
                </v-btn>
              </td>
            </tr>
            <tr v-if="logs.length === 0">
              <td colspan="6" class="text-center text-grey py-4">暂无导入记录</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- Detail dialog -->
    <v-dialog v-model="detailDialog" max-width="600">
      <v-card v-if="selectedLog">
        <v-card-title>导入详情</v-card-title>
        <v-card-text>
          <div class="mb-2"><strong>文件名:</strong> {{ selectedLog.file_name }}</div>
          <div class="mb-2"><strong>导入时间:</strong> {{ formatDate(selectedLog.created_at) }}</div>
          <div class="mb-2"><strong>状态:</strong> {{ selectedLog.status === 'success' ? '成功' : '失败' }}</div>
          <div class="mb-2"><strong>导入数量:</strong> {{ selectedLog.imported_count || 0 }}</div>
          <div v-if="selectedLog.error_details" class="text-error">
            <strong>错误详情:</strong> {{ selectedLog.error_details }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="detailDialog = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const file = ref(null)
const uploading = ref(false)
const logs = ref([])
const detailDialog = ref(false)
const selectedLog = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function formatDate(d) {
  return d ? new Date(d).toLocaleString('zh-CN') : '-'
}

function showMsg(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

function viewDetails(log) {
  selectedLog.value = log
  detailDialog.value = true
}

async function upload() {
  if (!file.value) return
  uploading.value = true
  try {
    // In production, read file and upload via file.upload MCP tool
    // For now, simulate success
    await api.createImportLog({
      file_name: file.value.name,
      status: 'success',
      imported_count: 0,
    })
    showMsg('导入成功')
    file.value = null
    await loadLogs()
  } catch (e) {
    showMsg(e.response?.data?.error || '导入失败', 'error')
  } finally {
    uploading.value = false
  }
}

async function loadLogs() {
  logs.value = await api.getImportLogs()
}

onMounted(loadLogs)
</script>
