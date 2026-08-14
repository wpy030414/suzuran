<template>
  <v-container>
    <h2 class="text-h5 mb-4">分班结果</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">新增分班</v-btn>

    <v-select
      v-model="selectedBatch"
      :items="batches"
      item-title="display"
      item-value="id"
      label="筛选批次"
      clearable
      class="mb-4"
      @update:model-value="loadResults"
    />

    <v-table density="compact">
      <thead>
        <tr>
          <th>学生姓名</th>
          <th>身份证号</th>
          <th>班级ID</th>
          <th>班级名称</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in results" :key="r.id">
          <td>{{ r.student_name }}</td>
          <td>{{ r.id_number }}</td>
          <td>{{ r.classroom_id }}</td>
          <td>{{ r.classroom_name }}</td>
          <td>
            <v-btn size="small" color="error" @click="remove(r.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>新增分班</v-card-title>
        <v-card-text>
          <v-select
            v-model="form.batch_id"
            :items="batches"
            item-title="display"
            item-value="id"
            label="选择批次"
            class="mb-4"
          />
          <v-text-field v-model="form.student_name" label="学生姓名" />
          <v-text-field v-model="form.id_number" label="身份证号" />
          <v-text-field v-model="form.classroom_id" type="number" label="班级ID" />
          <v-text-field v-model="form.classroom_name" label="班级名称" />
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
const results = ref([])
const selectedBatch = ref(null)
const dialog = ref(false)
const form = ref({ batch_id: null, student_name: '', id_number: '', classroom_id: '', classroom_name: '' })

async function loadResults() {
  if (selectedBatch.value) {
    results.value = await api.getResults({ batch_id: selectedBatch.value })
  } else {
    results.value = await api.getResults()
  }
}

async function save() {
  await api.createResult({
    batch_id: parseInt(form.value.batch_id),
    student_name: form.value.student_name,
    id_number: form.value.id_number,
    classroom_id: parseInt(form.value.classroom_id),
    classroom_name: form.value.classroom_name
  })
  dialog.value = false
  await loadResults()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteResult(id)
    await loadResults()
  }
}

onMounted(async () => {
  const batchList = await api.getBatches()
  batches.value = batchList.map(b => ({
    id: b.id,
    display: `${b.academic_year} ${b.grade_level} (${b.release_date})`
  }))
  results.value = await api.getResults()
})
</script>
