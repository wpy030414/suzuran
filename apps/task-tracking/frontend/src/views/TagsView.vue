<template>
  <v-container>
    <h2 class="text-h5 mb-4">标签管理</h2>
    <v-btn color="primary" @click="openDialog()" class="mb-4">
      <v-icon start>mdi-plus</v-icon>新建标签
    </v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>名称</th>
          <th>别名</th>
          <th>优先级</th>
          <th>描述</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tag in tags" :key="tag.id">
          <td>{{ tag.name }}</td>
          <td>{{ tag.alias || '-' }}</td>
          <td>
            <v-chip :color="priorityColor(tag.priority)" size="small">{{ tag.priority }}</v-chip>
          </td>
          <td>{{ tag.description || '-' }}</td>
          <td>
            <v-btn size="small" variant="text" @click="openDialog(tag)">编辑</v-btn>
            <v-btn size="small" color="error" variant="text" @click="remove(tag.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>{{ editingId ? '编辑标签' : '新建标签' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="名称 *" />
          <v-text-field v-model="form.alias" label="别名" />
          <v-select v-model="form.priority" :items="priorityOptions" item-title="text" item-value="value" label="优先级" />
          <v-textarea v-model="form.description" label="描述" rows="2" />
          <v-alert v-if="!editingId" type="info" variant="tonal" class="mt-2">
            提交时需要输入"我确认"以确认标签名称为规范名词
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="confirmDialog" max-width="400">
      <v-card>
        <v-card-title>确认提交</v-card-title>
        <v-card-text>
          <p class="mb-2">请输入"我确认"以确认标签名称为规范名词或名词性成分：</p>
          <v-text-field v-model="confirmText" label="确认文本" placeholder="我确认" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="confirmDialog = false">取消</v-btn>
          <v-btn color="primary" @click="confirmSave">确认</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const tags = ref([])
const dialog = ref(false)
const confirmDialog = ref(false)
const confirmText = ref('')
const editingId = ref(null)
const snackbar = ref({ show: false, text: '', color: 'success' })
const form = ref({ name: '', alias: '', priority: 0, description: '' })

const priorityOptions = [
  { text: '低', value: 0 },
  { text: '中', value: 5 },
  { text: '高', value: 10 },
  { text: '紧急', value: 20 }
]

function priorityColor(p) {
  if (p >= 20) return 'error'
  if (p >= 10) return 'warning'
  if (p >= 5) return 'info'
  return 'grey'
}

function openDialog(tag = null) {
  if (tag) {
    editingId.value = tag.id
    form.value = { name: tag.name, alias: tag.alias || '', priority: tag.priority || 0, description: tag.description || '' }
  } else {
    editingId.value = null
    form.value = { name: '', alias: '', priority: 0, description: '' }
  }
  dialog.value = true
}

async function save() {
  if (!form.value.name) return
  if (editingId.value) {
    await api.updateTag(editingId.value, form.value)
    dialog.value = false
    tags.value = await api.getTags()
  } else {
    confirmText.value = ''
    dialog.value = false
    confirmDialog.value = true
  }
}

async function confirmSave() {
  if (confirmText.value !== '我确认') {
    snackbar.value = { show: true, text: '您没有确认，无法提交！', color: 'error' }
    return
  }
  try {
    await api.createTag({ ...form.value, confirm_text: '我确认' })
    confirmDialog.value = false
    tags.value = await api.getTags()
    snackbar.value = { show: true, text: '标签创建成功', color: 'success' }
  } catch (e) {
    snackbar.value = { show: true, text: e.response?.data?.error || '创建失败', color: 'error' }
  }
}

async function remove(id) {
  if (confirm('确定删除该标签？')) {
    await api.deleteTag(id)
    tags.value = await api.getTags()
  }
}

onMounted(async () => {
  tags.value = await api.getTags()
})
</script>
