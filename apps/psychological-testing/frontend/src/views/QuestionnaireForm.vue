<template>
  <v-container>
    <h2 class="text-h5 mb-4">{{ isEdit ? '编辑问卷' : '新增问卷' }}</h2>

    <v-form ref="form" @submit.prevent="save">
      <v-card class="mb-4">
        <v-card-text>
          <v-text-field
            v-model="form.title"
            label="问卷标题 *"
            :rules="[v => !!v || '标题不能为空']"
          />
          <v-textarea
            v-model="form.description"
            label="描述"
            rows="2"
          />
          <v-switch
            v-model="form.blind_mode"
            label="盲测模式（隐藏维度标签，题目乱序）"
            color="primary"
          />
        </v-card-text>
      </v-card>

      <v-card class="mb-4">
        <v-card-title>
          题目管理
          <v-spacer />
          <v-btn size="small" color="primary" prepend-icon="mdi-plus" @click="addQuestion">
            添加题目
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="form.questions.length === 0"
            type="info"
            variant="tonal"
          >
            还没有题目，点击"添加题目"开始创建
          </v-alert>

          <v-card
            v-for="(q, idx) in form.questions"
            :key="idx"
            variant="outlined"
            class="mb-3"
          >
            <v-card-text>
              <div class="d-flex align-center mb-2">
                <span class="text-h6">题目 {{ idx + 1 }}</span>
                <v-spacer />
                <v-btn
                  size="small"
                  icon="mdi-delete"
                  color="error"
                  variant="text"
                  @click="removeQuestion(idx)"
                />
              </div>
              <v-textarea
                v-model="q.text"
                label="题目内容 *"
                rows="2"
                :rules="[v => !!v || '题目内容不能为空']"
              />
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="q.dimension"
                    label="所属维度"
                    hint="例如：焦虑、抑郁、压力"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="q.direction"
                    :items="directionOptions"
                    label="计分方向"
                  />
                </v-col>
              </v-row>
              <v-textarea
                v-model="q.options"
                label="选项（每行一个，格式：是|否）"
                rows="2"
                hint="默认选项：是、否"
              />
            </v-card-text>
          </v-card>
        </v-card-text>
      </v-card>

      <v-card class="mb-4">
        <v-card-title>评分规则</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="form.scoring_rules.threshold_mild"
                label="轻度阈值"
                type="number"
                hint="达到此分数为轻度"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="form.scoring_rules.threshold_moderate"
                label="中度阈值"
                type="number"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="form.scoring_rules.threshold_severe"
                label="重度阈值"
                type="number"
              />
            </v-col>
          </v-row>
          <v-textarea
            v-model="form.scoring_rules.recommendations"
            label="建议（JSON 格式）"
            rows="4"
            hint='例如：{"normal": "心理状态良好", "mild": "建议关注", "moderate": "建议咨询", "severe": "需要专业帮助"}'
          />
        </v-card-text>
      </v-card>

      <div class="d-flex gap-2">
        <v-btn
          color="primary"
          type="submit"
          :loading="saving"
          size="large"
        >
          保存
        </v-btn>
        <v-btn
          variant="text"
          @click="$router.back()"
          size="large"
        >
          取消
        </v-btn>
      </div>
    </v-form>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api.js'

const route = useRoute()
const router = useRouter()
const form = ref(null)
const saving = ref(false)

const isEdit = computed(() => !!route.params.id)

const form = ref({
  title: '',
  description: '',
  blind_mode: true,
  questions: [],
  scoring_rules: {
    threshold_mild: 3,
    threshold_moderate: 5,
    threshold_severe: 8,
    recommendations: {
      normal: '心理状态良好，继续保持',
      mild: '可能存在轻微困扰，建议关注',
      moderate: '建议寻求心理咨询',
      severe: '建议尽快寻求专业帮助'
    }
  }
})

const directionOptions = [
  { title: '正向（是=1分，否=0分）', value: 'forward' },
  { title: '反向（否=1分，是=0分）', value: 'reverse' }
]

function addQuestion() {
  form.value.questions.push({
    text: '',
    dimension: '',
    direction: 'forward',
    options: '是\n否'
  })
}

function removeQuestion(idx) {
  form.value.questions.splice(idx, 1)
}

async function save() {
  const { valid } = await form.value.validate()
  if (!valid) return

  saving.value = true
  try {
    // 转换题目格式
    const questions = form.value.questions.map((q, idx) => ({
      id: idx + 1,
      text: q.text,
      dimension: q.dimension || '未分类',
      direction: q.direction || 'forward',
      options: (q.options || '是\n否').split('\n').filter(Boolean).map(opt => ({
        label: opt,
        value: opt
      }))
    }))

    const data = {
      title: form.value.title,
      description: form.value.description,
      questions: JSON.stringify(questions),
      scoring_rules: JSON.stringify(form.value.scoring_rules),
      blind_mode: form.value.blind_mode,
      status: 'active'
    }

    if (isEdit.value) {
      await api.updateQuestionnaire(route.params.id, data)
    } else {
      await api.createQuestionnaire(data)
    }

    router.push('/')
  } catch (e) {
    alert('保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (isEdit.value) {
    const q = await api.getQuestionnaire(route.params.id)
    form.value.title = q.title
    form.value.description = q.description
    form.value.blind_mode = q.blind_mode !== false

    const questions = typeof q.questions === 'string' ? JSON.parse(q.questions) : q.questions
    form.value.questions = questions.map(q => ({
      text: q.text,
      dimension: q.dimension || '',
      direction: q.direction || 'forward',
      options: (q.options || []).map(o => o.label || o.value).join('\n')
    }))

    const rules = typeof q.scoring_rules === 'string' ? JSON.parse(q.scoring_rules) : q.scoring_rules
    form.value.scoring_rules = rules
  }
})
</script>
