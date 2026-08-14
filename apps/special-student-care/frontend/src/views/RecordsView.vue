<template>
  <v-container>
    <h2 class="text-h5 mb-4">关爱记录</h2>
    <v-btn color="primary" @click="openCreateDialog" class="mb-4">新增记录</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>日期</th>
          <th>教师</th>
          <th>学生</th>
          <th>形式</th>
          <th>内容</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in records" :key="r.id">
          <td>{{ r.care_date }}</td>
          <td>{{ r.teacher_name }}</td>
          <td>{{ r.student_name }}</td>
          <td>{{ r.care_form }}</td>
          <td>{{ r.content?.substring(0, 50) }}{{ r.content?.length > 50 ? '...' : '' }}</td>
          <td>
            <v-btn size="small" icon="mdi-eye" @click="viewDetail(r)" />
            <v-btn size="small" icon="mdi-delete" color="error" @click="remove(r.id)" class="ml-1" />
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>新增关爱记录</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.care_date" type="date" label="关爱日期" />
          <v-select v-model="form.student_id" :items="students" item-title="name" item-value="id" label="关爱对象" />
          <v-select v-model="form.care_form" :items="careForms" label="关爱形式" />
          <v-textarea v-model="form.content" label="关爱内容" rows="3" />
          <v-text-field v-model="form.image_urls" label="图片URL（JSON数组）" placeholder='["url1","url2"]' />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="detailDialog" max-width="600">
      <v-card>
        <v-card-title>关爱记录详情</v-card-title>
        <v-card-text>
          <p><strong>日期：</strong>{{ currentRecord.care_date }}</p>
          <p><strong>教师：</strong>{{ currentRecord.teacher_name }}</p>
          <p><strong>学生：</strong>{{ currentRecord.student_name }}</p>
          <p><strong>形式：</strong>{{ currentRecord.care_form }}</p>
          <p><strong>内容：</strong></p>
          <p>{{ currentRecord.content }}</p>
          <div v-if="currentRecord.image_urls">
            <p><strong>图片：</strong></p>
            <div v-for="(url, idx) in parseImages(currentRecord.image_urls)" :key="idx">
              <img :src="url" style="max-width: 200px; margin: 5px" />
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="detailDialog = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api.js'

const route = useRoute()
const records = ref([])
const students = ref([])
const dialog = ref(false)
const detailDialog = ref(false)
const currentRecord = ref({})

const careForms = ['谈心谈话', '家访', '学业辅导', '心理疏导', '行为矫正', '其他']

const form = ref({
  care_date: '',
  student_id: null,
  care_form: '',
  content: '',
  image_urls: ''
})

function parseImages(urls) {
  try {
    return JSON.parse(urls)
  } catch {
    return []
  }
}

function openCreateDialog() {
  form.value = {
    care_date: new Date().toISOString().split('T')[0],
    student_id: route.query.student_id ? parseInt(route.query.student_id) : null,
    care_form: '',
    content: '',
    image_urls: ''
  }
  dialog.value = true
}

function viewDetail(record) {
  currentRecord.value = record
  detailDialog.value = true
}

async function save() {
  try {
    const student = students.value.find(s => s.id === form.value.student_id)
    const data = {
      ...form.value,
      student_name: student?.name || '',
      academic_year: new Date().getFullYear().toString(),
      semester: new Date().getMonth() < 7 ? 2 : 1
    }
    await api.createRecord(data)
    dialog.value = false
    await loadRecords()
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || e.message))
  }
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteRecord(id)
    await loadRecords()
  }
}

async function loadRecords() {
  records.value = await api.getRecords()
}

onMounted(async () => {
  students.value = await api.getStudents()
  await loadRecords()
})
</script>
