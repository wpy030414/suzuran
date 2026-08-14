<template>
  <v-container>
    <h2 class="text-h5 mb-4">我的测试</h2>

    <!-- 学生信息输入 -->
    <v-card v-if="!studentInfo.name" class="mb-4">
      <v-card-title>请先填写信息</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model="studentInfo.name" label="姓名" required />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="studentInfo.grade" :items="gradeOptions" label="年级" required />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="studentInfo.class_name" :items="classOptions" label="班级" required />
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="confirmStudentInfo" :disabled="!studentInfo.name || !studentInfo.grade || !studentInfo.class_name">
          确认
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- 可用测试列表 -->
    <v-card v-if="studentInfo.name && !currentTest" class="mb-4">
      <v-card-title>可参加的测试</v-card-title>
      <v-card-text>
        <v-list v-if="availableTests.length > 0">
          <v-list-item v-for="test in availableTests" :key="test.id">
            <v-list-item-title>{{ test.title }}</v-list-item-title>
            <v-list-item-subtitle>{{ test.description }}</v-list-item-subtitle>
            <template v-slot:append>
              <v-btn color="primary" @click="startTest(test)">开始测试</v-btn>
            </template>
          </v-list-item>
        </v-list>
        <v-alert v-else type="info" variant="tonal">
          暂无可参加的测试
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- 测试进行中 -->
    <v-card v-if="currentTest">
      <v-card-title>
        {{ currentTest.title }}
        <v-spacer />
        <v-chip color="primary" size="small">进度: {{ progress }}%</v-chip>
      </v-card-title>
      <v-card-text>
        <v-progress-linear :model-value="progress" color="primary" class="mb-4" />

        <div v-for="(q, idx) in currentQuestions" :key="q.id" class="mb-6">
          <p class="font-weight-bold mb-2">{{ idx + 1 }}. {{ q.text }}</p>
          <v-radio-group v-model="answers[q.id]" class="ml-4">
            <v-radio label="是" value="是" />
            <v-radio label="否" value="否" />
          </v-radio-group>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" @click="cancelTest">取消</v-btn>
        <v-spacer />
        <v-btn color="primary" @click="submitTest" :disabled="!allAnswered">
          提交答案
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- 测试结果对话框 -->
    <v-dialog v-model="resultDialog" max-width="500">
      <v-card v-if="testResult">
        <v-card-title class="text-h5">
          测试完成
          <v-icon :color="riskColor" class="ml-2">mdi-shield-check</v-icon>
        </v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="primary">mdi-star</v-icon>
              </template>
              <v-list-item-title>总分</v-list-item-title>
              <v-list-item-subtitle>{{ testResult.total_score }} 分</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template v-slot:prepend>
                <v-icon :color="riskColor">mdi-alert-circle</v-icon>
              </template>
              <v-list-item-title>风险等级</v-list-item-title>
              <v-list-item-subtitle>
                <v-chip :color="riskColor" size="small">
                  {{ riskLevelText(testResult.risk_level) }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <div v-if="testResult.dimension_scores && Object.keys(testResult.dimension_scores).length > 0">
            <h3 class="text-subtitle-1 font-weight-bold mt-4 mb-2">维度得分</h3>
            <v-list density="compact">
              <v-list-item
                v-for="(score, dim) in testResult.dimension_scores"
                :key="dim"
              >
                <v-list-item-title>{{ dim }}</v-list-item-title>
                <v-list-item-subtitle>{{ score }} 分</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>

          <v-alert
            v-if="testResult.recommendations"
            :type="testResult.risk_level === 'severe' ? 'error' : testResult.risk_level === 'moderate' ? 'warning' : 'info'"
            class="mt-4"
          >
            <div class="font-weight-bold mb-1">建议：</div>
            {{ testResult.recommendations }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="closeResult">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const userRole = ref('student')
const availableTests = ref([])
const currentTest = ref(null)
const currentQuestions = ref([])
const answers = ref({})
const testResult = ref(null)
const resultDialog = ref(false)
const sessionId = ref(null)
const studentInfo = ref({
  name: '',
  grade: '',
  class_name: ''
})

const gradeOptions = ['高一', '高二', '高三', '初一', '初二', '初三']
const classOptions = ['1班', '2班', '3班', '4班', '5班']

const allAnswered = computed(() => {
  return currentQuestions.value.length > 0 &&
    currentQuestions.value.every(q => answers.value[q.id] !== undefined)
})

const progress = computed(() => {
  if (currentQuestions.value.length === 0) return 0
  const answered = Object.keys(answers.value).length
  return Math.round((answered / currentQuestions.value.length) * 100)
})

const riskColor = computed(() => {
  if (!testResult.value) return 'grey'
  const colors = { normal: 'success', mild: 'info', moderate: 'warning', severe: 'error' }
  return colors[testResult.value.risk_level] || 'grey'
})

function riskLevelText(level) {
  const texts = { normal: '正常', mild: '轻度', moderate: '中度', severe: '重度' }
  return texts[level] || level
}

function confirmStudentInfo() {
  // Student info confirmed, can proceed
}

async function startTest(test) {
  try {
    // 获取盲测版本的问卷
    const blindTest = await api.getQuestionnaireBlind(test.id)
    currentTest.value = blindTest
    currentQuestions.value = blindTest.questions || []
    answers.value = {}
    testResult.value = null

    // 创建会话
    const session = await api.createSession({
      questionnaire_id: test.id,
      student_id: localStorage.getItem('userId') || '1',
      student_name: studentInfo.value.name,
      grade: studentInfo.value.grade,
      class_name: studentInfo.value.class_name
    })
    sessionId.value = session.id
  } catch (e) {
    alert('开始测试失败: ' + e.message)
  }
}

async function submitTest() {
  if (!allAnswered.value) {
    alert('请回答所有题目')
    return
  }

  try {
    const answerList = Object.entries(answers.value).map(([question_id, answer]) => ({
      question_id: parseInt(question_id),
      answer
    }))

    const result = await api.submitSession(sessionId.value, { answers: answerList })
    testResult.value = result
    resultDialog.value = true

    // 刷新可用测试列表
    await loadAvailableTests()
  } catch (e) {
    alert('提交失败: ' + e.message)
  }
}

function cancelTest() {
  currentTest.value = null
  currentQuestions.value = []
  answers.value = {}
  sessionId.value = null
}

function closeResult() {
  resultDialog.value = false
  currentTest.value = null
  currentQuestions.value = []
  answers.value = {}
  sessionId.value = null
  testResult.value = null
}

async function loadAvailableTests() {
  const allTests = await api.getQuestionnaires({ status: 'active' })
  // 过滤掉已完成的测试
  const sessions = await api.getSessions({ status: 'completed' })
  const completedIds = new Set(sessions.map(s => s.questionnaire_id))
  availableTests.value = allTests.filter(t => !completedIds.has(t.id))
}

onMounted(async () => {
  userRole.value = localStorage.getItem('userRole') || 'student'
  await loadAvailableTests()
})
</script>
