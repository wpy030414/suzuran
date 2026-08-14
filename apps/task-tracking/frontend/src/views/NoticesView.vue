<template>
  <v-container>
    <h2 class="text-h5 mb-4">通知公告</h2>
    <v-btn color="primary" @click="openDialog()" class="mb-4">
      <v-icon start>mdi-plus</v-icon>新建通知
    </v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>内容</th>
          <th>链接</th>
          <th>有效期至</th>
          <th>长期有效</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="notice in notices" :key="notice.id">
          <td>{{ notice.content }}</td>
          <td>
            <a v-if="notice.link" :href="notice.link" target="_blank" class="text-primary">{{ notice.link }}</a>
            <span v-else>-</span>
          </td>
          <td>{{ formatDate(notice.expires_at) }}</td>
          <td>
            <v-chip v-if="notice.is_permanent" size="small" color="success">是</v-chip>
            <span v-else>否</span>
          </td>
          <td>
            <v-btn size="small" variant="text" @click="openDialog(notice)">编辑</v-btn>
            <v-btn size="small" color="error" variant="text" @click="remove(notice.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>{{ editingId ? '编辑通知' : '新建通知' }}</v-card-title>
        <v-card-text>
          <v-textarea v-model="form.content" label="通知内容 *" rows="3" />
          <v-text-field v-model="form.link" label="链接（可选）" placeholder="https://" />
          <v-checkbox v-model="form.is_permanent" label="长期有效" @update:model-value="togglePermanent" />
          <v-text-field
            v-model="form.expires_at"
            type="date"
            label="有效期至"
            :disabled="form.is_permanent"
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

const notices = ref([])
const dialog = ref(false)
const editingId = ref(null)
const form = ref({ content: '', link: '', expires_at: '', is_permanent: false })

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN')
}

function togglePermanent(val) {
  if (val) {
    form.value.expires_at = '2099-12-31'
  } else {
    const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    form.value.expires_at = defaultDate.toISOString().split('T')[0]
  }
}

function openDialog(notice = null) {
  if (notice) {
    editingId.value = notice.id
    form.value = {
      content: notice.content,
      link: notice.link || '',
      expires_at: notice.expires_at ? notice.expires_at.split('T')[0] : '',
      is_permanent: notice.is_permanent || false
    }
  } else {
    editingId.value = null
    const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    form.value = { content: '', link: '', expires_at: defaultDate.toISOString().split('T')[0], is_permanent: false }
  }
  dialog.value = true
}

async function save() {
  if (!form.value.content) return
  if (editingId.value) {
    await api.updateNotice(editingId.value, form.value)
  } else {
    await api.createNotice({ ...form.value, created_by: 1 })
  }
  dialog.value = false
  notices.value = await api.getNotices()
}

async function remove(id) {
  if (confirm('确定删除该通知？')) {
    await api.deleteNotice(id)
    notices.value = await api.getNotices()
  }
}

onMounted(async () => {
  notices.value = await api.getNotices()
})
</script>
