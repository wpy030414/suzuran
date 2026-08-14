<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <v-icon size="32" color="primary" class="mr-2">mdi-chart-line</v-icon>
      <h2 class="text-h5">统计概览</h2>
    </div>

    <v-card class="mb-4">
      <v-card-title>筛选条件</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-text-field v-model="filters.start_date" type="date" label="开始日期" density="compact" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="filters.end_date" type="date" label="结束日期" density="compact" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="filters.meal_type" :items="['', '早餐', '午餐', '晚餐']" label="餐次" density="compact" clearable />
          </v-col>
          <v-col cols="12" md="3">
            <v-btn color="primary" block @click="loadData" prepend-icon="mdi-magnify">查询</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card color="info" variant="tonal">
          <v-card-text class="text-center">
            <v-icon size="36" class="mb-2">mdi-cart</v-icon>
            <div class="text-h4 font-weight-bold">{{ summary.total_ordered }}</div>
            <div class="text-subtitle-2">总订餐数</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="success" variant="tonal">
          <v-card-text class="text-center">
            <v-icon size="36" class="mb-2">mdi-food</v-icon>
            <div class="text-h4 font-weight-bold">{{ summary.total_consumed }}</div>
            <div class="text-subtitle-2">总用餐数</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="primary" variant="tonal">
          <v-card-text class="text-center">
            <v-icon size="36" class="mb-2">mdi-chart-donut</v-icon>
            <div class="text-h4 font-weight-bold">{{ summary.order_rate }}%</div>
            <div class="text-subtitle-2">订餐率</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="warning" variant="tonal">
          <v-card-text class="text-center">
            <v-icon size="36" class="mb-2">mdi-percent</v-icon>
            <div class="text-h4 font-weight-bold">{{ summary.consume_rate }}%</div>
            <div class="text-subtitle-2">用餐率</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>
            每日明细
            <v-spacer />
            <v-btn size="small" color="success" variant="outlined" :href="exportUrl" prepend-icon="mdi-download">
              导出 CSV
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-table density="compact" v-if="dailyRows.length > 0">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>订餐数</th>
                  <th>用餐数</th>
                  <th>订餐率</th>
                  <th>用餐率</th>
                  <th>可视化</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in dailyRows" :key="row.date">
                  <td>{{ row.date }}</td>
                  <td>{{ row.ordered }}</td>
                  <td class="text-success">{{ row.consumed }}</td>
                  <td>{{ row.order_rate }}%</td>
                  <td>
                    <v-chip :color="getRateColor(row.consume_rate)" size="small">
                      {{ row.consume_rate }}%
                    </v-chip>
                  </td>
                  <td style="min-width: 150px;">
                    <v-progress-linear
                      :model-value="row.consume_rate"
                      :color="getRateColor(row.consume_rate)"
                      rounded
                      height="16"
                    >
                      <template v-slot:default>
                        <span class="text-caption text-white">{{ row.consume_rate }}%</span>
                      </template>
                    </v-progress-linear>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <div v-else class="text-center text-grey py-8">
              <v-icon size="48" class="mb-2">mdi-inbox</v-icon>
              <div>暂无数据</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>用户统计</v-card-title>
          <v-card-text>
            <v-table density="compact" v-if="userRows.length > 0">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>订餐</th>
                  <th>用餐</th>
                  <th>率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in userRows" :key="row.user_id">
                  <td>{{ row.user_name || '用户' + row.user_id }}</td>
                  <td>{{ row.ordered }}</td>
                  <td class="text-success">{{ row.consumed }}</td>
                  <td>
                    <v-chip :color="getRateColor(row.consume_rate)" size="x-small">
                      {{ row.consume_rate }}%
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <div v-else class="text-center text-grey py-4">
              <div>暂无数据</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const today = new Date().toISOString().split('T')[0]
const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const filters = ref({
  start_date: lastMonth,
  end_date: today,
  meal_type: ''
})

const dailyData = ref({ rows: [], summary: {} })
const userRows = ref([])

const dailyRows = computed(() => dailyData.value.rows || [])
const summary = computed(() => dailyData.value.summary || { total_ordered: 0, total_consumed: 0, order_rate: 0, consume_rate: 0 })

const exportUrl = computed(() => api.exportStatsCsv({
  start_date: filters.value.start_date,
  end_date: filters.value.end_date,
  meal_type: filters.value.meal_type || undefined
}))

function getRateColor(rate) {
  if (rate >= 90) return 'success'
  if (rate >= 70) return 'info'
  if (rate >= 50) return 'warning'
  return 'error'
}

async function loadData() {
  try {
    const params = {}
    if (filters.value.start_date) params.start_date = filters.value.start_date
    if (filters.value.end_date) params.end_date = filters.value.end_date
    if (filters.value.meal_type) params.meal_type = filters.value.meal_type
    dailyData.value = await api.getStatsDaily(params)
    const userParams = {}
    if (filters.value.start_date) userParams.start_date = filters.value.start_date
    if (filters.value.end_date) userParams.end_date = filters.value.end_date
    const userData = await api.getStatsByUser(userParams)
    userRows.value = userData.rows || []
  } catch (e) {
    console.error(e)
  }
}

onMounted(loadData)
</script>
