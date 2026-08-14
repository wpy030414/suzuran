<template>
  <v-container>
    <h2 class="text-h5 mb-4">播放列表</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">新建播放列表</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>名称</th>
          <th>循环模式</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in playlists" :key="p.id">
          <td>{{ p.name }}</td>
          <td>{{ p.loop_mode }}</td>
          <td>
            <v-chip :color="p.status === 'active' ? 'success' : 'grey'" size="small">
              {{ p.status === 'active' ? '启用' : '禁用' }}
            </v-chip>
          </td>
          <td>
            <v-btn size="small" color="error" @click="remove(p.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>新建播放列表</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="名称" />
          <v-select v-model="form.loop_mode" :items="['sequential', 'random', 'single']" label="循环模式" />
          <v-textarea v-model="form.images" label="图片列表（JSON格式）" rows="3" />
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

const playlists = ref([])
const dialog = ref(false)
const form = ref({ name: '', loop_mode: 'sequential', images: '[]' })

async function save() {
  await api.createPlaylist({
    name: form.value.name,
    client_ids: '[]',
    images: form.value.images,
    loop_mode: form.value.loop_mode,
    status: 'active'
  })
  dialog.value = false
  playlists.value = await api.getPlaylists()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deletePlaylist(id)
    playlists.value = await api.getPlaylists()
  }
}

onMounted(async () => {
  playlists.value = await api.getPlaylists()
})
</script>
