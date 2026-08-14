<template>
  <v-container>
    <div class="d-flex align-center mb-4 flex-wrap ga-2">
      <h2 class="text-h5">评价记录</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">新建评价</v-btn>
    </div>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" sm="3">
        <v-text-field v-model="filterAcademicYear" label="学年" clearable density="compact" />
      </v-col>
      <v-col cols="12" sm="3">
        <v-select v-model="filterSemester" :items="['第一学期', '第二学期']" label="学期" clearable density="compact" />
      </v-col>
      <v-col cols="12" sm="3">
        <v-select v-model="filterClassroom" :items="classrooms" item-title="name" item-value="id" label="班级" clearable density="compact" @update:model-value="onClassroomFilterChange" />
      </v-col>
      <v-col cols="12" sm="3">
        <v-select v-model="filterStudent" :items="filteredStudents" item-title="name" item-value="id" label="学生" clearable density="compact" />
      </v-col>
    </v-row>

    <!-- Assessment list -->
    <v-alert v-if="filteredAssessments.length === 0" type="info" variant="tonal">暂无评价记录</v-alert>
    <v-table v-else density="compact">
      <thead>
        <tr>
          <th>学年</th>
          <th>学期</th>
          <th>班级</th>
          <th>学生</th>
          <th>年级</th>
          <th>类型</th>
          <th>评价时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in filteredAssessments" :key="a.id">
          <td>{{ a.academic_year }}</td>
          <td>{{ a.semester }}</td>
          <td>{{ getClassroomName(a.classroom_id) }}</td>
          <td>{{ a.student_name }}</td>
          <td>{{ a.grade_level }}</td>
          <td>
            <v-chip :color="a.template_type === 'composition' ? 'blue' : 'green'" size="x-small" label>
              {{ a.template_type === 'composition' ? '习作' : '口语' }}
            </v-chip>
          </td>
          <td>{{ formatDate(a.assessed_at) }}</td>
          <td>
            <v-btn size="x-small" color="error" variant="text" @click="remove(a.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Create dialog -->
    <v-dialog v-model="dialog" max-width="800" scrollable>
      <v-card>
        <v-card-title>新建评价</v-card-title>
        <v-card-text>
          <!-- Academic year/semester -->
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.academic_year" label="学年" readonly density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="form.semester" :items="['第一学期', '第二学期']" label="学期" density="compact" />
            </v-col>
          </v-row>

          <!-- Classroom & Student -->
          <v-row>
            <v-col cols="12" sm="6">
              <v-select v-model="form.classroom_id" :items="classrooms" item-title="name" item-value="id" label="班级" density="compact" @update:model-value="onClassroomChange" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="form.student_id" :items="currentStudents" item-title="name" item-value="id" label="学生" density="compact" @update:model-value="onStudentChange" />
            </v-col>
          </v-row>

          <!-- Grade level display -->
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="gradeLevel" label="年级" readonly density="compact" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="form.template_type" :items="typeOptions" item-title="text" item-value="value" label="评价类型" density="compact" @update:model-value="onTemplateTypeChange" />
            </v-col>
          </v-row>

          <!-- Template selector -->
          <v-row>
            <v-col cols="12">
              <v-select v-model="form.template_id" :items="filteredTemplates" item-title="text_title" item-value="id" label="评价模板" density="compact" @update:model-value="onTemplateChange" />
            </v-col>
          </v-row>

          <v-divider class="my-3" />

          <!-- Dimension evaluations -->
          <div v-if="currentTemplate" class="mb-3">
            <div class="text-subtitle-2 mb-2">维度评价</div>
            <v-card v-for="(dim, di) in currentTemplate.dimensions" :key="di" variant="outlined" class="mb-2">
              <v-card-text>
                <div class="font-weight-medium mb-2">{{ dim.name }}</div>
                <v-row>
                  <v-col cols="12" sm="4">
                    <v-select
                      v-model="form.dimension_evaluations[di].student_grade"
                      :items="getGradeOptions(dim)"
                      label="学生自评等级"
                      density="compact"
                    />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-select
                      v-model="form.dimension_evaluations[di].teacher_grade"
                      :items="getGradeOptions(dim)"
                      label="教师评价等级"
                      density="compact"
                      @update:model-value="generateComment(di)"
                    />
                  </v-col>
                  <v-col cols="12" sm="4">
                    <v-text-field
                      v-model="form.dimension_evaluations[di].generated_comment"
                      label="自动生成评语"
                      readonly
                      density="compact"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </div>

          <!-- Image upload placeholder -->
          <v-row>
            <v-col cols="12">
              <v-textarea v-model="imageUrlsText" label="图片URLs (每行一个)" rows="2" density="compact" />
            </v-col>
          </v-row>

          <!-- Highlights -->
          <v-row>
            <v-col cols="12">
              <v-checkbox-group v-model="form.highlights" inline>
                <v-checkbox label="优秀作品" value="优秀作品" density="compact" />
                <v-checkbox label="进步显著" value="进步显著" density="compact" />
                <v-checkbox label="创意突出" value="创意突出" density="compact" />
              </v-checkbox-group>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save" :disabled="!canSave">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const assessments = ref([])
const classrooms = ref([])
const templates = ref([])
const dialog = ref(false)

const filterAcademicYear = ref('')
const filterSemester = ref('')
const filterClassroom = ref(null)
const filterStudent = ref(null)

const typeOptions = [
  { text: '习作', value: 'composition' },
  { text: '口语', value: 'oral' },
]

const form = ref(createEmptyForm())
const currentStudents = ref([])
const currentTemplate = ref(null)
const imageUrlsText = ref('')

function createEmptyForm() {
  return {
    academic_year: '',
    semester: '第一学期',
    classroom_id: null,
    student_id: null,
    student_name: '',
    template_type: 'composition',
    template_id: null,
    dimension_evaluations: [],
    image_urls: [],
    highlights: [],
  }
}

const gradeLevel = computed(() => {
  if (!form.value.classroom_id || !form.value.academic_year) return ''
  const classroom = classrooms.value.find(c => c.id === form.value.classroom_id)
  if (!classroom) return ''
  const match = classroom.name.match(/^(\d{4})级/)
  if (!match) return ''
  const yearMatch = form.value.academic_year.match(/^(\d{4})-/)
  if (!yearMatch) return ''
  const enrollmentYear = parseInt(match[1])
  const academicYearStart = parseInt(yearMatch[1])
  const diff = academicYearStart - enrollmentYear
  const gradeNames = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
  if (diff < 0 || diff >= gradeNames.length) return ''
  return gradeNames[diff]
})

const filteredTemplates = computed(() => {
  if (!form.value.template_type || !gradeLevel.value) return []
  return templates.value.filter(t =>
    t.template_type === form.value.template_type && t.grade_level === gradeLevel.value
  )
})

const filteredStudents = computed(() => {
  if (!filterClassroom.value) return []
  const classroom = classrooms.value.find(c => c.id === filterClassroom.value)
  if (!classroom) return []
  return typeof classroom.student_ids === 'string' ? JSON.parse(classroom.student_ids) : classroom.student_ids
})

const filteredAssessments = computed(() => {
  return assessments.value.filter(a => {
    if (filterAcademicYear.value && a.academic_year !== filterAcademicYear.value) return false
    if (filterSemester.value && a.semester !== filterSemester.value) return false
    if (filterClassroom.value && a.classroom_id !== filterClassroom.value) return false
    if (filterStudent.value && a.student_id !== filterStudent.value) return false
    return true
  })
})

const canSave = computed(() => {
  const f = form.value
  if (!f.academic_year || !f.semester || !f.classroom_id || !f.student_id || !f.template_id) return false
  if (f.dimension_evaluations.length === 0) return false
  for (const ev of f.dimension_evaluations) {
    if (!ev.teacher_grade) return false
  }
  return true
})

function getClassroomName(id) {
  const c = classrooms.value.find(c => c.id === id)
  return c ? c.name : ''
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN')
}

function getGradeOptions(dim) {
  return dim.standards.map(s => s.grade)
}

function generateComment(dimIndex) {
  if (!currentTemplate.value) return
  const dim = currentTemplate.value.dimensions[dimIndex]
  const teacherGrade = form.value.dimension_evaluations[dimIndex].teacher_grade
  const standard = dim.standards.find(s => s.grade === teacherGrade)
  form.value.dimension_evaluations[dimIndex].generated_comment = standard ? standard.description : ''
}

function onClassroomChange(classroomId) {
  const classroom = classrooms.value.find(c => c.id === classroomId)
  if (classroom) {
    currentStudents.value = typeof classroom.student_ids === 'string' ? JSON.parse(classroom.student_ids) : classroom.student_ids
  } else {
    currentStudents.value = []
  }
  form.value.student_id = null
  form.value.student_name = ''
}

function onStudentChange(studentId) {
  const student = currentStudents.value.find(s => s.id === studentId)
  form.value.student_name = student ? student.name : ''
}

function onClassroomFilterChange() {
  filterStudent.value = null
}

function onTemplateTypeChange() {
  form.value.template_id = null
  currentTemplate.value = null
  form.value.dimension_evaluations = []
}

function onTemplateChange(templateId) {
  const tpl = templates.value.find(t => t.id === templateId)
  if (tpl) {
    const dims = typeof tpl.dimensions === 'string' ? JSON.parse(tpl.dimensions) : tpl.dimensions
    currentTemplate.value = { ...tpl, dimensions: dims }
    form.value.dimension_evaluations = dims.map(dim => ({
      dimension: dim.name,
      student_grade: '',
      teacher_grade: '',
      generated_comment: '',
    }))
  } else {
    currentTemplate.value = null
    form.value.dimension_evaluations = []
  }
}

function openCreate() {
  form.value = createEmptyForm()
  currentTemplate.value = null
  imageUrlsText.value = ''
  // Auto-fill academic year
  api.getCurrentCalendar().then(cal => {
    form.value.academic_year = cal.academicYear
    form.value.semester = cal.semester
  })
  dialog.value = true
}

async function save() {
  try {
    const imageUrls = imageUrlsText.value.split('\n').filter(s => s.trim())
    await api.createAssessment({
      ...form.value,
      image_urls: imageUrls,
    })
    dialog.value = false
    assessments.value = await api.getAssessments()
  } catch (e) {
    alert(e.response?.data?.error || '保存失败')
  }
}

async function remove(id) {
  if (confirm('确定删除此评价记录？')) {
    await api.deleteAssessment(id)
    assessments.value = await api.getAssessments()
  }
}

onMounted(async () => {
  classrooms.value = await api.getClassrooms()
  templates.value = await api.getTemplates()
  assessments.value = await api.getAssessments()
})
</script>
