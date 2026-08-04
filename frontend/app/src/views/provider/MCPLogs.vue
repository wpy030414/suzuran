<template>
  <div>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4 font-weight-bold">
        <v-icon class="mr-2" color="primary">mdi-script-text-outline</v-icon>
        MCP 调用日志
      </h1>
      <v-spacer />
      <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="fetchLogs">
        刷新
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" class="mb-4" closable>{{ error }}</v-alert>

    <div v-if="loading && logs.length === 0" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <v-card v-else-if="logs.length === 0" variant="outlined" class="text-center pa-12">
      <v-icon size="64" color="grey-lighten-1">mdi-script-text-outline</v-icon>
      <p class="text-h6 mt-4 text-grey">还没有 MCP 调用记录</p>
      <p class="text-body-2 text-grey">应用通过 MCP 访问数据时，调用记录会出现在这里</p>
    </v-card>

    <v-card v-else variant="outlined">
      <v-table>
        <thead>
          <tr>
            <th>时间</th>
            <th>用户</th>
            <th>组织</th>
            <th>工具 / 操作</th>
            <th>状态</th>
            <th>请求参数</th>
            <th>来源 IP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td class="text-no-wrap">{{ formatDate(log.createdAt) }}</td>
            <td>{{ log.userId ?? '—' }}</td>
            <td>{{ log.orgId ?? '—' }}</td>
            <td class="font-monospace">{{ extractTool(log) }}</td>
            <td>
              <v-chip
                v-if="log.responseStatus"
                :color="log.responseStatus < 400 ? 'success' : 'error'"
                size="small"
                label
              >
                {{ log.responseStatus }}
              </v-chip>
              <span v-else class="text-grey">—</span>
            </td>
            <td class="text-truncate" style="max-width: 280px">
              <span class="text-caption text-grey-darken-1 font-monospace">
                {{ formatRequestData(log) }}
              </span>
            </td>
            <td class="text-caption">{{ log.ipAddress || '—' }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listAuditLogs, type AuditLogEntry } from '../../api/mcp'

const logs = ref<AuditLogEntry[]>([])
const loading = ref(false)
const error = ref('')

async function fetchLogs() {
  loading.value = true
  error.value = ''
  try {
    // Filter to MCP tool calls only.
    const resp = await listAuditLogs({ action: 'mcp_tool_call', limit: 200 })
    logs.value = resp.data.logs || []
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || '获取调用日志失败'
  } finally {
    loading.value = false
  }
}

function extractTool(log: AuditLogEntry): string {
  const rd = log.requestData as Record<string, any> | undefined
  if (!rd) return log.resourceType || log.action
  return rd.tool || rd.name || log.resourceType || log.action
}

function formatRequestData(log: AuditLogEntry): string {
  const rd = log.requestData as Record<string, any> | undefined
  if (!rd) return '—'
  const { tool, name, arguments: args, ...rest } = rd
  const preview = args || rest
  try {
    const json = JSON.stringify(preview)
    return json.length > 120 ? json.slice(0, 120) + '…' : json
  } catch {
    return '—'
  }
}

function formatDate(s: string) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString('zh-CN')
  } catch {
    return s
  }
}

onMounted(fetchLogs)
</script>

<style scoped>
.font-monospace {
  font-family: 'Consolas', 'Monaco', monospace;
}
</style>
