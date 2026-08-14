<template>
  <v-container>
    <h2 class="text-h5 mb-4">统计报表</h2>

    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-text-field v-model="selectedDate" type="date" label="选择日期" @change="loadAll" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="trendFrom" type="date" label="趋势起始" @change="loadTrend" />
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field v-model="trendTo" type="date" label="趋势结束" @change="loadTrend" />
      </v-col>
      <v-col cols="12" md="3">
        <v-btn color="primary" @click="loadAll" class="mt-1">刷新</v-btn>
      </v-col>
    </v-row>

    <!-- 出勤率卡片 -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-card>
          <v-card-title>总检查人数</v-card-title>
          <v-card-text class="text-h3">{{ attendance.total || 0 }}</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-title>出勤率</v-card-title>
          <v-card-text class="text-h3 text-success">{{ attendance.attendance_rate || 0 }}%</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-title>缺勤率</v-card-title>
          <v-card-text class="text-h3 text-warning">{{ attendance.absence_rate || 0 }}%</v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-title>异常率</v-card-title>
          <v-card-text class="text-h3 text-error">{{ attendance.abnormal_rate || 0 }}%</v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- 缺勤趋势 -->
    <v-card class="mb-4">
      <v-card-title>缺勤趋势</v-card-title>
      <v-card-text>
        <div v-if="trend.length === 0" class="text-center pa-4">暂无趋势数据</div>
        <div v-else>
          <div class="d-flex align-end mb-2" style="height: 200px; gap: 2px;">
            <div v-for="d in trend" :key="d.date" class="d-flex flex-column align-center" :style="{ flex: 1 }">
              <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                  <div v-bind="props" :style="barStyle(d.absence_rate)" class="rounded-t"></div>
                </template>
                <span>{{ d.date }}: 缺勤率 {{ d.absence_rate }}%</span>
              </v-tooltip>
              <span class="text-caption mt-1" style="font-size: 10px;">{{ d.date.slice(5) }}</span>
            </div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- 传染病汇总 -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>传染病汇总</v-card-title>
          <v-card-text>
            <div class="text-h4 mb-2">活跃病例: {{ infectiousSummary.total_active || 0 }}</div>
            <v-table v-if="infectiousSummary.by_type && infectiousSummary.by_type.length > 0" density="compact">
              <thead>
                <tr><th>疾病类型</th><th>数量</th></tr>
              </thead>
              <tbody>
                <tr v-for="t in infectiousSummary.by_type" :key="t.disease_name">
                  <td>{{ t.disease_name }}</td>
                  <td>{{ t.count }}</td>
                </tr>
              </tbody>
            </v-table>
            <div v-else class="text-center pa-2">暂无活跃传染病病例</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>异常详情</v-card-title>
          <v-card-text>
            <div v-if="abnormalDetail.records && abnormalDetail.records.length > 0">
              <v-table density="compact">
                <thead>
                  <tr><th>学生</th><th>年级班级</th><th>详情</th></tr>
                </thead>
                <tbody>
                  <tr v-for="r in abnormalDetail.records" :key="r.id">
                    <td>{{ r.student_name || `学生#${r.student_id}` }}</td>
                    <td>{{ r.grade }} {{ r.class_name }}</td>
                    <td>{{ r.abnormal_details || '-' }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>
            <div v-else class="text-center pa-2">当日无异常学生</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const selectedDate = ref(new Date().toISOString().split('T')[0])
const trendFrom = ref(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
const trendTo = ref(new Date().toISOString().split('T')[0])

const attendance = ref({})
const trend = ref([])
const abnormalDetail = ref({})
const infectiousSummary = ref({})

function barStyle(rate) {
  const h = Math.max(4, Math.min(200, rate * 4))
  return {
    height: h + 'px',
    backgroundColor: rate > 10 ? '#f44336' : rate > 5 ? '#ff9800' : '#4caf50',
    width: '100%',
    minWidth: '8px'
  }
}

async function loadAttendance() {
  try {
    attendance.value = await api.getAttendanceStats({ date: selectedDate.value })
  } catch (e) {
    attendance.value = {}
  }
}

async function loadTrend() {
  try {
    trend.value = await api.getAbsenceTrend({ date_from: trendFrom.value, date_to: trendTo.value })
  } catch (e) {
    trend.value = []
  }
}

async function loadAbnormal() {
  try {
    abnormalDetail.value = await api.getAbnormalDetail({ date: selectedDate.value })
  } catch (e) {
    abnormalDetail.value = { records: [] }
  }
}

async function loadInfectious() {
  try {
    infectiousSummary.value = await api.getInfectiousSummary()
  } catch (e) {
    infectiousSummary.value = { total_active: 0, by_type: [] }
  }
}

async function loadAll() {
  await Promise.all([loadAttendance(), loadTrend(), loadAbnormal(), loadInfectious()])
}

onMounted(loadAll)
</script>
