<template>
  <v-container>
    <h2 class="text-h5 mb-4">传染病登记管理</h2>

    <v-btn color="primary" @click="openDialog" class="mb-4">新增登记</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>学生</th>
          <th>年级班级</th>
          <th>校区</th>
          <th>疾病名称</th>
          <th>诊断日期</th>
          <th>康复日期</th>
          <th>状态</th>
          <th>报告人</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in diseases" :key="d.id">
          <td>{{ d.student_name || `学生#${d.student_id}` }}</td>
          <td>{{ d.grade }} {{ d.class_name }}</td>
          <td>{{ d.campus_name || `校区#${d.campus_id}` }}</td>
          <td>{{ d.disease_name }}</td>
          <td>{{ d.diagnosis_date }}</td>
          <td>{{ d.recovery_date || '-' }}</td>
          <td>
            <v-chip :color="d.status === 'active' ? 'error' : 'success'" size="small">
              {{ d.status === 'active' ? '治疗中' : '已康复' }}
            </v-chip>
          </td>
          <td>{{ d.reported_by }}</td>
          <td>
            <v-btn v-if="d.status === 'active'" size="small" color="success" @click="recover(d.id)">标记康复</v-btn>
            <v-btn size="small" color="error" @click="remove(d.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-alert v-if="diseases.length === 0" type="info" class="mt-4">暂无传染病登记</v-alert>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>新增传染病登记</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.student_id" type="number" label="学生ID" />
          <v-text-field v-model="form.student_name" label="学生姓名" />
          <v-text-field v-model="form.grade" label="年级" />
          <v-text-field v-model="form.class_name" label="班级" />
          <v-text-field v-model="form.campus_name" label="校区名称" />
          <v-text-field v-model="form.disease_name" label="疾病名称" />
          <v-text-field v-model="form.diagnosis_date" type="date" label="诊断日期" />
          <v-text-field v-model="form.reported_by" label="报告人" />
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

const diseases = ref([])
const dialog = ref(false)
const form = ref({
  student_id: '',
  student_name: '',
  grade: '',
  class_name: '',
  campus_name: '',
  disease_name: '',
  diagnosis_date: '',
  reported_by: ''
})

function openDialog() {
  form.value = {
    student_id: '',
    student_name: '',
    grade: '',
    class_name: '',
    campus_name: '',
    disease_name: '',
    diagnosis_date: new Date().toISOString().split('T')[0],
    reported_by: ''
  }
  dialog.value = true
}

async function save() {
  await api.createInfectiousDisease({
    student_id: parseInt(form.value.student_id),
    student_name: form.value.student_name,
    grade: form.value.grade,
    class_name: form.value.class_name,
    campus_name: form.value.campus_name,
    disease_name: form.value.disease_name,
    diagnosis_date: form.value.diagnosis_date,
    reported_by: form.value.reported_by
  })
  dialog.value = false
  diseases.value = await api.getInfectiousDiseases()
}

async function recover(id) {
  await api.updateInfectiousDisease(id, {
    status: 'recovered',
    recovery_date: new Date().toISOString().split('T')[0]
  })
  diseases.value = await api.getInfectiousDiseases()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteInfectiousDisease(id)
    diseases.value = await api.getInfectiousDiseases()
  }
}

onMounted(async () => {
  diseases.value = await api.getInfectiousDiseases()
})
</script>
