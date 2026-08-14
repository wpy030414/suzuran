<template>
  <v-container>
    <h2 class="text-h5 mb-4">排班管理</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">新建排班</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>校区</th>
          <th>班次</th>
          <th>周起始</th>
          <th>周结束</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in schedules" :key="s.id">
          <td>{{ campuses.find(c => c.id === s.campus_id)?.name || s.campus_id }}</td>
          <td>{{ shifts.find(sh => sh.id === s.shift_id)?.name || s.shift_id }}</td>
          <td>{{ s.week_start }}</td>
          <td>{{ s.week_end }}</td>
          <td>
            <v-btn size="small" color="error" @click="remove(s.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>新建排班</v-card-title>
        <v-card-text>
          <v-select v-model="form.campus_id" :items="campuses" item-title="name" item-value="id" label="校区" />
          <v-select v-model="form.shift_id" :items="shifts" item-title="name" item-value="id" label="班次" />
          <v-text-field v-model="form.week_start" type="date" label="周起始" />
          <v-text-field v-model="form.week_end" type="date" label="周结束" />
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

const schedules = ref([])
const campuses = ref([])
const shifts = ref([])
const dialog = ref(false)
const form = ref({ campus_id: null, shift_id: null, week_start: '', week_end: '' })

async function save() {
  await api.createSchedule({
    campus_id: parseInt(form.value.campus_id),
    shift_id: parseInt(form.value.shift_id),
    week_start: form.value.week_start,
    week_end: form.value.week_end
  })
  dialog.value = false
  schedules.value = await api.getSchedules()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteSchedule(id)
    schedules.value = await api.getSchedules()
  }
}

onMounted(async () => {
  schedules.value = await api.getSchedules()
  campuses.value = await api.getCampuses()
  shifts.value = await api.getShifts()
})
</script>
