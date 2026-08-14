<template>
  <v-container>
    <h2 class="text-h5 mb-4">特殊学生档案</h2>
    <v-btn color="primary" @click="openCreateDialog" class="mb-4">新增学生</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>学号</th>
          <th>姓名</th>
          <th>年级</th>
          <th>班级</th>
          <th>类型</th>
          <th>关爱级别</th>
          <th>包保责任人</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in students" :key="s.id">
          <td>{{ s.student_code }}</td>
          <td>{{ s.name }}</td>
          <td>{{ gradeMap[s.grade_id]?.grade_name || '-' }}</td>
          <td>{{ classMap[s.class_id]?.class_name || '-' }}</td>
          <td>{{ s.condition_type }}</td>
          <td>{{ s.care_level?.level_name || '-' }}</td>
          <td>{{ s.responsible_teacher_name }}</td>
          <td>
            <v-chip :color="statusColor(s.status)" size="small">{{ statusText(s.status) }}</v-chip>
          </td>
          <td>
            <v-btn size="small" icon="mdi-pencil" @click="openEditDialog(s)" class="mr-1" />
            <v-btn size="small" icon="mdi-delete" color="error" @click="remove(s.id)" />
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="700">
      <v-card>
        <v-card-title>{{ isEdit ? '编辑学生' : '新增学生' }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="form.student_code" label="学号" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.name" label="姓名" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-select v-model="form.grade_id" :items="grades" item-title="grade_name" item-value="id" label="年级" />
            </v-col>
            <v-col cols="6">
              <v-select v-model="form.class_id" :items="filteredClasses" item-title="class_name" item-value="id" label="班级" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-select v-model="form.condition_type" :items="conditionTypes" label="类型" />
            </v-col>
            <v-col cols="6">
              <v-select v-model="form.care_level_id" :items="careLevels" item-title="level_name" item-value="id" label="关爱级别" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="form.guardian_name" label="监护人姓名" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.guardian_phone" label="监护人电话" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="form.community" label="所属社区" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.address" label="住址" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="form.responsible_teacher_name" label="包保责任人" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.responsible_teacher_phone" label="责任人联系方式" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="form.leader_name" label="包保领导" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.leader_phone" label="领导联系方式" />
            </v-col>
          </v-row>
          <v-textarea v-model="form.remarks" label="备注" rows="2" />
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
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const students = ref([])
const grades = ref([])
const classes = ref([])
const careLevels = ref([])
const dialog = ref(false)
const isEdit = ref(false)
const editId = ref(null)

const conditionTypes = ['心理关怀', '家庭变故', '行为偏差', '学业困难', '身体残疾', '其他']

const form = ref({
  student_code: '', name: '', grade_id: null, class_id: null,
  condition_type: '', care_level_id: null,
  guardian_name: '', guardian_phone: '', community: '', address: '',
  responsible_teacher_name: '', responsible_teacher_phone: '',
  leader_name: '', leader_phone: '', remarks: ''
})

const gradeMap = computed(() => {
  const map = {}
  grades.value.forEach(g => { map[g.id] = g })
  return map
})

const classMap = computed(() => {
  const map = {}
  classes.value.forEach(c => { map[c.id] = c })
  return map
})

const filteredClasses = computed(() => {
  if (!form.value.grade_id) return classes.value
  return classes.value.filter(c => c.grade_id === form.value.grade_id)
})

function statusColor(status) {
  return { active: 'success', paused: 'warning', closed: 'grey' }[status] || 'grey'
}

function statusText(status) {
  return { active: '关爱中', paused: '已暂缓', closed: '已结案' }[status] || status
}

function resetForm() {
  form.value = {
    student_code: '', name: '', grade_id: null, class_id: null,
    condition_type: '', care_level_id: null,
    guardian_name: '', guardian_phone: '', community: '', address: '',
    responsible_teacher_name: '', responsible_teacher_phone: '',
    leader_name: '', leader_phone: '', remarks: ''
  }
}

function openCreateDialog() {
  isEdit.value = false
  editId.value = null
  resetForm()
  dialog.value = true
}

function openEditDialog(s) {
  isEdit.value = true
  editId.value = s.id
  form.value = { ...s }
  dialog.value = true
}

async function save() {
  try {
    if (isEdit.value) {
      await api.updateStudent(editId.value, form.value)
    } else {
      await api.createStudent(form.value)
    }
    dialog.value = false
    await loadStudents()
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || e.message))
  }
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteStudent(id)
    await loadStudents()
  }
}

async function loadStudents() {
  students.value = await api.getStudents()
}

onMounted(async () => {
  grades.value = await api.getGrades()
  classes.value = await api.getClasses()
  careLevels.value = await api.getCareLevels()
  await loadStudents()
})
</script>
