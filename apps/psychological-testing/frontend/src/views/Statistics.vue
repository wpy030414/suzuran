<template>
  <v-container>
    <h2 class="text-h5 mb-4">统计分析</h2>

    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedQuestionnaire"
              :items="questionnaireOptions"
              label="选择问卷"
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedGrade"
              :items="gradeOptions"
              label="年级"
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedClass"
              :items="classOptions"
              label="班级"
              clearable
            />
          </v-col>
        </v-row>
        <v-btn color="primary" @click="loadStatistics" class="mt-2">
          查询统计
        </v-btn>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>风险概览</v-card-title>
          <v-card-text>
            <div v-if="riskOverview" class="text-center">
              <v-row>
                <v-col
                  v-for="(count, level) in riskOverview.risk_counts"
                  :key="level"
                  cols="6"
                >
                  <div class="text-h4" :style="{ color: riskColor(level) }">
                    {{ count }}
                  </div>
                  <div class="text-caption">{{ riskLevelText(level) }}</div>
                </v-col>
              </v-row>
              <div class="text-caption mt-4">
                总计: {{ riskOverview.total }} 人
              </div>
            </div>
            <v-alert v-else type="info" variant="tonal">
              暂无数据
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>维度分析</v-card-title>
          <v-card-text>
            <div v-if="dimensionStats && Object.keys(dimensionStats.dimensions).length > 0">
              <v-list density="compact">
                <v-list-item
                  v-for="(stats, dim) in dimensionStats.dimensions"
                  :key="dim"
                >
                  <v-list-item-title>{{ dim }}</v-list-item-title>
                  <v-list-item-subtitle>
                    平均分: {{ stats.average }} | 样本数: {{ stats.count }}
                  </v-list-item-subtitle>
                  <v-progress-linear
                    :model-value="stats.average * 10"
                    :color="getScoreColor(stats.average)"
                    class="mt-1"
                  />
                </v-list-item>
              </v-list>
            </div>
            <v-alert v-else type="info" variant="tonal">
              暂无维度数据
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>年级对比</v-card-title>
          <v-card-text>
            <div v-if="gradeStats && Object.keys(gradeStats.grades).length > 0">
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>年级</th>
                    <th>人数</th>
                    <th>平均分</th>
                    <th>风险分布</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(stats, grade) in gradeStats.grades" :key="grade">
                    <td>{{ grade }}</td>
                    <td>{{ stats.count }}</td>
                    <td>{{ stats.average_score }}</td>
                    <td>
                      <v-chip
                        v-for="(count, level) in stats.risk"
                        :key="level"
                        :color="riskColor(level)"
                        size="x-small"
                        class="mr-1"
                      >
                        {{ riskLevelText(level) }}: {{ count }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
            <v-alert v-else type="info" variant="tonal">
              暂无年级数据
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>班级对比</v-card-title>
          <v-card-text>
            <div v-if="classStats && Object.keys(classStats.classes).length > 0">
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>班级</th>
                    <th>人数</th>
                    <th>平均分</th>
                    <th>风险分布</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(stats, cls) in classStats.classes" :key="cls">
                    <td>{{ cls }}</td>
                    <td>{{ stats.count }}</td>
                    <td>{{ stats.average_score }}</td>
                    <td>
                      <v-chip
                        v-for="(count, level) in stats.risk"
                        :key="level"
                        :color="riskColor(level)"
                        size="x-small"
                        class="mr-1"
                      >
                        {{ riskLevelText(level) }}: {{ count }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
            <v-alert v-else type="info" variant="tonal">
              暂无班级数据
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const questionnaires = ref([])
const selectedQuestionnaire = ref(null)
const selectedGrade = ref(null)
const selectedClass = ref(null)

const riskOverview = ref(null)
const dimensionStats = ref(null)
const gradeStats = ref(null)
const classStats = ref(null)

const gradeOptions = ['高一', '高二', '高三', '初一', '初二', '初三']
const classOptions = ['1班', '2班', '3班', '4班', '5班']

const questionnaireOptions = ref([])

function riskColor(level) {
  return { normal: 'success', mild: 'info', moderate: 'warning', severe: 'error' }[level] || 'grey'
}

function riskLevelText(level) {
  return { normal: '正常', mild: '轻度', moderate: '中度', severe: '重度' }[level] || level
}

function getScoreColor(score) {
  if (score >= 8) return 'error'
  if (score >= 5) return 'warning'
  if (score >= 3) return 'info'
  return 'success'
}

async function loadStatistics() {
  const params = {}
  if (selectedQuestionnaire.value) params.questionnaire_id = selectedQuestionnaire.value
  if (selectedGrade.value) params.grade = selectedGrade.value
  if (selectedClass.value) params.class_name = selectedClass.value

  try {
    const [risk, dim, grade, cls] = await Promise.all([
      api.getRiskOverview(),
      api.getStatsByDimension(params),
      api.getStatsByGrade(params),
      api.getStatsByClass(params)
    ])

    riskOverview.value = risk
    dimensionStats.value = dim
    gradeStats.value = grade
    classStats.value = cls
  } catch (e) {
    alert('加载统计失败: ' + e.message)
  }
}

onMounted(async () => {
  questionnaires.value = await api.getQuestionnaires()
  questionnaireOptions.value = questionnaires.value.map(q => ({
    title: q.title,
    value: q.id
  }))

  // 默认加载全部统计
  await loadStatistics()
})
</script>
