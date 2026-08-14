<template>
  <v-container>
    <h2 class="text-h5 mb-4">周行事件</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">记录事件</v-btn>
    <v-table density="compact">
      <thead><tr><th>周期ID</th><th>星期</th><th>节次</th><th>地点</th><th>教师</th><th>描述</th><th>操作</th></tr></thead>
      <tbody>
        <tr v-for="e in events" :key="e.id">
          <td>{{ e.period_id }}</td>
          <td>{{ e.day_of_week }}</td>
          <td>{{ e.time_slot_id }}</td>
          <td>{{ e.space_id }}</td>
          <td>{{ typeof e.teacher_ids === 'string' ? e.teacher_ids : JSON.stringify(e.teacher_ids) }}</td>
          <td>{{ e.description }}</td>
          <td>
            <v-btn size="small" color="error" @click="remove(e.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>记录周行事件</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.period_id" type="number" label="周期ID" />
          <v-select v-model="form.day_of_week" :items="[1,2,3,4,5,6,7]" label="星期" />
          <v-text-field v-model="form.time_slot_id" type="number" label="节次ID" />
          <v-text-field v-model="form.space_id" type="number" label="地点ID" />
          <v-text-field v-model="form.teacher_ids" label="教师ID（逗号分隔）" />
          <v-textarea v-model="form.description" label="描述" rows="2" />
          <v-text-field v-model="form.recorded_by" type="number" label="记录人ID" />
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

const events = ref([])
const dialog = ref(false)
const form = ref({ period_id: '', day_of_week: 1, time_slot_id: '', space_id: '', teacher_ids: '', description: '', recorded_by: '' })

async function save() {
  const teacherIds = form.value.teacher_ids.split(',').map(s => parseInt(s.trim())).filter(Boolean)
  await api.createWeeklyEvent({
    period_id: parseInt(form.value.period_id),
    day_of_week: parseInt(form.value.day_of_week),
    time_slot_id: parseInt(form.value.time_slot_id),
    space_id: parseInt(form.value.space_id),
    teacher_ids: JSON.stringify(teacherIds),
    description: form.value.description,
    recorded_by: parseInt(form.value.recorded_by),
  })
  dialog.value = false
  events.value = await api.getWeeklyEvents()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteWeeklyEvent(id)
    events.value = await api.getWeeklyEvents()
  }
}

onMounted(async () => { events.value = await api.getWeeklyEvents() })
</script>
