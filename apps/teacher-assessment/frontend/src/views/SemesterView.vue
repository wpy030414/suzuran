<template>
  <v-container>
    <h2 class="text-h5 mb-4">学期考核</h2>

    <v-btn color="primary" @click="dialog = true" class="mb-4" v-if="canManage">
      <v-icon start>mdi-plus</v-icon>发起考核
    </v-btn>

    <v-card>
      <v-table density="compact" class="overflow-x-auto">
        <thead>
          <tr>
            <th>教师ID</th>
            <th>周期ID</th>
            <th>教学常规</th>
            <th>教学活动</th>
            <th>自评总分</th>
            <th>考评总分</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="a in assessments" :key="a.id">
            <tr class="cursor-pointer" @click="toggleExpand(a.id)">
              <td>
                <v-icon size="small" class="mr-1">{{ expandedId === a.id ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
                {{ a.teacher_id }}
              </td>
              <td>{{ a.period_id }}</td>
              <td>{{ formatScore(a.teaching_standard_score) }}</td>
              <td>{{ formatScore(a.teaching_activity_score) }}</td>
              <td><span class="font-weight-bold text-info">{{ formatScore(a.self_score) }}</span></td>
              <td><span class="font-weight-bold text-primary">{{ formatScore(a.review_score) }}</span></td>
              <td>
                <div class="d-flex ga-1">
                  <v-btn size="x-small" color="primary" variant="tonal" @click.stop="calculate(a.id)">
                    <v-icon start size="small">mdi-calculator</v-icon>计算
                  </v-btn>
                  <v-btn size="x-small" color="error" variant="tonal" @click.stop="remove(a.id)" v-if="canManage">删除</v-btn>
                </div>
              </td>
            </tr>
            <tr v-if="expandedId === a.id">
              <td colspan="7" class="pa-0">
                <v-card flat class="ma-2 bg-grey-lighten-4">
                  <v-card-text>
                    <div v-if="loadingItems" class="text-center pa-4">
                      <v-progress-circular indeterminate color="primary" />
                    </div>
                    <div v-else>
                      <!-- Teaching Standard Section -->
                      <div class="mb-4">
                        <div class="text-subtitle-2 mb-2">
                          <v-icon size="small" class="mr-1">mdi-book-open-variant</v-icon>
                          教学达标奖
                          <span class="text-caption text-grey ml-2">
                            自评: {{ formatScore(standardSelfTotal) }} / 考评: {{ formatScore(standardReviewTotal) }}
                          </span>
                        </div>
                        <v-table density="compact">
                          <thead>
                            <tr>
                              <th>项目</th>
                              <th>满分</th>
                              <th>自评分</th>
                              <th>考评分</th>
                              <th v-if="canManage">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="item in standardItems" :key="item.id">
                              <td>{{ item.item_name }}</td>
                              <td>{{ formatScore(item.max_score) }}</td>
                              <td>
                                <v-text-field
                                  v-if="canManage"
                                  :model-value="item.self_score"
                                  type="number"
                                  min="0"
                                  :max="item.max_score"
                                  step="0.5"
                                  density="compact"
                                  hide-details
                                  variant="underlined"
                                  style="max-width: 100px"
                                  @update:model-value="val => updateItemScore(a.id, item.id, 'self_score', val)"
                                />
                                <span v-else>{{ formatScore(item.self_score) }}</span>
                              </td>
                              <td>
                                <v-text-field
                                  v-if="canManage"
                                  :model-value="item.review_score"
                                  type="number"
                                  min="0"
                                  :max="item.max_score"
                                  step="0.5"
                                  density="compact"
                                  hide-details
                                  variant="underlined"
                                  style="max-width: 100px"
                                  @update:model-value="val => updateItemScore(a.id, item.id, 'review_score', val)"
                                />
                                <span v-else>{{ formatScore(item.review_score) }}</span>
                              </td>
                              <td v-if="canManage"></td>
                            </tr>
                          </tbody>
                        </v-table>
                      </div>

                      <!-- Teaching Activity Section -->
                      <div v-if="activityItems.length > 0">
                        <div class="text-subtitle-2 mb-2">
                          <v-icon size="small" class="mr-1">mdi-trophy</v-icon>
                          教学活动奖
                          <span class="text-caption text-grey ml-2">
                            自评: {{ formatScore(activitySelfTotal) }} / 考评: {{ formatScore(activityReviewTotal) }}
                          </span>
                        </div>
                        <v-table density="compact">
                          <thead>
                            <tr>
                              <th>项目</th>
                              <th>满分</th>
                              <th>自评分</th>
                              <th>考评分</th>
                              <th v-if="canManage">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="item in activityItems" :key="item.id">
                              <td>{{ item.item_name }}</td>
                              <td>{{ formatScore(item.max_score) }}</td>
                              <td>
                                <v-text-field
                                  v-if="canManage"
                                  :model-value="item.self_score"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  density="compact"
                                  hide-details
                                  variant="underlined"
                                  style="max-width: 100px"
                                  @update:model-value="val => updateItemScore(a.id, item.id, 'self_score', val)"
                                />
                                <span v-else>{{ formatScore(item.self_score) }}</span>
                              </td>
                              <td>
                                <v-text-field
                                  v-if="canManage"
                                  :model-value="item.review_score"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  density="compact"
                                  hide-details
                                  variant="underlined"
                                  style="max-width: 100px"
                                  @update:model-value="val => updateItemScore(a.id, item.id, 'review_score', val)"
                                />
                                <span v-else>{{ formatScore(item.review_score) }}</span>
                              </td>
                              <td v-if="canManage"></td>
                            </tr>
                          </tbody>
                        </v-table>
                      </div>

                      <!-- Totals -->
                      <v-divider class="my-3" />
                      <div class="d-flex justify-end gap-4">
                        <v-chip color="info" variant="tonal">
                          自评总分: {{ formatScore(selfTotal) }}
                        </v-chip>
                        <v-chip color="primary" variant="tonal">
                          考评总分: {{ formatScore(reviewTotal) }}
                        </v-chip>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </td>
            </tr>
          </template>
          <tr v-if="assessments.length === 0">
            <td colspan="7" class="text-center text-grey pa-4">暂无数据</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Create Dialog -->
    <v-dialog v-model="dialog" max-width="500" :fullscreen="isMobile">
      <v-card>
        <v-card-title>发起学期考核</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.teacher_id" type="number" label="教师ID *" :error-messages="errors.teacher_id" />
          <v-text-field v-model="form.period_id" type="number" label="周期ID *" :error-messages="errors.period_id" />
          <p class="text-caption text-grey mt-2">
            系统将自动创建预置考核项目：成长手册(90分) + 听课记录(10分)，并拉取学期获奖类别作为教学活动奖项目。
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">创建</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const assessments = ref([])
const allItems = ref([])
const expandedId = ref(null)
const loadingItems = ref(false)
const dialog = ref(false)
const isMobile = ref(window.innerWidth < 600)

const form = ref({ teacher_id: '', period_id: '' })
const errors = ref({})

const currentRole = localStorage.getItem('user_role') || 'admin'
const canManage = ['admin', 'director'].includes(currentRole)

const standardItems = computed(() => allItems.value.filter(i => i.category === 'teaching_standard'))
const activityItems = computed(() => allItems.value.filter(i => i.category === 'teaching_activity'))

const standardSelfTotal = computed(() => standardItems.value.reduce((s, i) => s + parseFloat(i.self_score || 0), 0))
const standardReviewTotal = computed(() => standardItems.value.reduce((s, i) => s + parseFloat(i.review_score || 0), 0))
const activitySelfTotal = computed(() => activityItems.value.reduce((s, i) => s + parseFloat(i.self_score || 0), 0))
const activityReviewTotal = computed(() => activityItems.value.reduce((s, i) => s + parseFloat(i.review_score || 0), 0))

const selfTotal = computed(() => standardSelfTotal.value + activitySelfTotal.value)
const reviewTotal = computed(() => standardReviewTotal.value + activityReviewTotal.value)

function formatScore(val) {
  const num = parseFloat(val)
  return isNaN(num) ? '--' : num.toFixed(1)
}

async function toggleExpand(id) {
  if (expandedId.value === id) {
    expandedId.value = null
    return
  }
  expandedId.value = id
  loadingItems.value = true
  try {
    allItems.value = await api.getSemesterItems(id)
  } catch (e) {
    console.error(e)
    allItems.value = []
  }
  loadingItems.value = false
}

async function updateItemScore(assessmentId, itemId, field, value) {
  const num = parseFloat(value)
  if (isNaN(num) || num < 0 || num > 100) return
  try {
    await api.updateSemesterItem(assessmentId, itemId, { [field]: num })
    // Update local state
    const item = allItems.value.find(i => i.id === itemId)
    if (item) item[field] = num
  } catch (e) {
    console.error(e)
  }
}

async function calculate(id) {
  try {
    await api.calculateSemester(id)
    assessments.value = await api.getSemesterAssessments()
    // Refresh items if expanded
    if (expandedId.value === id) {
      allItems.value = await api.getSemesterItems(id)
    }
  } catch (e) {
    console.error(e)
  }
}

async function save() {
  const e = {}
  if (!form.value.teacher_id) e.teacher_id = '必填'
  if (!form.value.period_id) e.period_id = '必填'
  errors.value = e
  if (Object.keys(e).length > 0) return

  try {
    await api.createSemesterAssessment({
      teacher_id: parseInt(form.value.teacher_id),
      period_id: parseInt(form.value.period_id),
    })
    dialog.value = false
    form.value = { teacher_id: '', period_id: '' }
    errors.value = {}
    assessments.value = await api.getSemesterAssessments()
  } catch (err) {
    console.error(err)
  }
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteSemesterAssessment(id)
    assessments.value = await api.getSemesterAssessments()
  }
}

onMounted(async () => {
  assessments.value = await api.getSemesterAssessments()
})
</script>

<style scoped>
.cursor-pointer { cursor: pointer; }
.cursor-pointer:hover { background-color: rgba(0,0,0,0.04); }
</style>
