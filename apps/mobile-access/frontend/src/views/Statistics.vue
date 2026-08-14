<template>
  <v-container>
    <h2 class="text-h5 mb-4">统计分析</h2>

    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-text-field
          v-model="dateFrom"
          label="开始日期"
          type="date"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field
          v-model="dateTo"
          label="结束日期"
          type="date"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="selectedDevice"
          :items="devices"
          item-title="name"
          item-value="id"
          label="设备"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" @click="loadData" class="mt-1">查询</v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>访问趋势</v-card-title>
          <v-card-text>
            <div class="text-h4 mb-2">{{ accessCount.total || 0 }}</div>
            <div class="text-caption mb-4">总访问次数</div>
            <div v-if="accessCount.by_date">
              <div v-for="(count, date) in accessCount.by_date" :key="date" class="d-flex justify-space-between mb-1">
                <span>{{ date }}</span>
                <v-chip size="small">{{ count }}</v-chip>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>高峰时段</v-card-title>
          <v-card-text>
            <div v-if="peakHours.by_hour">
              <div v-for="(count, hour) in peakHours.by_hour" :key="hour" class="d-flex justify-space-between align-center mb-1">
                <span>{{ String(hour).padStart(2, '0') }}:00</span>
                <v-progress-linear :model-value="(count / maxHourCount) * 100" color="primary" style="width: 150px" />
                <span class="ml-2">{{ count }}</span>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>按设备统计</v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>设备</th>
                  <th>总次数</th>
                  <th>成功</th>
                  <th>失败</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in byDevice.statistics" :key="stat.device_id">
                  <td>{{ stat.device_name }}</td>
                  <td>{{ stat.count }}</td>
                  <td>{{ stat.success }}</td>
                  <td>{{ stat.failed }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>按用户统计</v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>总次数</th>
                  <th>成功</th>
                  <th>失败</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in byUser.statistics" :key="stat.user_id">
                  <td>{{ stat.user_name }}</td>
                  <td>{{ stat.count }}</td>
                  <td>{{ stat.success }}</td>
                  <td>{{ stat.failed }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>错误率统计</v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>设备</th>
                  <th>总次数</th>
                  <th>错误次数</th>
                  <th>错误率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in errorRate.statistics" :key="stat.device_id">
                  <td>{{ stat.device_name }}</td>
                  <td>{{ stat.total }}</td>
                  <td>{{ stat.errors }}</td>
                  <td>
                    <v-chip :color="stat.error_rate > 10 ? 'error' : stat.error_rate > 5 ? 'warning' : 'success'" size="small">
                      {{ stat.error_rate }}%
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const dateFrom = ref('')
const dateTo = ref('')
const selectedDevice = ref(null)
const devices = ref([])

const accessCount = ref({})
const byDevice = ref({})
const byUser = ref({})
const errorRate = ref({})
const peakHours = ref({})

const maxHourCount = computed(() => {
  if (!peakHours.value.by_hour) return 1
  return Math.max(...Object.values(peakHours.value.by_hour), 1)
})

async function loadData() {
  const params = {}
  if (dateFrom.value) params.date_from = dateFrom.value
  if (dateTo.value) params.date_to = dateTo.value
  if (selectedDevice.value) params.device_id = selectedDevice.value

  const [ac, bd, bu, er, ph] = await Promise.all([
    api.getAccessCount(params),
    api.getStatsByDevice(),
    api.getStatsByUser(),
    api.getErrorRate(params),
    api.getPeakHours(params)
  ])

  accessCount.value = ac
  byDevice.value = bd
  byUser.value = bu
  errorRate.value = er
  peakHours.value = ph
}

onMounted(async () => {
  devices.value = await api.getDevices()
  await loadData()
})
</script>
