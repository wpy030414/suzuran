<template>
  <v-container>
    <h2 class="text-h5 mb-4">快速开门</h2>

    <v-alert v-if="permittedDevices.length === 0" type="info" class="mb-4">
      您没有被授权访问任何设备，请联系管理员添加权限。
    </v-alert>

    <v-row>
      <v-col v-for="device in permittedDevices" :key="device.id" cols="12" md="4">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon start :color="device.is_online ? 'success' : 'grey'">
              {{ device.is_online ? 'mdi-door' : 'mdi-door-closed' }}
            </v-icon>
            {{ device.name }}
          </v-card-title>
          <v-card-subtitle>{{ device.location || '未设置位置' }}</v-card-subtitle>
          <v-card-text>
            <div class="text-body-2">
              <div><strong>类型：</strong>{{ deviceTypeLabels[device.device_type] || device.device_type }}</div>
              <div><strong>开门时长：</strong>{{ device.open_duration || 5 }} 秒</div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="primary"
              size="large"
              :disabled="!device.is_online || unlocking === device.id"
              :loading="unlocking === device.id"
              @click="confirmUnlock(device)"
            >
              <v-icon start>mdi-lock-open</v-icon>
              开门
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="400">
      <v-card>
        <v-card-title>确认开门</v-card-title>
        <v-card-text>
          确定要打开 <strong>{{ selectedDevice?.name }}</strong> 吗？
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="unlock">确认</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const permittedDevices = ref([])
const dialog = ref(false)
const selectedDevice = ref(null)
const unlocking = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const deviceTypeLabels = {
  door: '门',
  gate: '闸机',
  barrier: '道闸'
}

function confirmUnlock(device) {
  selectedDevice.value = device
  dialog.value = true
}

async function unlock() {
  dialog.value = false
  unlocking.value = selectedDevice.value.id

  try {
    const userId = localStorage.getItem('user_id') || '1'
    const userName = localStorage.getItem('user_name') || `用户#${userId}`

    const result = await api.unlockDevice(selectedDevice.value.id, {
      user_id: parseInt(userId),
      user_name: userName,
      method: 'app'
    })

    snackbarText.value = result.data.message || '操作成功'
    snackbarColor.value = result.data.success ? 'success' : 'error'
    snackbar.value = true
  } catch (error) {
    snackbarText.value = error.response?.data?.error || '操作失败'
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    unlocking.value = null
  }
}

onMounted(async () => {
  // 获取用户有权限的设备
  const userId = localStorage.getItem('user_id') || '1'
  const permissions = await api.getPermissions({ user_id: userId })

  const deviceIds = new Set()
  for (const perm of permissions) {
    let ids = perm.device_ids
    if (typeof ids === 'string') {
      try { ids = JSON.parse(ids) } catch { ids = [] }
    }
    if (Array.isArray(ids)) {
      ids.forEach(id => deviceIds.add(id))
    }
  }

  // 获取所有设备并过滤
  const allDevices = await api.getDevices()
  permittedDevices.value = allDevices.filter(d => deviceIds.has(d.id))
})
</script>
