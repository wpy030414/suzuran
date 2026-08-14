<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">权限管理</h2>
      <v-spacer />
      <v-btn color="primary" @click="openDialog()" prepend-icon="mdi-plus">添加权限</v-btn>
    </div>

    <v-table density="compact">
      <thead>
        <tr>
          <th>用户</th>
          <th>设备列表</th>
          <th>权限类型</th>
          <th>有效期</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in permissions" :key="p.id">
          <td>{{ p.user_name || `用户#${p.user_id}` }}</td>
          <td>{{ formatDeviceIds(p.device_ids) }}</td>
          <td>
            <v-chip size="small">{{ permissionTypeLabels[p.permission_type] || p.permission_type }}</v-chip>
          </td>
          <td>
            <div class="text-caption">{{ formatDate(p.valid_from) }}</div>
            <div class="text-caption">至 {{ formatDate(p.valid_until) }}</div>
          </td>
          <td>
            <v-chip :color="isActive(p) ? 'success' : 'grey'" size="small">
              {{ isActive(p) ? '有效' : '已过期' }}
            </v-chip>
          </td>
          <td>
            <v-btn size="small" color="primary" @click="openDialog(p)" icon="mdi-pencil" />
            <v-btn size="small" color="error" @click="remove(p.id)" icon="mdi-delete" />
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>{{ isEdit ? '编辑权限' : '添加权限' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.user_id"
            label="用户ID *"
            type="number"
            :disabled="isEdit"
          />
          <v-text-field
            v-model="form.user_name"
            label="用户名称"
          />
          <v-text-field
            v-model="form.device_ids_text"
            label="设备ID列表（逗号分隔）*"
          />
          <v-select
            v-model="form.permission_type"
            :items="permissionTypes"
            label="权限类型"
          />
          <v-text-field
            v-model="form.valid_from"
            label="有效期开始"
            type="datetime-local"
          />
          <v-text-field
            v-model="form.valid_until"
            label="有效期结束"
            type="datetime-local"
          />
          <v-switch
            v-model="form.is_active"
            label="启用"
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

const permissions = ref([])
const dialog = ref(false)
const isEdit = ref(false)
const editId = ref(null)

const permissionTypes = [
  { title: '永久', value: 'permanent' },
  { title: '临时', value: 'temporary' },
  { title: '定时', value: 'schedule' }
]

const permissionTypeLabels = {
  permanent: '永久',
  temporary: '临时',
  schedule: '定时'
}

const form = ref({
  user_id: '',
  user_name: '',
  device_ids_text: '',
  permission_type: 'temporary',
  valid_from: '',
  valid_until: '',
  is_active: true
})

function formatDeviceIds(ids) {
  if (typeof ids === 'string') {
    try { ids = JSON.parse(ids) } catch { return ids }
  }
  return Array.isArray(ids) ? ids.join(', ') : '-'
}

function formatDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('zh-CN')
}

function isActive(perm) {
  if (!perm.is_active) return false
  const now = new Date()
  if (perm.valid_from && new Date(perm.valid_from) > now) return false
  if (perm.valid_until && new Date(perm.valid_until) < now) return false
  return true
}

function openDialog(perm = null) {
  if (perm) {
    isEdit.value = true
    editId.value = perm.id
    form.value = {
      user_id: perm.user_id,
      user_name: perm.user_name || '',
      device_ids_text: formatDeviceIds(perm.device_ids),
      permission_type: perm.permission_type || 'temporary',
      valid_from: perm.valid_from ? perm.valid_from.slice(0, 16) : '',
      valid_until: perm.valid_until ? perm.valid_until.slice(0, 16) : '',
      is_active: perm.is_active
    }
  } else {
    isEdit.value = false
    editId.value = null
    form.value = {
      user_id: '',
      user_name: '',
      device_ids_text: '',
      permission_type: 'temporary',
      valid_from: '',
      valid_until: '',
      is_active: true
    }
  }
  dialog.value = true
}

async function save() {
  const deviceIds = form.value.device_ids_text.split(',').map(s => parseInt(s.trim())).filter(Boolean)

  const data = {
    user_id: parseInt(form.value.user_id),
    user_name: form.value.user_name,
    device_ids: deviceIds,
    permission_type: form.value.permission_type,
    valid_from: form.value.valid_from ? new Date(form.value.valid_from).toISOString() : null,
    valid_until: form.value.valid_until ? new Date(form.value.valid_until).toISOString() : null,
    is_active: form.value.is_active
  }

  if (isEdit.value) {
    await api.updatePermission(editId.value, data)
  } else {
    await api.createPermission(data)
  }

  dialog.value = false
  permissions.value = await api.getPermissions()
}

async function remove(id) {
  if (confirm('确定删除此权限？')) {
    await api.deletePermission(id)
    permissions.value = await api.getPermissions()
  }
}

onMounted(async () => {
  permissions.value = await api.getPermissions()
})
</script>
