<template>
  <v-container>
    <h2 class="text-h5 mb-4">值班检查</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">新增检查记录</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>值班ID</th>
          <th>检查人ID</th>
          <th>结果</th>
          <th>备注</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in inspections" :key="i.id">
          <td>{{ i.snapshot_id }}</td>
          <td>{{ i.inspector_id }}</td>
          <td>
            <v-chip :color="i.result === 'present' ? 'success' : 'error'" size="small">
              {{ i.result === 'present' ? '在岗' : '缺勤' }}
            </v-chip>
          </td>
          <td>{{ i.notes }}</td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>新增检查记录</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.snapshot_id" type="number" label="值班ID" />
          <v-text-field v-model="form.inspector_id" type="number" label="检查人ID" />
          <v-select v-model="form.result" :items="['present', 'absent']" label="结果" />
          <v-textarea v-model="form.notes" label="备注" rows="2" />
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

const inspections = ref([])
const dialog = ref(false)
const form = ref({ snapshot_id: '', inspector_id: '', result: 'present', notes: '' })

async function save() {
  await api.createInspection({
    snapshot_id: parseInt(form.value.snapshot_id),
    inspector_id: parseInt(form.value.inspector_id),
    result: form.value.result,
    notes: form.value.notes
  })
  dialog.value = false
  inspections.value = await api.getInspections()
}

onMounted(async () => {
  inspections.value = await api.getInspections()
})
</script>
