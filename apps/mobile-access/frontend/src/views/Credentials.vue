<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">凭据管理</h2>
      <v-spacer />
      <v-btn color="primary" @click="dialog = true" prepend-icon="mdi-plus">添加凭据</v-btn>
    </div>

    <v-alert type="warning" class="mb-4">
      <strong>安全提示：</strong>请妥善保管您的凭据，切勿泄露。系统不会显示完整的 App Secret。
    </v-alert>

    <v-table density="compact">
      <thead>
        <tr>
          <th>名称</th>
          <th>App Key</th>
          <th>API Host</th>
          <th>Token 状态</th>
          <th>过期时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cred in credentials" :key="cred.id">
          <td>{{ cred.name }}</td>
          <td><code>{{ cred.app_key }}</code></td>
          <td>{{ cred.api_host }}</td>
          <td>
            <v-chip :color="cred.token_valid ? 'success' : 'grey'" size="small">
              {{ cred.token_valid ? '有效' : '无/已过期' }}
            </v-chip>
          </td>
          <td>{{ formatTime(cred.token_expires_at) }}</td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>添加 EZCloud 凭据</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.name"
            label="名称"
          />
          <v-text-field
            v-model="form.app_key"
            label="App Key *"
          />
          <v-text-field
            v-model="form.app_secret"
            label="App Secret *"
            type="password"
          />
          <v-text-field
            v-model="form.api_host"
            label="API Host"
            placeholder="https://ezcloud.uniview.com"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const credentials = ref([])
const dialog = ref(false)

const form = ref({
  name: '',
  app_key: '',
  app_secret: '',
  api_host: 'https://ezcloud.uniview.com'
})

function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('zh-CN')
}

async function save() {
  await api.createCredential(form.value)
  dialog.value = false
  const result = await api.getCredentials()
  credentials.value = result.rows || []
}

onMounted(async () => {
  const result = await api.getCredentials()
  credentials.value = result.rows || []
})
</script>
