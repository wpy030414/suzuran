<template>
  <v-container>
    <h2 class="text-h5 mb-4">关爱计划</h2>
    <v-btn color="primary" @click="openCreateDialog" class="mb-4">新增计划</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>发起人</th>
          <th>身份</th>
          <th>班级</th>
          <th>周期类型</th>
          <th>周期</th>
          <th>学生数</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in plans" :key="p.id">
          <td>{{ p.initiator_name }}</td>
          <td>{{ p.initiator_role === 'psychological_teacher' ? '心理教师' : '班主任' }}</td>
          <td>{{ classMap[p.class_id]?.class_name || '-' }}</td>
          <td>{{ p.period_type === 'month' ? '月' : '学期' }}</td>
          <td>{{ p.period_type === 'month' ? p.period_month : `${p.academic_year} 第${p.semester}学期` }}</td>
          <td>{{ planItemCount(p.id) }}</td>
          <td>
            <v-chip :color="p.status === 'submitted' ? 'success' : 'grey'" size="small">
              {{ p.status === 'submitted' ? '已提交' : '草稿' }}
            </v-chip>
          </td>
          <td>
            <v-btn size="small" @click="viewItems(p)">查看明细</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="800">
      <v-card>
        <v-card-title>新增关爱计划</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6">
              <v-select v-model="form.initiator_role" :items="roleOptions" item-title="text" item-value="value" label="发起人身份" />
            </v-col>
            <v-col cols="6">
              <v-select v-model="form.grade_id" :items="grades" item-title="grade_name" item-value="id" label="年级" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-select v-model="form.class_id" :items="filteredClasses" item-title="class_name" item-value="id" label="班级" />
            </v-col>
            <v-col cols="6">
              <v-select v-model="form.period_type" :items="periodOptions" item-title="text" item-value="value" label="周期类型" />
            </v-col>
          </v-row>
          <v-row v-if="form.period_type === 'month'">
            <v-col cols="6">
              <v-text-field v-model="form.period_month" type="month" label="月份" />
            </v-col>
          </v-row>
          <v-row v-if="form.period_type === 'semester'">
            <v-col cols="6">
              <v-text-field v-model="form.academic_year" label="学年（如：2025-2026）" />
            </v-col>
            <v-col cols="6">
              <v-select v-model="form.semester" :items="[1, 2]" label="学期" />
            </v-col>
          </v-row>

          <v-divider class="my-4" />
          <h3 class="text-h6 mb-2">学生明细</h3>
          <v-btn size="small" color="secondary" @click="addStudentItem" class="mb-2">添加学生</v-btn>

          <v-table density="compact" v-if="form.items.length > 0">
            <thead>
              <tr>
                <th>学生</th>
                <th>责任人</th>
                <th>计划次数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in form.items" :key="idx">
                <td>
                  <v-select v-model="item.student_id" :items="availableStudents" item-title="name" item-value="id" label="选择学生" density="compact" />
                </td>
                <td>
                  <v-text-field v-model="item.responsible_teacher_name" label="责任人" density="compact" />
                </td>
                <td>
                  <v-text-field v-model="item.planned_count" type="number" label="次数" density="compact" style="max-width: 80px" />
                </td>
                <td>
                  <v-btn size="small" icon="mdi-delete" color="error" @click="form.items.splice(idx, 1)" />
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save" :loading="saving">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="itemsDialog" max-width="600">
      <v-card>
        <v-card-title>计划明细</v-card-title>
        <v-card-text>
          <v-table density="compact">
            <thead>
              <tr>
                <th>学生</th>
                <th>责任人</th>
                <th>计划次数</th>
                <th>纳入计划</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in currentItems" :key="item.id">
                <td>{{ item.student_name }}</td>
                <td>{{ item.responsible_teacher_name }}</td>
                <td>{{ item.planned_count }}</td>
                <td>
                  <v-chip :color="item.is_checked ? 'success' : 'grey'" size="small">
                    {{ item.is_checked ? '是' : '否' }}
                  </v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="itemsDialog = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const plans = ref([])
const grades = ref([])
const classes = ref([])
const students = ref([])
const dialog = ref(false)
const itemsDialog = ref(false)
const currentItems = ref([])
const saving = ref(false)

const roleOptions = [
  { text: '班主任', value: 'teacher' },
  { text: '心理教师', value: 'psychological_teacher' }
]

const periodOptions = [
  { text: '月', value: 'month' },
  { text: '学期', value: 'semester' }
]

const form = ref({
  initiator_role: 'teacher',
  grade_id: null,
  class_id: null,
  period_type: 'month',
  period_month: '',
  academic_year: '',
  semester: 1,
  items: []
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

const availableStudents = computed(() => {
  if (!form.value.class_id) return []
  return students.value.filter(s => s.class_id === form.value.class_id)
})

function planItemCount(planId) {
  return plans.value.filter(p => p.id === planId).length > 0 ? '-' : '0'
}

function addStudentItem() {
  form.value.items.push({
    student_id: null,
    student_name: '',
    responsible_teacher_name: '',
    planned_count: 1
  })
}

function openCreateDialog() {
  form.value = {
    initiator_role: 'teacher',
    grade_id: null,
    class_id: null,
    period_type: 'month',
    period_month: '',
    academic_year: '',
    semester: 1,
    items: []
  }
  dialog.value = true
}

async function viewItems(plan) {
  const items = await api.getPlanItems({ plan_id: plan.id })
  currentItems.value = items
  itemsDialog.value = true
}

async function save() {
  if (!form.value.class_id) {
    alert('请选择班级')
    return
  }
  if (form.value.items.length === 0) {
    alert('请至少添加一名学生')
    return
  }

  // Validate items
  for (const item of form.value.items) {
    if (!item.student_id) {
      alert('请选择学生')
      return
    }
    const student = students.value.find(s => s.id === item.student_id)
    if (student) {
      item.student_name = student.name
    }
  }

  saving.value = true
  try {
    await api.createPlan(form.value)
    dialog.value = false
    await loadPlans()
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || e.message))
  } finally {
    saving.value = false
  }
}

async function loadPlans() {
  plans.value = await api.getPlans()
}

onMounted(async () => {
  grades.value = await api.getGrades()
  classes.value = await api.getClasses()
  students.value = await api.getStudents()
  await loadPlans()
})
</script>
