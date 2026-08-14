<template>
  <v-container>
    <h2 class="text-h5 mb-4">统计分析</h2>

    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="evaluatorId"
          type="number"
          label="评价人ID"
          hint="输入评价人ID查看其评价统计"
          persistent-hint
        />
      </v-col>
      <v-col cols="12" md="3" class="d-flex align-end">
        <v-btn color="primary" @click="loadSummary" :loading="loading">
          查询统计
        </v-btn>
      </v-col>
    </v-row>

    <div v-if="summary">
      <v-row>
        <v-col cols="12" md="3">
          <v-card>
            <v-card-title class="text-h6">总分配数</v-card-title>
            <v-card-text class="text-h4 text-center">
              {{ summary.total_assignments }}
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card>
            <v-card-title class="text-h6">已完成</v-card-title>
            <v-card-text class="text-h4 text-center text-success">
              {{ summary.completed }}
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card>
            <v-card-title class="text-h6">待完成</v-card-title>
            <v-card-text class="text-h4 text-center text-warning">
              {{ summary.pending }}
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card>
            <v-card-title class="text-h6">完成率</v-card-title>
            <v-card-text class="text-h4 text-center text-primary">
              {{ completionRate }}%
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>按活动统计</v-card-title>
            <v-card-text>
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>活动</th>
                    <th>总数</th>
                    <th>已完成</th>
                    <th>待完成</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(stats, activity) in summary.by_activity" :key="activity">
                    <td>{{ activity }}</td>
                    <td>{{ stats.total }}</td>
                    <td class="text-success">{{ stats.completed }}</td>
                    <td class="text-warning">{{ stats.pending }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>按视角统计</v-card-title>
            <v-card-text>
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>视角</th>
                    <th>总数</th>
                    <th>已完成</th>
                    <th>待完成</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(stats, perspective) in summary.by_perspective" :key="perspective">
                    <td>
                      <v-chip :color="perspectiveColor(perspective)" size="small">
                        {{ perspectiveLabel(perspective) }}
                      </v-chip>
                    </td>
                    <td>{{ stats.total }}</td>
                    <td class="text-success">{{ stats.completed }}</td>
                    <td class="text-warning">{{ stats.pending }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <v-alert v-if="!summary && !loading" type="info">
      请输入评价人ID并点击"查询统计"以查看评价统计数据
    </v-alert>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../api.js'

const evaluatorId = ref('')
const summary = ref(null)
const loading = ref(false)
const snackbar = ref({ show: false, text: '', color: 'success' })

const perspectiveMap = {
  peer: '组内互评',
  group_review: '考核组评价',
  admin_review: '行政评价',
}

const perspectiveColorMap = {
  peer: 'blue',
  group_review: 'green',
  admin_review: 'orange',
}

const completionRate = computed(() => {
  if (!summary.value || summary.value.total_assignments === 0) return 0
  return Math.round((summary.value.completed / summary.value.total_assignments) * 100)
})

function perspectiveLabel(p) {
  return perspectiveMap[p] || p
}

function perspectiveColor(p) {
  return perspectiveColorMap[p] || 'grey'
}

async function loadSummary() {
  if (!evaluatorId.value) {
    showSnackbar('请输入评价人ID', 'error')
    return
  }

  loading.value = true
  try {
    summary.value = await api.getEvaluationSummary(parseInt(evaluatorId.value))
  } catch (e) {
    showSnackbar('查询失败: ' + (e.response?.data?.error || e.message), 'error')
  } finally {
    loading.value = false
  }
}

function showSnackbar(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}
</script>
