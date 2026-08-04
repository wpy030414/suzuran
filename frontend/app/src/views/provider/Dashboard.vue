<!-- frontend/app/src/views/provider/Dashboard.vue -->
<template>
  <div>
    <h1 class="text-h4 mb-4">仪表盘</h1>

    <!-- System Monitoring Section -->
    <v-row class="mb-6">
      <v-col cols="12">
        <h2 class="text-h5 mb-3">服务端运行情况</h2>
      </v-col>

      <!-- Memory Usage Card -->
      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center mb-2">
              <v-icon size="32" color="primary" class="mr-2">mdi-memory</v-icon>
              <span class="text-h6">内存使用</span>
            </div>
            <v-progress-linear
              :model-value="memoryUsagePercent"
              :color="getMemoryColor(memoryUsagePercent)"
              height="20"
              rounded
              class="mb-2"
            >
              <template v-slot:default="{ value }">
                <strong>{{ Math.round(value) }}%</strong>
              </template>
            </v-progress-linear>
            <div class="text-caption text-grey">
              {{ formatBytes(systemMetrics.memoryUsage) }} / {{ formatBytes(systemMetrics.memoryTotal) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Disk Usage Card -->
      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center mb-2">
              <v-icon size="32" color="secondary" class="mr-2">mdi-harddisk</v-icon>
              <span class="text-h6">磁盘使用</span>
            </div>
            <v-progress-linear
              :model-value="diskUsagePercent"
              :color="getDiskColor(diskUsagePercent)"
              height="20"
              rounded
              class="mb-2"
            >
              <template v-slot:default="{ value }">
                <strong>{{ Math.round(value) }}%</strong>
              </template>
            </v-progress-linear>
            <div class="text-caption text-grey">
              {{ formatBytes(systemMetrics.diskUsage) }} / {{ formatBytes(systemMetrics.diskTotal) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Database Pressure Card -->
      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center mb-2">
              <v-icon size="32" color="info" class="mr-2">mdi-database</v-icon>
              <span class="text-h6">数据库连接</span>
            </div>
            <v-progress-linear
              :model-value="dbConnectionPercent"
              :color="getDbColor(dbConnectionPercent)"
              height="20"
              rounded
              class="mb-2"
            >
              <template v-slot:default>
                <strong v-if="dbMetrics.maxOpenConns > 0">{{ dbMetrics.inUse }} / {{ dbMetrics.maxOpenConns }}</strong>
                <strong v-else>{{ dbMetrics.inUse }} (无限制)</strong>
              </template>
            </v-progress-linear>
            <div class="text-caption text-grey">
              活跃: {{ dbMetrics.activeConnections }}, 空闲: {{ dbMetrics.idleConnections }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Additional System Info -->
    <v-row class="mb-6">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-cpu-64-bit</v-icon>
                </template>
                <v-list-item-title>CPU 核心数</v-list-item-title>
                <template v-slot:append>
                  <v-chip color="primary" size="small">{{ systemMetrics.cpuCores }}</v-chip>
                </template>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="success">mdi-application</v-icon>
                </template>
                <v-list-item-title>Goroutine 数量</v-list-item-title>
                <template v-slot:append>
                  <v-chip color="success" size="small">{{ systemMetrics.goroutineCount }}</v-chip>
                </template>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="warning">mdi-clock-outline</v-icon>
                </template>
                <v-list-item-title>运行时间</v-list-item-title>
                <template v-slot:append>
                  <v-chip color="warning" size="small">{{ systemMetrics.uptime || 'N/A' }}</v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="info">mdi-database-outline</v-icon>
                </template>
                <v-list-item-title>最大连接数</v-list-item-title>
                <template v-slot:append>
                  <v-chip color="info" size="small">{{ dbMetrics.maxOpenConns > 0 ? dbMetrics.maxOpenConns : '无限制' }}</v-chip>
                </template>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="error">mdi-timer-sand</v-icon>
                </template>
                <v-list-item-title>等待次数</v-list-item-title>
                <template v-slot:append>
                  <v-chip color="error" size="small">{{ dbMetrics.waitCount || 0 }}</v-chip>
                </template>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="secondary">mdi-update</v-icon>
                </template>
                <v-list-item-title>最后更新</v-list-item-title>
                <template v-slot:append>
                  <v-chip color="secondary" size="small">{{ lastUpdateTime }}</v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Backend Logs Section -->
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-2">
          <h2 class="text-h5">后端运行日志</h2>
          <v-spacer></v-spacer>
          <v-select
            v-model="logLevelFilter"
            :items="['DEBUG', 'INFO', 'WARN', 'ERROR']"
            label="日志级别"
            density="compact"
            variant="outlined"
            hide-details
            style="width: 120px; margin-right: 8px"
          />
          <v-select
            v-model="logLimit"
            :items="[100, 200, 500]"
            label="显示条数"
            density="compact"
            variant="outlined"
            hide-details
            style="width: 120px"
            @update:model-value="fetchLogs"
          />
        </div>
        <div class="terminal-container">
          <div class="terminal-output" ref="terminalRef">
            <div v-for="(log, index) in filteredLogs" :key="index" class="terminal-line">
              <span class="terminal-time">{{ formatTerminalTime(log.timestamp) }}</span>
              <span :class="getTerminalLevelClass(log.level)" class="terminal-level">{{ log.level.toUpperCase() }}</span>
              <span class="terminal-message">{{ log.message }}</span>
            </div>
            <div v-if="filteredLogs.length === 0" class="terminal-empty text-grey">
              暂无符合条件的日志
            </div>
          </div>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import axios from 'axios'

interface SystemMetrics {
  memoryUsage: number
  memoryTotal: number
  diskUsage: number
  diskTotal: number
  cpuCores: number
  goroutineCount: number
  uptime: string
  timestamp: string
}

interface DatabaseMetrics {
  activeConnections: number
  idleConnections: number
  maxOpenConns: number
  openConnections: number
  inUse: number
  idle: number
  waitCount: number
  waitDuration: string
  maxIdleClosed: number
  maxLifetimeClosed: number
}

interface LogEntry {
  timestamp: string
  level: string
  message: string
  context?: string
}

const systemMetrics = ref<SystemMetrics>({
  memoryUsage: 0,
  memoryTotal: 0,
  diskUsage: 0,
  diskTotal: 0,
  cpuCores: 0,
  goroutineCount: 0,
  uptime: '',
  timestamp: ''
})

const dbMetrics = ref<DatabaseMetrics>({
  activeConnections: 0,
  idleConnections: 0,
  maxOpenConns: 0,
  openConnections: 0,
  inUse: 0,
  idle: 0,
  waitCount: 0,
  waitDuration: '',
  maxIdleClosed: 0,
  maxLifetimeClosed: 0
})

const recentLogs = ref<LogEntry[]>([])
const loadingLogs = ref(false)
const lastUpdateTime = ref('')
const logLimit = ref(100)
const logLevelFilter = ref('INFO')
const terminalRef = ref<HTMLDivElement | null>(null)
let metricsInterval: number | null = null
let logsInterval: number | null = null

// Filter logs by level (hierarchical: DEBUG < INFO < WARN < ERROR)
const filteredLogs = computed(() => {
  const levelOrder: Record<string, number> = { 'DEBUG': 0, 'INFO': 1, 'WARN': 2, 'ERROR': 3 }

  const filterLevel = levelOrder[logLevelFilter.value] ?? 1
  return recentLogs.value.filter(log => {
    const logLevel = levelOrder[log.level.toUpperCase()] ?? 0
    return logLevel >= filterLevel
  })
})

const memoryUsagePercent = ref(0)
const diskUsagePercent = ref(0)
const dbConnectionPercent = ref(0)

const getMemoryColor = (percent: number) => {
  if (percent > 90) return 'error'
  if (percent > 70) return 'warning'
  return 'success'
}

const getDiskColor = (percent: number) => {
  if (percent > 90) return 'error'
  if (percent > 70) return 'warning'
  return 'success'
}

const getDbColor = (percent: number) => {
  if (percent > 90) return 'error'
  if (percent > 70) return 'warning'
  return 'info'
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatTerminalTime = (timestamp: string) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getTerminalLevelClass = (level: string) => {
  switch (level.toLowerCase()) {
    case 'error': return 'terminal-error'
    case 'warn': return 'terminal-warn'
    case 'info': return 'terminal-info'
    default: return 'terminal-debug'
  }
}

const fetchSystemMetrics = async () => {
  try {
    const token = localStorage.getItem('token')
    console.log('[Dashboard] Fetching system metrics with token:', token ? 'exists' : 'missing')
    const url = '/api/system/metrics'
    console.log('[Dashboard] Request URL:', url)
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
    console.log('[Dashboard] System metrics response status:', response.status)
    console.log('[Dashboard] System metrics response data:', response.data)
    systemMetrics.value = response.data

    // Calculate percentages
    if (systemMetrics.value.memoryTotal > 0) {
      memoryUsagePercent.value = (systemMetrics.value.memoryUsage / systemMetrics.value.memoryTotal) * 100
      console.log('[Dashboard] Memory usage percent:', memoryUsagePercent.value)
    }
    if (systemMetrics.value.diskTotal > 0) {
      diskUsagePercent.value = (systemMetrics.value.diskUsage / systemMetrics.value.diskTotal) * 100
      console.log('[Dashboard] Disk usage percent:', diskUsagePercent.value)
    }

    lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  } catch (error: any) {
    console.error('[Dashboard] Failed to fetch system metrics:', error.response?.data || error.message)
    console.error('[Dashboard] Error status:', error.response?.status)
    console.error('[Dashboard] Error config:', error.config)
  }
}

const fetchDatabaseMetrics = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get('/api/system/database/metrics', {
      headers: { Authorization: `Bearer ${token}` }
    })
    console.log('[Dashboard] Database metrics response:', response.data)
    dbMetrics.value = response.data

    // Calculate DB connection percentage
    if (dbMetrics.value.maxOpenConns > 0) {
      dbConnectionPercent.value = (dbMetrics.value.inUse / dbMetrics.value.maxOpenConns) * 100
      console.log('[Dashboard] DB connection percent:', dbConnectionPercent.value)
    }
  } catch (error: any) {
    console.error('[Dashboard] Failed to fetch database metrics:', error.response?.data || error.message)
  }
}

const fetchLogs = async () => {
  loadingLogs.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(`/api/system/logs?limit=${logLimit.value}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    recentLogs.value = response.data.logs || []

    // Auto scroll to bottom when new logs arrive
    if (terminalRef.value) {
      terminalRef.value.scrollTop = terminalRef.value.scrollHeight
    }
  } catch (error) {
    console.error('Failed to fetch logs:', error)
  } finally {
    loadingLogs.value = false
  }
}

onMounted(() => {
  // Initial fetch
  fetchSystemMetrics()
  fetchDatabaseMetrics()
  fetchLogs()

  // Set up periodic refresh
  metricsInterval = window.setInterval(() => {
    fetchSystemMetrics()
    fetchDatabaseMetrics()
  }, 5000) as unknown as number

  logsInterval = window.setInterval(() => {
    fetchLogs()
  }, 3000) as unknown as number
})

onUnmounted(() => {
  if (metricsInterval) {
    clearInterval(metricsInterval)
  }
  if (logsInterval) {
    clearInterval(logsInterval)
  }
})
</script>

<style scoped>
.bg-red-lighten-5 {
  background-color: rgba(var(--v-theme-error), 0.08);
}
.bg-orange-lighten-5 {
  background-color: rgba(var(--v-theme-warning), 0.08);
}
.bg-blue-lighten-5 {
  background-color: rgba(var(--v-theme-info), 0.08);
}

/* Terminal style */
.terminal-container {
  background-color: #1e1e1e;
  border-radius: 6px;
  padding: 12px;
  max-height: 400px;
  overflow: hidden;
}

.terminal-output {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #d4d4d4;
  max-height: 376px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal-output::-webkit-scrollbar {
  width: 8px;
}

.terminal-output::-webkit-scrollbar-track {
  background: #2d2d2d;
  border-radius: 4px;
}

.terminal-output::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.terminal-output::-webkit-scrollbar-thumb:hover {
  background: #666;
}

.terminal-line {
  display: flex;
  gap: 8px;
  padding: 2px 0;
}

.terminal-time {
  color: #6a9955;
  min-width: 120px;
  flex-shrink: 0;
}

.terminal-level {
  min-width: 50px;
  font-weight: bold;
  flex-shrink: 0;
}

.terminal-error {
  color: #f44747;
}

.terminal-warn {
  color: #cc7832;
}

.terminal-info {
  color: #4ec9b0;
}

.terminal-debug {
  color: #9cdcfe;
}

.terminal-message {
  color: #d4d4d4;
  flex: 1;
}

.terminal-empty {
  text-align: center;
  padding: 20px;
  font-style: italic;
}
</style>
