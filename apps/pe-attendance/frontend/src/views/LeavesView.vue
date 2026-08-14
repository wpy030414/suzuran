<template>
  <v-container>
    <h2 class="text-h5 mb-4">请假报备</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">新增请假</v-btn>

    <v-table density="compact">
      <thead><tr><th>体育课ID</th><th>学生ID</th><th>报备人</th><th>原因</th></tr></thead>
      <tbody>
        <tr v-for="l in leaves" :key="l.id">
          <td>{{ l.pe_class_id }}</td>
          <td>{{ l.student_id }}</td>
          <td>{{ l.reported_by }}</td>
          <td>{{ l.reason }}</td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>新增请假</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.pe_class_id" type="number" label="体育课ID" />
          <v-text-field v-model="form.student_id" type="number" label="学生ID" />
          <v-text-field v-model="form.reported_by" type="number" label="报备人（班主任ID）" />
          <v-textarea v-model="form.reason" label="原因" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="submit">提交</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const leaves = ref([])
const dialog = ref(false)
const form = ref({ pe_class_id: '', student_id: '', reported_by: '', reason: '' })

async function submit() {
  await api.createLeave({
    pe_class_id: parseInt(form.value.pe_class_id),
    student_id: parseInt(form.value.student_id),
    reported_by: parseInt(form.value.reported_by),
    reason: form.value.reason,
  })
  dialog.value = false
  leaves.value = await api.getLeaves()
}

onMounted(async () => { leaves.value = await api.getLeaves() })
</script>
