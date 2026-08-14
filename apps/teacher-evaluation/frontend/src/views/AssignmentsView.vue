<template>
  <v-container>
    <h2 class="text-h5 mb-4">评价分配与打分</h2>

    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-select
          v-model="filterActivity"
          :items="activityOptions"
          item-title="name"
          item-value="id"
          label="活动筛选"
          clearable
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="filterPerspective"
          :items="perspectiveOptions"
          label="视角筛选"
          clearable
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="filterStatus"
          :items="['', 'pending', 'completed']"
          label="状态筛选"
          clearable
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="3" class="d-flex justify-end">
        <v-btn color="primary" @click="openCreateDialog" prepend-icon="mdi-plus">
          新建分配
        </v-btn>
      </v-col>
    </v-row>

    <v-table density="compact">
      <thead>
        <tr>
          <th>活动</th>
          <th>评价人</th>
          <th>被评价人</th>
          <th>视角</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in filteredAssignments" :key="a.id">
          <td>{{ a.activity_title || `活动#${a.activity_id}` }}</td>
          <td>{{ a.evaluator_id }}</td>
          <td>{{ a.evaluatee_id }}</td>
          <td>
            <v-chip :color="perspectiveColor(a.perspective)" size="small">
              {{ perspectiveLabel(a.perspective) }}
            </v-chip>
          </td>
          <td>
            <v-chip :color="a.status === 'completed' ? 'success' : 'warning'" size="small">
              {{ a.status === 'completed' ? '已完成' : '待评价' }}
            </v-chip>
          </td>
          <td>
            <v-btn
              v-if="a.status !== 'completed'"
              size="small"
              color="primary"
              @click="openScoreDialog(a)"
            >
              打分
            </v-btn>
            <v-chip v-else size="small" color="grey-lighten-1">
              已完成
            </v-chip>
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Create Assignment Dialog -->
    <v-dialog v-model="createDialog" max-width="600">
      <v-card>
        <v-card-title>新建评价分配</v-card-title>
        <v-card-text>
          <v-select
            v-model="createForm.activity_id"
            :items="activities"
            item-title="name"
            item-value="id"
            label="选择活动"
          />
          <v-text-field v-model="createForm.evaluator_id" type="number" label="评价人ID" />
          <v-text-field v-model="createForm.evaluatee_id" type="number" label="被评价人ID" />
          <v-select
            v-model="createForm.perspective"
            :items="perspectiveOptions"
            label="评价视角"
          />

          <v-alert v-if="suggestedGroup" type="info" class="mt-4">
            <strong>系统提示：</strong>您属于「{{ suggestedGroup.name }}」组
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="createDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveAssignment">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Score Dialog (Multi-dimensional) -->
    <v-dialog v-model="scoreDialog" max-width="700" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>评价打分</span>
          <v-spacer />
          <v-chip :color="perspectiveColor(currentAssignment?.perspective)" size="small">
            {{ perspectiveLabel(currentAssignment?.perspective) }}
          </v-chip>
        </v-card-title>
        <v-card-text>
          <div class="mb-4">
            <strong>评价人：</strong>{{ currentAssignment?.evaluator_id }} →
            <strong>被评价人：</strong>{{ currentAssignment?.evaluatee_id }}
          </div>

          <v-alert v-if="indicators.length === 0" type="warning">
            正在加载指标集...
          </v-alert>

          <div v-for="ind in indicators" :key="ind.code" class="mb-3">
            <div class="d-flex align-center mb-1">
              <strong>{{ ind.code }} {{ ind.name }}</strong>
              <v-spacer />
              <span class="text-caption">满分 {{ ind.max }} 分</span>
            </div>
            <v-text-field
              v-model.number="scoreForm.scores[ind.code]"
              type="number"
              :min="0"
              :max="ind.max"
              :rules="[v => v >= 0 && v <= ind.max || `分数必须在 0-${ind.max} 之间`]"
              density="compact"
              hide-details="auto"
            />
          </div>

          <v-divider class="my-4" />

          <div class="d-flex align-center text-h6">
            <span>总分：</span>
            <v-spacer />
            <span :class="{'text-error': totalScore > maxTotal}">
              {{ totalScore.toFixed(2) }} / {{ maxTotal }}
            </span>
          </div>

          <v-textarea
            v-model="scoreForm.comment"
            label="评语（可选）"
            rows="2"
            class="mt-4"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="scoreDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveScores" :loading="saving">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const assignments = ref([])
const activities = ref([])
const createDialog = ref(false)
const scoreDialog = ref(false)
const currentAssignment = ref(null)
const indicators = ref([])
const saving = ref(false)
const suggestedGroup = ref(null)
const snackbar = ref({ show: false, text: '', color: 'success' })

const filterActivity = ref(null)
const filterPerspective = ref('')
const filterStatus = ref('')

const createForm = ref({
  activity_id: null,
  evaluator_id: '',
  evaluatee_id: '',
  perspective: 'peer',
})

const scoreForm = ref({
  scores: {},
  comment: '',
})

const perspectiveOptions = [
  { title: '组内互评', value: 'peer' },
  { title: '考核组评价', value: 'group_review' },
  { title: '行政评价', value: 'admin_review' },
]

const perspectiveOptionsMap = {
  peer: '组内互评',
  group_review: '考核组评价',
  admin_review: '行政评价',
}

const activityOptions = computed(() => activities.value)

const filteredAssignments = computed(() => {
  return assignments.value.filter(a => {
    const matchActivity = !filterActivity.value || a.activity_id === filterActivity.value
    const matchPerspective = !filterPerspective.value || a.perspective === filterPerspective.value
    const matchStatus = !filterStatus.value || a.status === filterStatus.value
    return matchActivity && matchPerspective && matchStatus
  })
})

const totalScore = computed(() => {
  return Object.values(scoreForm.value.scores).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
})

const maxTotal = computed(() => {
  return indicators.value.reduce((sum, ind) => sum + ind.max, 0)
})

function perspectiveLabel(p) {
  return perspectiveOptionsMap[p] || p
}

function perspectiveColor(p) {
  const colors = { peer: 'blue', group_review: 'green', admin_review: 'orange' }
  return colors[p] || 'grey'
}

function openCreateDialog() {
  createForm.value = { activity_id: null, evaluator_id: '', evaluatee_id: '', perspective: 'peer' }
  suggestedGroup.value = null
  createDialog.value = true
}

async function saveAssignment() {
  try {
    const result = await api.createAssignment({
      activity_id: createForm.value.activity_id,
      evaluator_id: parseInt(createForm.value.evaluator_id),
      evaluatee_id: parseInt(createForm.value.evaluatee_id),
      perspective: createForm.value.perspective,
      status: 'pending',
    })
    createDialog.value = false
    assignments.value = await api.getAssignments()
    showSnackbar('分配创建成功', 'success')
  } catch (e) {
    showSnackbar('创建失败: ' + (e.response?.data?.error || e.message), 'error')
  }
}

async function openScoreDialog(assignment) {
  currentAssignment.value = assignment
  scoreForm.value = { scores: {}, comment: '' }

  // Load indicators for this perspective
  try {
    const indicatorSet = await api.getIndicatorSetByPerspective(assignment.perspective)
    indicators.value = indicatorSet.indicators || []

    // Initialize scores to 0
    for (const ind of indicators.value) {
      scoreForm.value.scores[ind.code] = 0
    }

    // Load existing scores if any
    const existingScores = await api.getScores({ assignment_id: assignment.id })
    for (const s of existingScores) {
      scoreForm.value.scores[s.indicator_code] = s.score
    }

    scoreDialog.value = true
  } catch (e) {
    showSnackbar('加载指标集失败: ' + (e.response?.data?.error || e.message), 'error')
  }
}

async function saveScores() {
  if (totalScore.value > maxTotal.value) {
    showSnackbar('总分超过满分值，请检查分数', 'error')
    return
  }

  saving.value = true
  try {
    const scores = indicators.value.map(ind => ({
      indicator_code: ind.code,
      score: parseFloat(scoreForm.value.scores[ind.code]) || 0,
      comment: scoreForm.value.comment,
    }))

    await api.batchCreateScores(currentAssignment.value.id, scores)
    scoreDialog.value = false
    assignments.value = await api.getAssignments()
    showSnackbar('评分保存成功', 'success')
  } catch (e) {
    showSnackbar('保存失败: ' + (e.response?.data?.error || e.message), 'error')
  } finally {
    saving.value = false
  }
}

function showSnackbar(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

onMounted(async () => {
  activities.value = await api.getActivities()
  assignments.value = await api.getAssignments()
})
</script>
