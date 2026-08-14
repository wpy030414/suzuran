<template>
  <v-container>
    <h2 class="text-h5 mb-4">学年考核</h2>

    <v-btn color="primary" @click="dialog = true" class="mb-4" v-if="canManage">
      <v-icon start>mdi-plus</v-icon>新建考核
    </v-btn>

    <v-card>
      <v-table density="compact" class="overflow-x-auto">
        <thead>
          <tr>
            <th>教师ID</th>
            <th>周期ID</th>
            <th>基本分</th>
            <th>加分</th>
            <th>扣分</th>
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
              <td>
                <div class="d-flex align-center ga-1">
                  <span>{{ formatScore(basicTotal(a)) }}</span>
                </div>
              </td>
              <td class="text-success">+{{ formatScore(a.bonus_score) }}</td>
              <td class="text-error">-{{ formatScore(a.deduction_score) }}</td>
              <td><span class="font-weight-bold text-info">{{ formatScore(a.self_total) }}</span></td>
              <td><span class="font-weight-bold text-primary">{{ formatScore(a.review_total || a.total_score) }}</span></td>
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
              <td colspan="8" class="pa-0">
                <v-card flat class="ma-2 bg-grey-lighten-4">
                  <v-card-text>
                    <div v-if="loadingItems" class="text-center pa-4">
                      <v-progress-circular indeterminate color="primary" />
                    </div>
                    <div v-else>
                      <!-- Basic Scores Section (德能勤绩) -->
                      <div class="mb-4">
                        <div class="text-subtitle-2 mb-2">
                          <v-icon size="small" class="mr-1">mdi-star</v-icon>
                          基本分
                          <span class="text-caption text-grey ml-2">
                            自评: {{ formatScore(basicSelfTotal) }} / 考评: {{ formatScore(basicReviewTotal) }}
                          </span>
                        </div>
                        <!-- Bar chart for 德能勤绩 -->
                        <v-row class="mb-2">
                          <v-col cols="12" md="6">
                            <div class="text-caption text-grey mb-1">自评分布</div>
                            <div v-for="item in basicItems" :key="'self-'+item.id" class="d-flex align-center mb-1">
                              <span class="text-caption" style="width: 30px">{{ item.item_name }}</span>
                              <div class="flex-grow-1 mx-2" style="height: 16px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                <div
                                  :style="{ width: getBarWidth(item.self_score, item.max_score) + '%', height: '100%', background: getColor(item.item_name), transition: 'width 0.3s' }"
                                />
                              </div>
                              <span class="text-caption" style="width: 40px; text-align: right">{{ formatScore(item.self_score) }}</span>
                            </div>
                          </v-col>
                          <v-col cols="12" md="6">
                            <div class="text-caption text-grey mb-1">考评分布</div>
                            <div v-for="item in basicItems" :key="'review-'+item.id" class="d-flex align-center mb-1">
                              <span class="text-caption" style="width: 30px">{{ item.item_name }}</span>
                              <div class="flex-grow-1 mx-2" style="height: 16px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                <div
                                  :style="{ width: getBarWidth(item.review_score, item.max_score) + '%', height: '100%', background: getColor(item.item_name), transition: 'width 0.3s' }"
                                />
                              </div>
                              <span class="text-caption" style="width: 40px; text-align: right">{{ formatScore(item.review_score) }}</span>
                            </div>
                          </v-col>
                        </v-row>
                        <v-table density="compact">
                          <thead>
                            <tr>
                              <th>项目</th>
                              <th>满分</th>
                              <th>自评分</th>
                              <th>考评分</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="item in basicItems" :key="item.id">
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
                                  @update:model-value="val => updateItemScore(a.id, item.id, 'self_score', val, item.max_score)"
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
                                  @update:model-value="val => updateItemScore(a.id, item.id, 'review_score', val, item.max_score)"
                                />
                                <span v-else>{{ formatScore(item.review_score) }}</span>
                              </td>
                            </tr>
                          </tbody>
                        </v-table>
                      </div>

                      <!-- Bonus Section -->
                      <div class="mb-4">
                        <div class="text-subtitle-2 mb-2">
                          <v-icon size="small" class="mr-1">mdi-arrow-up-bold</v-icon>
                          加分项
                          <span class="text-caption text-grey ml-2">
                            自评: {{ formatScore(bonusSelfTotal) }} / 考评: {{ formatScore(bonusReviewTotal) }}
                          </span>
                        </div>
                        <v-table density="compact" v-if="bonusItems.length > 0">
                          <thead>
                            <tr>
                              <th>项目</th>
                              <th>自评分</th>
                              <th>考评分</th>
                              <th>佐证</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="item in bonusItems" :key="item.id">
                              <td>{{ item.item_name }}</td>
                              <td>
                                <v-text-field
                                  v-if="canManage"
                                  :model-value="item.self_score"
                                  type="number" min="0" max="100" step="0.5"
                                  density="compact" hide-details variant="underlined"
                                  style="max-width: 100px"
                                  @update:model-value="val => updateItemScore(a.id, item.id, 'self_score', val)"
                                />
                                <span v-else>{{ formatScore(item.self_score) }}</span>
                              </td>
                              <td>
                                <v-text-field
                                  v-if="canManage"
                                  :model-value="item.review_score"
                                  type="number" min="0" max="100" step="0.5"
                                  density="compact" hide-details variant="underlined"
                                  style="max-width: 100px"
                                  @update:model-value="val => updateItemScore(a.id, item.id, 'review_score', val)"
                                />
                                <span v-else>{{ formatScore(item.review_score) }}</span>
                              </td>
                              <td>
                                <v-text-field
                                  v-if="canManage"
                                  :model-value="item.evidence_url"
                                  density="compact" hide-details variant="underlined"
                                  placeholder="URL"
                                  style="max-width: 150px"
                                  @update:model-value="val => updateItemEvidence(a.id, item.id, val)"
                                />
                                <span v-else>{{ item.evidence_url || '--' }}</span>
                              </td>
                            </tr>
                          </tbody>
                        </v-table>
                        <div v-else class="text-caption text-grey pa-2">暂无加分项</div>
                      </div>

                      <!-- Deduction Section -->
                      <div>
                        <div class="text-subtitle-2 mb-2">
                          <v-icon size="small" class="mr-1">mdi-arrow-down-bold</v-icon>
                          扣分项
                          <span class="text-caption text-grey ml-2">
                            自评: {{ formatScore(deductionSelfTotal) }} / 考评: {{ formatScore(deductionReviewTotal) }}
                          </span>
                        </div>
                        <v-table density="compact" v-if="deductionItems.length > 0">
                          <thead>
                            <tr>
                              <th>项目</th>
                              <th>自评分</th>
                              <th>考评分</th>
                              <th>佐证</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="item in deductionItems" :key="item.id">
                              <td>{{ item.item_name }}</td>
                              <td>
                                <v-text-field
                                  v-if="canManage"
                                  :model-value="item.self_score"
                                  type="number" min="0" max="100" step="0.5"
                                  density="compact" hide-details variant="underlined"
                                  style="max-width: 100px"
                                  @update:model-value="val => updateItemScore(a.id, item.id, 'self_score', val)"
                                />
                                <span v-else>{{ formatScore(item.self_score) }}</span>
                              </td>
                              <td>
                                <v-text-field
                                  v-if="canManage"
                                  :model-value="item.review_score"
                                  type="number" min="0" max="100" step="0.5"
                                  density="compact" hide-details variant="underlined"
                                  style="max-width: 100px"
                                  @update:model-value="val => updateItemScore(a.id, item.id, 'review_score', val)"
                                />
                                <span v-else>{{ formatScore(item.review_score) }}</span>
                              </td>
                              <td>
                                <v-text-field
                                  v-if="canManage"
                                  :model-value="item.evidence_url"
                                  density="compact" hide-details variant="underlined"
                                  placeholder="URL"
                                  style="max-width: 150px"
                                  @update:model-value="val => updateItemEvidence(a.id, item.id, val)"
                                />
                                <span v-else>{{ item.evidence_url || '--' }}</span>
                              </td>
                            </tr>
                          </tbody>
                        </v-table>
                        <div v-else class="text-caption text-grey pa-2">暂无扣分项</div>
                      </div>

                      <!-- Totals -->
                      <v-divider class="my-3" />
                      <div class="d-flex justify-end ga-3 flex-wrap">
                        <v-chip color="grey" variant="tonal">基本分: {{ formatScore(basicSelfTotal) }} / {{ formatScore(basicReviewTotal) }}</v-chip>
                        <v-chip color="success" variant="tonal">加分: {{ formatScore(bonusSelfTotal) }} / {{ formatScore(bonusReviewTotal) }}</v-chip>
                        <v-chip color="error" variant="tonal">扣分: {{ formatScore(deductionSelfTotal) }} / {{ formatScore(deductionReviewTotal) }}</v-chip>
                        <v-chip color="info" variant="tonal">自评: {{ formatScore(selfTotal) }}</v-chip>
                        <v-chip color="primary" variant="tonal">考评: {{ formatScore(reviewTotal) }}</v-chip>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </td>
            </tr>
          </template>
          <tr v-if="assessments.length === 0">
            <td colspan="8" class="text-center text-grey pa-4">暂无数据</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Create Dialog -->
    <v-dialog v-model="dialog" max-width="700" :fullscreen="isMobile">
      <v-card>
        <v-card-title>新学年考核</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.teacher_id" type="number" label="教师ID *" :error-messages="errors.teacher_id" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.period_id" type="number" label="周期ID *" :error-messages="errors.period_id" />
            </v-col>
          </v-row>
          <div class="text-subtitle-2 mb-2">基本分</div>
          <v-row>
            <v-col cols="6" sm="3">
              <v-text-field v-model="form.de_score" type="number" label="德 (≤30)" :error-messages="errors.de_score" min="0" max="30" step="0.5" />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field v-model="form.neng_score" type="number" label="能 (≤20)" :error-messages="errors.neng_score" min="0" max="20" step="0.5" />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field v-model="form.qin_score" type="number" label="勤 (≤20)" :error-messages="errors.qin_score" min="0" max="20" step="0.5" />
            </v-col>
            <v-col cols="6" sm="3">
              <v-text-field v-model="form.ji_score" type="number" label="绩 (≤30)" :error-messages="errors.ji_score" min="0" max="30" step="0.5" />
            </v-col>
          </v-row>
          <v-textarea v-model="form.self_comment" label="自评意见" rows="2" />
          <v-textarea v-model="form.review_comment" label="考评意见" rows="2" />
          <p class="text-caption text-grey mt-2">
            系统将自动创建基本分项目、拉取学年获奖类别作为加分项，并预置10个扣分项。
          </p>
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

const assessments = ref([])
const allItems = ref([])
const expandedId = ref(null)
const loadingItems = ref(false)
const dialog = ref(false)
const isMobile = ref(window.innerWidth < 600)

const form = ref({
  teacher_id: '', period_id: '',
  de_score: '', neng_score: '', qin_score: '', ji_score: '',
  self_comment: '', review_comment: '',
})
const errors = ref({})

const currentRole = localStorage.getItem('user_role') || 'admin'
const canManage = ['admin', 'director'].includes(currentRole)

const basicItems = computed(() => allItems.value.filter(i => i.category === 'basic'))
const bonusItems = computed(() => allItems.value.filter(i => i.category === 'bonus'))
const deductionItems = computed(() => allItems.value.filter(i => i.category === 'deduction'))

const basicSelfTotal = computed(() => basicItems.value.reduce((s, i) => s + parseFloat(i.self_score || 0), 0))
const basicReviewTotal = computed(() => basicItems.value.reduce((s, i) => s + parseFloat(i.review_score || 0), 0))
const bonusSelfTotal = computed(() => bonusItems.value.reduce((s, i) => s + parseFloat(i.self_score || 0), 0))
const bonusReviewTotal = computed(() => bonusItems.value.reduce((s, i) => s + parseFloat(i.review_score || 0), 0))
const deductionSelfTotal = computed(() => deductionItems.value.reduce((s, i) => s + parseFloat(i.self_score || 0), 0))
const deductionReviewTotal = computed(() => deductionItems.value.reduce((s, i) => s + parseFloat(i.review_score || 0), 0))

const selfTotal = computed(() => basicSelfTotal.value + bonusSelfTotal.value - deductionSelfTotal.value)
const reviewTotal = computed(() => basicReviewTotal.value + bonusReviewTotal.value - deductionReviewTotal.value)

function formatScore(val) {
  const num = parseFloat(val)
  return isNaN(num) ? '--' : num.toFixed(1)
}

function basicTotal(a) {
  return parseFloat(a.de_score || 0) + parseFloat(a.neng_score || 0) +
    parseFloat(a.qin_score || 0) + parseFloat(a.ji_score || 0)
}

function getBarWidth(score, max) {
  const s = parseFloat(score || 0)
  const m = parseFloat(max || 100)
  return m > 0 ? Math.min(100, (s / m) * 100) : 0
}

function getColor(name) {
  const colors = { '德': '#4CAF50', '能': '#2196F3', '勤': '#FF9800', '绩': '#9C27B0' }
  return colors[name] || '#607D8B'
}

async function toggleExpand(id) {
  if (expandedId.value === id) {
    expandedId.value = null
    return
  }
  expandedId.value = id
  loadingItems.value = true
  try {
    allItems.value = await api.getAnnualItems(id)
  } catch (e) {
    console.error(e)
    allItems.value = []
  }
  loadingItems.value = false
}

async function updateItemScore(assessmentId, itemId, field, value, maxScore) {
  const num = parseFloat(value)
  if (isNaN(num) || num < 0 || num > 100) return
  if (maxScore && num > parseFloat(maxScore)) return
  try {
    await api.updateAnnualItem(assessmentId, itemId, { [field]: num })
    const item = allItems.value.find(i => i.id === itemId)
    if (item) item[field] = num
  } catch (e) {
    console.error(e)
  }
}

async function updateItemEvidence(assessmentId, itemId, value) {
  try {
    await api.updateAnnualItem(assessmentId, itemId, { evidence_url: value })
    const item = allItems.value.find(i => i.id === itemId)
    if (item) item.evidence_url = value
  } catch (e) {
    console.error(e)
  }
}

async function calculate(id) {
  try {
    await api.calculateAnnual(id)
    assessments.value = await api.getAnnualAssessments()
    if (expandedId.value === id) {
      allItems.value = await api.getAnnualItems(id)
    }
  } catch (e) {
    console.error(e)
  }
}

async function save() {
  const e = {}
  if (!form.value.teacher_id) e.teacher_id = '必填'
  if (!form.value.period_id) e.period_id = '必填'
  const de = parseFloat(form.value.de_score || 0)
  const neng = parseFloat(form.value.neng_score || 0)
  const qin = parseFloat(form.value.qin_score || 0)
  const ji = parseFloat(form.value.ji_score || 0)
  if (de > 30) e.de_score = '不超过30'
  if (neng > 20) e.neng_score = '不超过20'
  if (qin > 20) e.qin_score = '不超过20'
  if (ji > 30) e.ji_score = '不超过30'
  errors.value = e
  if (Object.keys(e).length > 0) return

  try {
    await api.createAnnualAssessment({
      teacher_id: parseInt(form.value.teacher_id),
      period_id: parseInt(form.value.period_id),
      de_score: de, neng_score: neng, qin_score: qin, ji_score: ji,
      self_comment: form.value.self_comment,
      review_comment: form.value.review_comment,
    })
    dialog.value = false
    form.value = { teacher_id: '', period_id: '', de_score: '', neng_score: '', qin_score: '', ji_score: '', self_comment: '', review_comment: '' }
    errors.value = {}
    assessments.value = await api.getAnnualAssessments()
  } catch (err) {
    if (err.response?.data?.error) {
      alert(err.response.data.error)
    }
    console.error(err)
  }
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteAnnualAssessment(id)
    assessments.value = await api.getAnnualAssessments()
  }
}

onMounted(async () => {
  assessments.value = await api.getAnnualAssessments()
})
</script>

<style scoped>
.cursor-pointer { cursor: pointer; }
.cursor-pointer:hover { background-color: rgba(0,0,0,0.04); }
</style>
