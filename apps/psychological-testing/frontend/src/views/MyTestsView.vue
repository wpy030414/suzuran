<template>
  <v-container>
    <h2 class="text-h5 mb-4">我的测试</h2>

    <v-card v-if="availableTests.length > 0" class="mb-4">
      <v-card-title>可参加的测试</v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item v-for="test in availableTests" :key="test.id">
            <v-list-item-title>{{ test.title }}</v-list-item-title>
            <v-list-item-subtitle>{{ test.description }}</v-list-item-subtitle>
            <template v-slot:append>
              <v-btn color="primary" @click="startTest(test)">开始测试</v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <v-card v-if="currentTest">
      <v-card-title>{{ currentTest.title }}</v-card-title>
      <v-card-text>
        <div v-for="(q, idx) in currentQuestions" :key="q.id" class="mb-4">
          <p class="font-weight-bold">{{ idx + 1 }}. {{ q.text }}</p>
          <v-radio-group v-model="answers[q.id]">
            <v-radio v-for="option in q.options" :key="option.value" :label="option.label" :value="option.value" />
          </v-radio-group>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="submitTest" :disabled="!allAnswered">提交答案</v-btn>
      </v-card-actions>
    </v-card>

    <v-alert v-if="testResult" type="success" class="mt-4">
      <p>测试完成！</p>
      <p>总分：{{ testResult.total_score }}</p>
      <p>结果等级：{{ resultLevelText(testResult.result_level) }}</p>
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '../api.js'

const availableTests = ref([])
const currentTest = ref(null)
const currentQuestions = ref([])
const answers = ref({})
const testResult = ref(null)

const allAnswered = computed(() => {
  return currentQuestions.value.every(q => answers.value[q.id])
})

function resultLevelText(level) {
  return { normal: '正常', medium: '中等', high: '较高' }[level] || level
}

async function startTest(test) {
  currentTest.value = test
  currentQuestions.value = typeof test.questions === 'string' ? JSON.parse(test.questions) : test.questions
  answers.value = {}
  testResult.value = null

  // Create session
  const session = await api.createSession({
    questionnaire_id: test.id,
    student_id: 1, // TODO: get from auth context
    start_time: new Date().toISOString(),
    status: 'in_progress'
  })
  currentTest.value.session_id = session.id
}

async function submitTest() {
  const answerList = Object.entries(answers.value).map(([question_id, answer]) => ({
    question_id: parseInt(question_id),
    answer
  }))

  const result = await api.submitSession(currentTest.value.session_id, { answers: answerList })
  testResult.value = result
  currentTest.value = null
  currentQuestions.value = []
  answers.value = {}
}

onMounted(async () => {
  availableTests.value = await api.getQuestionnaires()
})
</script>
