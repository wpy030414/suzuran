<template>
  <v-container>
    <div class="d-flex align-center mb-4 flex-wrap ga-2">
      <h2 class="text-h5">成绩单</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="dialog = true">生成成绩单</v-btn>
    </div>

    <!-- Report cards list -->
    <v-alert v-if="reportCards.length === 0" type="info" variant="tonal">暂无成绩单</v-alert>
    <v-table v-else density="compact">
      <thead>
        <tr>
          <th>学年</th>
          <th>学期</th>
          <th>班级</th>
          <th>学生</th>
          <th>习作次数</th>
          <th>口语次数</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in reportCards" :key="r.id">
          <td>{{ r.academic_year }}</td>
          <td>{{ r.semester }}</td>
          <td>{{ r.classroom_name }}</td>
          <td>{{ r.student_name }}</td>
          <td>{{ r.total_composition_count }}</td>
          <td>{{ r.total_oral_count }}</td>
          <td>
            <v-btn size="small" color="primary" variant="text" @click="viewDetail(r.id)">查看</v-btn>
            <v-btn size="small" color="error" variant="text" @click="remove(r.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Generate dialog -->
    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>生成成绩单</v-card-title>
        <v-card-text>
          <v-select v-model="form.classroom_id" :items="classrooms" item-title="name" item-value="id" label="班级" @update:model-value="onClassroomChange" />
          <v-select v-model="form.student_id" :items="currentStudents" item-title="name" item-value="id" label="学生" />
          <v-text-field v-model="form.academic_year" label="学年" />
          <v-select v-model="form.semester" :items="['第一学期', '第二学期']" label="学期" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="generate">生成</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Detail dialog -->
    <v-dialog v-model="detailDialog" max-width="900" scrollable>
      <v-card v-if="detailData">
        <v-card-title>
          <div class="d-flex align-center ga-2">
            <span>{{ detailData.academic_year }} {{ detailData.student_name }} 表现评价</span>
            <v-spacer />
            <v-btn size="small" variant="text" @click="detailDialog = false">关闭</v-btn>
          </div>
        </v-card-title>
        <v-card-text>
          <div class="text-body-1 mb-4">
            班级：{{ detailData.classroom_name }} | 学期：{{ detailData.semester }}
          </div>

          <!-- Composition records -->
          <div v-if="detailData.composition_records.length > 0">
            <h3 class="text-h6 mb-2">习作评价 (共 {{ detailData.total_composition_count }} 次)</h3>
            <v-card v-for="rec in detailData.composition_records" :key="rec.id" variant="outlined" class="mb-3">
              <v-card-title class="text-subtitle-1">{{ rec.text_title }}</v-card-title>
              <v-card-text>
                <div class="text-caption text-grey mb-2">{{ formatDate(rec.assessed_at) }}</div>
                <div v-for="(ev, ei) in rec.dimension_evaluations" :key="ei" class="mb-2">
                  <div class="font-weight-medium">{{ ev.dimension }}</div>
                  <div class="d-flex ga-2 mb-1">
                    <v-chip size="x-small" color="blue">学生: {{ ev.student_grade }}</v-chip>
                    <v-chip size="x-small" color="green">教师: {{ ev.teacher_grade }}</v-chip>
                  </div>
                  <div class="text-body-2 text-grey-darken-1">{{ ev.generated_comment }}</div>
                </div>
                <div v-if="rec.highlights && rec.highlights.length > 0" class="mt-2">
                  <v-chip v-for="h in rec.highlights" :key="h" size="small" color="orange" class="mr-1">{{ h }}</v-chip>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Oral records -->
          <div v-if="detailData.oral_records.length > 0" class="mt-4">
            <h3 class="text-h6 mb-2">口语评价 (共 {{ detailData.total_oral_count }} 次)</h3>
            <v-card v-for="rec in detailData.oral_records" :key="rec.id" variant="outlined" class="mb-3">
              <v-card-title class="text-subtitle-1">{{ rec.text_title }}</v-card-title>
              <v-card-text>
                <div class="text-caption text-grey mb-2">{{ formatDate(rec.assessed_at) }}</div>
                <div v-for="(ev, ei) in rec.dimension_evaluations" :key="ei" class="mb-2">
                  <div class="font-weight-medium">{{ ev.dimension }}</div>
                  <div class="d-flex ga-2 mb-1">
                    <v-chip size="x-small" color="blue">学生: {{ ev.student_grade }}</v-chip>
                    <v-chip size="x-small" color="green">教师: {{ ev.teacher_grade }}</v-chip>
                  </div>
                  <div class="text-body-2 text-grey-darken-1">{{ ev.generated_comment }}</div>
                </div>
                <div v-if="rec.highlights && rec.highlights.length > 0" class="mt-2">
                  <v-chip v-for="h in rec.highlights" :key="h" size="small" color="orange" class="mr-1">{{ h }}</v-chip>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <v-alert v-if="detailData.composition_records.length === 0 && detailData.oral_records.length === 0" type="info" variant="tonal">
            该学生在该学期暂无评价记录
          </v-alert>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const reportCards = ref([])
const classrooms = ref([])
const dialog = ref(false)
const detailDialog = ref(false)
const detailData = ref(null)
const currentStudents = ref([])

const form = ref({
  classroom_id: null,
  student_id: null,
  academic_year: '',
  semester: '第一学期',
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN')
}

function onClassroomChange(classroomId) {
  const classroom = classrooms.value.find(c => c.id === classroomId)
  if (classroom) {
    currentStudents.value = typeof classroom.student_ids === 'string' ? JSON.parse(classroom.student_ids) : classroom.student_ids
  } else {
    currentStudents.value = []
  }
  form.value.student_id = null
}

async function generate() {
  try {
    await api.generateReportCard(form.value)
    dialog.value = false
    reportCards.value = await api.getReportCards()
  } catch (e) {
    alert(e.response?.data?.error || '生成失败')
  }
}

async function viewDetail(id) {
  detailData.value = await api.getReportCardDetail(id)
  detailDialog.value = true
}

async function remove(id) {
  if (confirm('确定删除此成绩单？')) {
    await api.deleteReportCard(id)
    reportCards.value = await api.getReportCards()
  }
}

onMounted(async () => {
  classrooms.value = await api.getClassrooms()
  reportCards.value = await api.getReportCards()
})
</script>
