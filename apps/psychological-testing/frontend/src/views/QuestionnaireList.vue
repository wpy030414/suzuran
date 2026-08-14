<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h2 class="text-h5">问卷管理</h2>
      <v-spacer />
      <v-btn
        v-if="userRole !== 'student'"
        color="primary"
        prepend-icon="mdi-plus"
        to="/questionnaires/new"
      >
        新增问卷
      </v-btn>
    </div>

    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="search"
              label="搜索问卷"
              prepend-inner-icon="mdi-magnify"
              clearable
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="statusFilter"
              :items="statusOptions"
              label="状态筛选"
              clearable
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col
        v-for="q in filteredQuestionnaires"
        :key="q.id"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card>
          <v-card-title class="d-flex align-center">
            <span>{{ q.title }}</span>
            <v-spacer />
            <v-chip
              :color="q.status === 'active' ? 'success' : 'grey'"
              size="small"
            >
              {{ q.status === 'active' ? '启用' : '禁用' }}
            </v-chip>
          </v-card-title>
          <v-card-subtitle>{{ q.description }}</v-card-subtitle>
          <v-card-text>
            <div v-if="q.dimension_tags && q.dimension_tags.length > 0" class="mb-2">
              <v-chip
                v-for="tag in q.dimension_tags"
                :key="tag"
                size="x-small"
                class="mr-1 mb-1"
                color="primary"
                variant="outlined"
              >
                {{ tag }}
              </v-chip>
            </div>
            <div class="text-caption text-grey">
              题目数: {{ getQuestionCount(q.questions) }}
              <span v-if="q.total_students"> | 已测试: {{ q.total_students }} 人</span>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn
              v-if="userRole !== 'student'"
              size="small"
              color="primary"
              variant="text"
              :to="`/questionnaires/${q.id}/edit`"
            >
              编辑
            </v-btn>
            <v-btn
              v-if="userRole === 'admin'"
              size="small"
              color="error"
              variant="text"
              @click="remove(q.id)"
            >
              删除
            </v-btn>
            <v-spacer />
            <v-btn
              v-if="userRole !== 'student'"
              size="small"
              color="secondary"
              variant="outlined"
              @click="openDistribute(q)"
            >
              分发
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="distributeDialog" max-width="600">
      <v-card>
        <v-card-title>分发问卷给 students</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="studentListText"
            label="学生列表（JSON 格式）"
            rows="8"
            hint='[{"id": 1, "name": "张三", "grade": "高一", "class_name": "1班"}]'
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="distributeDialog = false">取消</v-btn>
          <v-btn color="primary" @click="doDistribute">分发</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const questionnaires = ref([])
const search = ref('')
const statusFilter = ref(null)
const distributeDialog = ref(false)
const currentQuestionnaire = ref(null)
const studentListText = ref('')
const userRole = ref('student')

const statusOptions = [
  { title: '启用', value: 'active' },
  { title: '禁用', value: 'inactive' }
]

const filteredQuestionnaires = computed(() => {
  return questionnaires.value.filter(q => {
    if (search.value && !q.title.includes(search.value) && !q.description?.includes(search.value)) {
      return false
    }
    if (statusFilter.value && q.status !== statusFilter.value) {
      return false
    }
    return true
  })
})

function getQuestionCount(questions) {
  try {
    const arr = typeof questions === 'string' ? JSON.parse(questions) : questions
    return Array.isArray(arr) ? arr.length : 0
  } catch {
    return 0
  }
}

function openDistribute(q) {
  currentQuestionnaire.value = q
  studentListText.value = ''
  distributeDialog.value = true
}

async function doDistribute() {
  try {
    const students = JSON.parse(studentListText.value)
    if (!Array.isArray(students)) {
      alert('学生列表必须是数组')
      return
    }
    await api.distributeQuestionnaire(currentQuestionnaire.value.id, students)
    distributeDialog.value = false
    questionnaires.value = await api.getQuestionnaires()
    alert('分发成功')
  } catch (e) {
    alert('分发失败: ' + e.message)
  }
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteQuestionnaire(id)
    questionnaires.value = await api.getQuestionnaires()
  }
}

onMounted(async () => {
  userRole.value = localStorage.getItem('userRole') || 'student'
  questionnaires.value = await api.getQuestionnaires()
})
</script>
