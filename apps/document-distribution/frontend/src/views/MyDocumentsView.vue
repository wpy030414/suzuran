<template>
  <v-container>
    <h2 class="text-h5 mb-4">我的公文</h2>

    <v-table density="compact">
      <thead>
        <tr>
          <th>标题</th>
          <th>内容</th>
          <th>发布时间</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in records" :key="r.id">
          <td>{{ documents.find(d => d.id === r.document_id)?.title || r.document_id }}</td>
          <td>{{ documents.find(d => d.id === r.document_id)?.content?.substring(0, 50) || '' }}...</td>
          <td>{{ documents.find(d => d.id === r.document_id)?.created_at }}</td>
          <td>
            <v-chip :color="r.status === 'read' ? 'success' : 'warning'" size="small">
              {{ r.status === 'read' ? '已读' : '待读' }}
            </v-chip>
          </td>
          <td>
            <v-btn v-if="r.status !== 'read'" size="small" color="primary" @click="markRead(r.id)">标记已读</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const records = ref([])
const documents = ref([])

async function markRead(id) {
  await api.markAsRead(id)
  records.value = await api.getDistributionRecords()
}

onMounted(async () => {
  records.value = await api.getDistributionRecords()
  documents.value = await api.getDocuments()
})
</script>
