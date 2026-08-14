<template>
  <v-container>
    <h2 class="text-h5 mb-4">统计报表</h2>

    <v-row>
      <!-- Semester Stats -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-h6">
            <v-icon start>mdi-calendar-range</v-icon>
            学期考核统计
          </v-card-title>
          <v-card-text>
            <div v-if="loadingSemester" class="text-center pa-4">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <div v-else>
              <v-row>
                <v-col cols="4">
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-primary">{{ semesterStats.count || 0 }}</div>
                    <div class="text-caption text-grey">考核人数</div>
                  </div>
                </v-col>
                <v-col cols="4">
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-info">{{ semesterStats.avg_self || 0 }}</div>
                    <div class="text-caption text-grey">平均自评</div>
                  </div>
                </v-col>
                <v-col cols="4">
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-success">{{ semesterStats.avg_review || 0 }}</div>
                    <div class="text-caption text-grey">平均考评</div>
                  </div>
                </v-col>
              </v-row>

              <v-divider class="my-3" />

              <div class="text-subtitle-2 mb-2">分数分布</div>
              <div v-for="(count, range) in semesterStats.distribution" :key="range" class="mb-2">
                <div class="d-flex align-center">
                  <span class="text-caption" style="width: 60px">{{ range }}</span>
                  <div class="flex-grow-1 mx-2" style="height: 20px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                    <div
                      :style="{ width: getBarWidth(count, semesterStats.count) + '%', height: '100%', background: getRangeColor(range), transition: 'width 0.3s' }"
                    />
                  </div>
                  <span class="text-caption" style="width: 40px; text-align: right">{{ count }}人</span>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Annual Stats -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-h6">
            <v-icon start>mdi-calendar-star</v-icon>
            学年考核统计
          </v-card-title>
          <v-card-text>
            <div v-if="loadingAnnual" class="text-center pa-4">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <div v-else>
              <v-row>
                <v-col cols="4">
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-primary">{{ annualStats.count || 0 }}</div>
                    <div class="text-caption text-grey">考核人数</div>
                  </div>
                </v-col>
                <v-col cols="4">
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-info">{{ annualStats.avg_self || 0 }}</div>
                    <div class="text-caption text-grey">平均自评</div>
                  </div>
                </v-col>
                <v-col cols="4">
                  <div class="text-center">
                    <div class="text-h4 font-weight-bold text-success">{{ annualStats.avg_review || 0 }}</div>
                    <div class="text-caption text-grey">平均考评</div>
                  </div>
                </v-col>
              </v-row>

              <v-divider class="my-3" />

              <div class="text-subtitle-2 mb-2">分数分布</div>
              <div v-for="(count, range) in annualStats.distribution" :key="range" class="mb-2">
                <div class="d-flex align-center">
                  <span class="text-caption" style="width: 60px">{{ range }}</span>
                  <div class="flex-grow-1 mx-2" style="height: 20px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                    <div
                      :style="{ width: getBarWidth(count, annualStats.count) + '%', height: '100%', background: getRangeColor(range), transition: 'width 0.3s' }"
                    />
                  </div>
                  <span class="text-caption" style="width: 40px; text-align: right">{{ count }}人</span>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Ranking Table -->
    <v-card class="mt-4">
      <v-card-title class="text-h6">
        <v-icon start>mdi-podium</v-icon>
        学年考核排名
      </v-card-title>
      <v-card-text>
        <div v-if="loadingRanking" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary" />
        </div>
        <v-table v-else density="compact">
          <thead>
            <tr>
              <th>排名</th>
              <th>教师ID</th>
              <th>德</th>
              <th>能</th>
              <th>勤</th>
              <th>绩</th>
              <th>自评总分</th>
              <th>考评总分</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in ranking" :key="r.teacher_id">
              <td>
                <v-chip
                  :color="getRankColor(r.rank)"
                  :variant="r.rank <= 3 ? 'flat' : 'tonal'"
                  size="small"
                >
                  {{ r.rank }}
                </v-chip>
              </td>
              <td>{{ r.teacher_id }}</td>
              <td>{{ formatScore(r.de_score) }}</td>
              <td>{{ formatScore(r.neng_score) }}</td>
              <td>{{ formatScore(r.qin_score) }}</td>
              <td>{{ formatScore(r.ji_score) }}</td>
              <td><span class="text-info">{{ formatScore(r.self_total) }}</span></td>
              <td><span class="text-primary font-weight-bold">{{ formatScore(r.review_total) }}</span></td>
            </tr>
            <tr v-if="ranking.length === 0">
              <td colspan="8" class="text-center text-grey pa-4">暂无排名数据</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const semesterStats = ref({})
const annualStats = ref({})
const ranking = ref([])
const loadingSemester = ref(true)
const loadingAnnual = ref(true)
const loadingRanking = ref(true)

function formatScore(val) {
  const num = parseFloat(val)
  return isNaN(num) ? '0.0' : num.toFixed(1)
}

function getBarWidth(count, total) {
  if (!total || total === 0) return 0
  return (count / total) * 100
}

function getRangeColor(range) {
  const colors = {
    '90-100': '#4CAF50',
    '80-90': '#8BC34A',
    '70-80': '#FFC107',
    '60-70': '#FF9800',
    '0-60': '#F44336',
  }
  return colors[range] || '#607D8B'
}

function getRankColor(rank) {
  if (rank === 1) return 'error'
  if (rank === 2) return 'warning'
  if (rank === 3) return 'info'
  return 'grey'
}

onMounted(async () => {
  try {
    semesterStats.value = await api.getSemesterStats()
  } catch (e) {
    console.error(e)
  }
  loadingSemester.value = false

  try {
    annualStats.value = await api.getAnnualStats()
  } catch (e) {
    console.error(e)
  }
  loadingAnnual.value = false

  try {
    ranking.value = await api.getAnnualRanking()
  } catch (e) {
    console.error(e)
  }
  loadingRanking.value = false
})
</script>
