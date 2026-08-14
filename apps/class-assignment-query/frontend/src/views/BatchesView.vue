<template>
  <v-container>
    <h2 class="text-h5 mb-4">批次管理</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">新增批次</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>学年</th>
          <th>年级</th>
          <th>发布日期</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="b in batches" :key="b.id">
          <td>{{ b.academic_year }}</td>
          <td>{{ b.grade_level }}</td>
          <td>{{ b.release_date }}</td>
          <td>
            <v-chip :color="b.status === 'released' ? 'success' : 'grey'" size="small">
              {{ b.status === 'released' ? '已发布' : '草稿' }}
            </v-chip>
          </td>
          <td>
            <v-btn size="small" color="primary" @click="release(b.id)" v-if="b.status !== 'released'">发布</v-btn>
            <v-btn size="small" color="error" @click="remove(b.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>新增批次</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.academic_year" label="学年（如：2024-2025）" />
          <v-text-field v-model="form.grade_level" label="年级（如：一年级）" />
          <v-text-field v-model="form.release_date" type="date" label="发布日期" />
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

const batches = ref([])
const dialog = ref(false)
const form = ref({ academic_year: '', grade_level: '', release_date: '' })

async function save() {
  await api.createBatch({
    academic_year: form.value.academic_year,
    grade_level: form.value.grade_level,
    release_date: form.value.release_date,
    status: 'draft'
  })
  dialog.value = false
  batches.value = await api.getBatches()
}

async function release(id) {
  await api.updateBatch(id, { status: 'released' })
  batches.value = await api.getBatches()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteBatch(id)
    batches.value = await api.getBatches()
  }
}

onMounted(async () => {
  batches.value = await api.getBatches()
})
</script>
