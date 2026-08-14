<template>
  <v-container>
    <div class="d-flex align-center mb-4 flex-wrap ga-2">
      <h2 class="text-h5">评价模板</h2>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">新建模板</v-btn>
    </div>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" sm="4">
        <v-select v-model="filterType" :items="typeOptions" label="模板类型" clearable density="compact" />
      </v-col>
      <v-col cols="12" sm="4">
        <v-select v-model="filterGrade" :items="gradeOptions" label="年级" clearable density="compact" />
      </v-col>
      <v-col cols="12" sm="4">
        <v-text-field v-model="searchText" label="搜索课文标题" clearable density="compact" prepend-inner-icon="mdi-magnify" />
      </v-col>
    </v-row>

    <!-- Template cards -->
    <v-alert v-if="filteredTemplates.length === 0" type="info" variant="tonal">暂无符合条件的模板</v-alert>
    <v-expansion-panels v-else multiple>
      <v-expansion-panel v-for="t in filteredTemplates" :key="t.id">
        <v-expansion-panel-title>
          <div class="d-flex align-center ga-3 flex-wrap">
            <v-chip :color="t.template_type === 'composition' ? 'blue' : 'green'" size="small" label>
              {{ t.template_type === 'composition' ? '习作' : '口语' }}
            </v-chip>
            <span class="font-weight-medium">{{ t.grade_level }}</span>
            <span class="text-grey">{{ t.text_title }}</span>
            <span class="text-caption text-grey-lighten-1">
              ({{ parseDimensions(t.dimensions).length }} 个维度)
            </span>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-table density="compact">
            <thead><tr><th>维度</th><th>要点</th><th>等级标准</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="(dim, di) in parseDimensions(t.dimensions)" :key="di">
                <td class="font-weight-medium" style="min-width:100px">{{ dim.name }}</td>
                <td style="min-width:150px">{{ dim.key_points }}</td>
                <td style="min-width:300px">
                  <div v-for="(s, si) in dim.standards" :key="si" class="mb-1">
                    <v-chip size="x-small" color="primary" class="mr-1">{{ s.grade }}</v-chip>
                    <span class="text-caption">{{ s.description }}</span>
                  </div>
                </td>
                <td>
                  <v-btn size="x-small" color="error" variant="text" @click.stop="remove(t.id)">删除</v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Create dialog -->
    <v-dialog v-model="dialog" max-width="900" scrollable>
      <v-card>
        <v-card-title>新建评价模板</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" sm="4">
              <v-select v-model="form.template_type" :items="typeOptions" item-title="text" item-value="value" label="模板类型" @update:model-value="onTypeChange" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-select v-model="form.grade_level" :items="gradeOptions" label="年级" />
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="form.text_title" label="课文标题" />
            </v-col>
          </v-row>

          <v-divider class="my-3" />
          <div class="text-subtitle-2 mb-2">维度设置 ({{ form.dimensions.length }} / {{ expectedDimCount }})</div>

          <v-alert v-if="form.dimensions.length !== expectedDimCount" type="warning" variant="tonal" density="compact" class="mb-3">
            {{ form.template_type === 'composition' ? '习作' : '口语' }}模板需要 {{ expectedDimCount }} 个维度
          </v-alert>

          <v-card v-for="(dim, di) in form.dimensions" :key="di" variant="outlined" class="mb-3">
            <v-card-text>
              <v-row>
                <v-col cols="12" sm="5">
                  <v-text-field v-model="dim.name" label="维度名称" density="compact" />
                </v-col>
                <v-col cols="12" sm="5">
                  <v-text-field v-model="dim.key_points" label="要点" density="compact" />
                </v-col>
                <v-col cols="12" sm="2" class="d-flex align-center">
                  <v-btn size="small" color="error" variant="text" @click="removeDimension(di)" :disabled="form.dimensions.length <= 1">
                    删除维度
                  </v-btn>
                </v-col>
              </v-row>

              <div class="text-caption text-grey mb-1">等级标准 ({{ dim.standards.length }} / {{ expectedGradeCount }})</div>
              <v-row v-for="(std, si) in dim.standards" :key="si" dense>
                <v-col cols="12" sm="3">
                  <v-text-field v-model="std.grade" :label="`等级 ${si + 1}`" density="compact" />
                </v-col>
                <v-col cols="12" sm="9">
                  <v-text-field v-model="std.description" label="评价标准描述" density="compact" />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-btn variant="tonal" size="small" prepend-icon="mdi-plus" @click="addDimension" :disabled="form.dimensions.length >= expectedDimCount">
            添加维度
          </v-btn>
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

const templates = ref([])
const dialog = ref(false)
const filterType = ref(null)
const filterGrade = ref(null)
const searchText = ref('')

const typeOptions = [
  { text: '习作', value: 'composition' },
  { text: '口语', value: 'oral' },
]
const gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']

const compositionGrades = ['优秀', '良好', '较好', '中等', '加油']
const oralGrades = ['优秀/良好', '较好/中等', '加油']

const compositionDimNames = ['创意与主题', '内容与细节', '情感与体验', '结构与表达', '书写与格式']
const oralDimNames = ['内容(说什么)', '表达(怎么说)', '态度(怎么沟通)', '效果(沟通结果)']

function emptyDimension(type, index) {
  const grades = type === 'composition' ? compositionGrades : oralGrades
  const names = type === 'composition' ? compositionDimNames : oralDimNames
  return {
    name: names[index] || '',
    key_points: '',
    standards: grades.map(g => ({ grade: g, description: '' })),
  }
}

const form = ref(createEmptyForm())

function createEmptyForm() {
  return {
    template_type: 'composition',
    grade_level: '三年级',
    text_title: '',
    dimensions: Array.from({ length: 5 }, (_, i) => emptyDimension('composition', i)),
  }
}

const expectedDimCount = computed(() => form.value.template_type === 'composition' ? 5 : 4)
const expectedGradeCount = computed(() => form.value.template_type === 'composition' ? 5 : 3)

const canSave = computed(() => {
  const f = form.value
  if (!f.template_type || !f.grade_level || !f.text_title) return false
  if (f.dimensions.length !== expectedDimCount.value) return false
  for (const dim of f.dimensions) {
    if (!dim.name) return false
    if (dim.standards.length !== expectedGradeCount.value) return false
    for (const s of dim.standards) {
      if (!s.grade || !s.description) return false
    }
  }
  return true
})

function onTypeChange(type) {
  const expected = type === 'composition' ? 5 : 4
  if (form.value.dimensions.length !== expected) {
    form.value.dimensions = Array.from({ length: expected }, (_, i) => emptyDimension(type, i))
  }
}

function addDimension() {
  if (form.value.dimensions.length < expectedDimCount.value) {
    form.value.dimensions.push(emptyDimension(form.value.template_type, form.value.dimensions.length))
  }
}

function removeDimension(index) {
  form.value.dimensions.splice(index, 1)
}

function parseDimensions(dims) {
  if (typeof dims === 'string') {
    try { return JSON.parse(dims) } catch { return [] }
  }
  return Array.isArray(dims) ? dims : []
}

const filteredTemplates = computed(() => {
  return templates.value.filter(t => {
    if (filterType.value && t.template_type !== filterType.value) return false
    if (filterGrade.value && t.grade_level !== filterGrade.value) return false
    if (searchText.value && !t.text_title.includes(searchText.value)) return false
    return true
  })
})

function openCreate() {
  form.value = createEmptyForm()
  dialog.value = true
}

async function save() {
  try {
    await api.createTemplate(form.value)
    dialog.value = false
    templates.value = await api.getTemplates()
  } catch (e) {
    alert(e.response?.data?.error || '保存失败')
  }
}

async function remove(id) {
  if (confirm('确定删除此模板？')) {
    await api.deleteTemplate(id)
    templates.value = await api.getTemplates()
  }
}

onMounted(async () => { templates.value = await api.getTemplates() })
</script>
