<template>
  <v-container>
    <h2 class="text-h5 mb-4">设备监控</h2>

    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-card color="primary">
          <v-card-text class="text-center">
            <div class="text-h3">{{ dashboard.total || 0 }}</div>
            <div class="text-caption">总设备数</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="success">
          <v-card-text class="text-center">
            <div class="text-h3">{{ dashboard.online || 0 }}</div>
            <div class="text-caption">在线</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="grey">
          <v-card-text class="text-center">
            <div class="text-h3">{{ dashboard.offline || 0 }}</div>
            <div class="text-caption">离线</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="error">
          <v-card-text class="text-center">
            <div class="text-h3">{{ dashboard.recentErrors || 0 }}</div>
            <div class="text-caption">24小时错误</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col v-for="device in dashboard.devices" :key="device.id" cols="12" md="4">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon :color="device.is_online ? 'success' : 'grey'" start>
              {{ device.is_online ? 'mdi-check-circle' : 'mdi-close-circle' }}
            </v-icon>
            {{ device.name }}
          </v-card-title>
          <v-card-subtitle>{{ device.location || '未设置位置' }}</v-card-subtitle>
          <v-card-text>
            <div class="text-body-2 mb-2">
              <strong>类型：</strong>{{ deviceTypeLabels[device.device_type] || device.device_type }}
            </div>
            <div class="text-body-2">
              <strong>最后心跳：</strong>{{ formatTime(device.last_heartbeat) }}
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn size="small" color="primary" @click="sendHeartbeat(device.id)">发送心跳</v-btn>
            <v-btn size="small" @click="viewDetails(device.id)">查看详情</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="detailsDialog" max-width="600">
      <v-card v-if="selectedDevice">
        <v-card-title>{{ selectedDevice.name }} - 详细信息</v-card-title>
        <v-card-text>
          <div class="text-body-2 mb-2">
            <strong>协议：</strong>{{ selectedDevice.protocol || '-' }}
          </div>
          <div class="text-body-2 mb-2">
            <strong>IP 地址：</strong>{{ selectedDevice.ip_address || '-' }}
          </div>
          <div class="text-body-2 mb-2">
            <strong>端口：</strong>{{ selectedDevice.port || '-' }}
          </div>
          <div class="text-body-2 mb-4">
            <strong>开门时长：</strong>{{ selectedDevice.open_duration || 5 }} 秒
          </div>

          <h3 class="text-h6 mb-2">最近日志</h3>
          <v-table density="compact">
            <thead>
              <tr>
                <th>时间</th>
                <th>用户</th>
                <th>结果</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in selectedDevice.recent_logs" :key="log.id">
                <td>{{ formatTime(log.timestamp) }}</td>
                <td>{{ log.user_name }}</td>
                <td>
                  <v-chip :color="log.result === 'success' ? 'success' : 'error'" size="small">
                    {{ log.result === 'success' ? '成功' : '失败' }}
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="detailsDialog = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const dashboard = ref({})
const detailsDialog = ref(false)
const selectedDevice = ref(null)

const deviceTypeLabels = {
  door: '门',
  gate: '闸机',
  barrier: '道闸'
}

function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}

async function sendHeartbeat(deviceId) {
  await api.sendHeartbeat(deviceId)
  dashboard.value = await api.getMonitoringDashboard()
}

async function viewDetails(deviceId) {
  selectedDevice.value = await api.getDeviceStatus(deviceId)
  detailsDialog.value = true
}

onMounted(async () => {
  dashboard.value = await api.getMonitoringDashboard()
})
</script>
