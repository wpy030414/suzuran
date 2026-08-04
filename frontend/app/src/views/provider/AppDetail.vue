<template>
  <div>
    <!-- 页头 -->
    <div class="d-flex align-center mb-6">
      <v-btn
        variant="text"
        prepend-icon="mdi-arrow-left"
        to="/provider/apps"
        class="mr-2"
      >
        返回
      </v-btn>
      <h1 class="text-h5 font-weight-bold">
        <v-icon class="mr-2" color="primary">mdi-application-cog</v-icon>
        {{ app?.name || '应用详情' }}
      </h1>
      <v-chip
        v-if="app"
        :color="statusColor"
        size="small"
        class="ml-3"
        label
      >
        {{ statusLabel }}
      </v-chip>
      <v-spacer />
      <v-btn
        v-if="app"
        variant="outlined"
        prepend-icon="mdi-refresh"
        :loading="actionLoading"
        @click="refresh"
      >
        刷新
      </v-btn>
    </div>

    <!-- 错误 -->
    <v-alert v-if="error" type="error" class="mb-4" closable>
      {{ error }}
    </v-alert>

    <!-- 加载 -->
    <div v-if="loading && !app" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <template v-if="app">
      <v-row>
        <!-- 左：元信息 + 操作 -->
        <v-col cols="12" md="5">
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">应用信息</v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title class="text-grey">ID</v-list-item-title>
                  <v-list-item-subtitle class="font-monospace">{{ app.id }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="text-grey">版本</v-list-item-title>
                  <v-list-item-subtitle>v{{ app.version || '0.0.0' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="text-grey">运行时</v-list-item-title>
                  <v-list-item-subtitle>{{ app.runtime || '—' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="text-grey">入口</v-list-item-title>
                  <v-list-item-subtitle class="font-monospace">{{ app.entrypoint || '—' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="text-grey">端口</v-list-item-title>
                  <v-list-item-subtitle>{{ app.port || '—' }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="text-grey">资源配额</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ app.cpuQuota || '无限制' }} CPU · {{ app.memoryQuota || '无限制' }} · {{ app.dbConnQuota }} 连接
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="app.containerId">
                  <v-list-item-title class="text-grey">容器 ID</v-list-item-title>
                  <v-list-item-subtitle class="font-monospace text-truncate">
                    {{ app.containerId }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>

            <v-divider />
            <v-card-actions class="pa-4 flex-wrap">
              <v-btn
                color="primary"
                prepend-icon="mdi-rocket-launch"
                :loading="actionLoading"
                @click="callAction('deploy')"
              >
                部署
              </v-btn>
              <v-btn
                v-if="app.status === 'stopped' || app.status === 'created'"
                color="success"
                prepend-icon="mdi-play"
                :loading="actionLoading"
                @click="callAction('start')"
              >
                启动
              </v-btn>
              <v-btn
                v-if="app.status === 'running'"
                color="warning"
                prepend-icon="mdi-stop"
                :loading="actionLoading"
                @click="callAction('stop')"
              >
                停止
              </v-btn>
              <v-btn
                variant="outlined"
                prepend-icon="mdi-restart"
                :loading="actionLoading"
                @click="callAction('restart')"
              >
                重启
              </v-btn>
              <v-btn
                color="primary"
                variant="text"
                prepend-icon="mdi-open-in-new"
                :disabled="app.status !== 'running'"
                @click="openApp"
              >
                进入应用
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <!-- 右：日志 -->
        <v-col cols="12" md="7">
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="d-flex align-center text-subtitle-1">
              运行日志
              <v-spacer />
              <v-btn
                size="small"
                variant="text"
                prepend-icon="mdi-refresh"
                :loading="logsLoading"
                @click="fetchLogs"
              >
                刷新
              </v-btn>
            </v-card-title>
            <v-card-text>
              <div class="terminal-output pa-3">
                <pre v-if="logs" class="terminal-text">{{ logs }}</pre>
                <div v-else class="text-grey text-center py-4">暂无日志</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- 部署历史 -->
      <v-card variant="outlined">
        <v-card-title class="text-subtitle-1">
          <v-icon class="mr-2">mdi-history</v-icon>
          部署历史
        </v-card-title>
        <v-card-text>
          <div v-if="deploymentsLoading" class="text-center py-4">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <v-table v-else-if="deployments.length > 0">
            <thead>
              <tr>
                <th>版本</th>
                <th>镜像</th>
                <th>状态</th>
                <th>容器 ID</th>
                <th>创建时间</th>
                <th>完成时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in deployments" :key="d.id">
                <td>v{{ d.version || '—' }}</td>
                <td class="font-monospace">{{ d.imageTag || '—' }}</td>
                <td>
                  <v-chip :color="deploymentStatusColor(d.status)" size="small" label>
                    {{ d.status }}
                  </v-chip>
                </td>
                <td class="font-monospace text-truncate" style="max-width: 200px">
                  {{ d.containerId || '—' }}
                </td>
                <td>{{ formatDate(d.createdAt) }}</td>
                <td>{{ d.completedAt ? formatDate(d.completedAt) : '—' }}</td>
              </tr>
            </tbody>
          </v-table>
          <div v-else class="text-grey text-center py-6">还没有部署记录</div>
        </v-card-text>
      </v-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  getApp,
  getDeployments,
  getAppLogs,
  deployApp,
  startApp,
  stopApp,
  restartApp,
  type Application,
  type Deployment,
} from '../../api/application'

const route = useRoute()
const appId = computed(() => String(route.params.appId))

const app = ref<Application | null>(null)
const loading = ref(false)
const error = ref('')
const actionLoading = ref(false)

const logs = ref('')
const logsLoading = ref(false)

const deployments = ref<Deployment[]>([])
const deploymentsLoading = ref(false)

const statusColor = computed(() => {
  if (!app.value) return 'grey'
  const map: Record<string, string> = {
    running: 'success',
    stopped: 'grey',
    created: 'info',
    error: 'error',
    building: 'warning',
    deploying: 'warning',
  }
  return map[app.value.status] || 'grey'
})

const statusLabel = computed(() => {
  if (!app.value) return ''
  const labels: Record<string, string> = {
    created: '待部署',
    building: '构建中',
    deploying: '部署中',
    running: '运行中',
    stopped: '已停止',
    error: '异常',
    deleted: '已删除',
  }
  return labels[app.value.status] || app.value.status
})

function deploymentStatusColor(status: string) {
  const map: Record<string, string> = {
    deployed: 'success',
    building: 'warning',
    failed: 'error',
    stopped: 'grey',
  }
  return map[status] || 'grey'
}

function formatDate(s: string) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleString('zh-CN')
  } catch {
    return s
  }
}

async function fetchApp() {
  loading.value = true
  error.value = ''
  try {
    const resp = await getApp(appId.value)
    app.value = resp.data
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || '获取应用失败'
  } finally {
    loading.value = false
  }
}

async function fetchLogs() {
  logsLoading.value = true
  try {
    const resp = await getAppLogs(appId.value, 200)
    logs.value = resp.data.logs || ''
  } catch (e: any) {
    logs.value = `获取日志失败: ${e.response?.data?.error || e.message}`
  } finally {
    logsLoading.value = false
  }
}

async function fetchDeployments() {
  deploymentsLoading.value = true
  try {
    const resp = await getDeployments(appId.value)
    deployments.value = resp.data.deployments || []
  } catch (e: any) {
    // deployments may not exist yet; non-fatal
    deployments.value = []
  } finally {
    deploymentsLoading.value = false
  }
}

async function refresh() {
  await Promise.all([fetchApp(), fetchLogs(), fetchDeployments()])
}

async function callAction(action: 'deploy' | 'start' | 'stop' | 'restart') {
  actionLoading.value = true
  error.value = ''
  try {
    const fns = { deploy: deployApp, start: startApp, stop: stopApp, restart: restartApp }
    await fns[action](appId.value)
    await refresh()
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || '操作失败'
  } finally {
    actionLoading.value = false
  }
}

function openApp() {
  window.open(`/apps/${appId.value}/`, '_blank')
}

onMounted(() => {
  refresh()
})
</script>

<style scoped>
.terminal-output {
  background: #1e1e1e;
  border-radius: 6px;
  min-height: 200px;
  max-height: 400px;
  overflow: auto;
}
.terminal-text {
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.8rem;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
.font-monospace {
  font-family: 'Consolas', 'Monaco', monospace;
}
</style>
