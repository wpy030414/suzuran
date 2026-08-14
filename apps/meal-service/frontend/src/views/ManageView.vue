<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <v-icon size="32" color="primary" class="mr-2">mdi-clipboard-list</v-icon>
      <h2 class="text-h5">订餐管理</h2>
    </div>

    <v-row>
      <v-col cols="12" md="8">
        <v-card class="mb-4">
          <v-card-title>筛选条件</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="4">
                <v-text-field v-model="selectedDate" type="date" label="日期" density="compact" />
              </v-col>
              <v-col cols="12" md="3">
                <v-select v-model="mealTypeFilter" :items="['', '早餐', '午餐', '晚餐']" label="餐次" density="compact" clearable />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field v-model="searchName" label="搜索姓名" density="compact" prepend-inner-icon="mdi-magnify" clearable />
              </v-col>
              <v-col cols="12" md="2">
                <v-btn color="primary" block @click="loadOrders" prepend-icon="mdi-magnify">查询</v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title>
            订餐列表
            <v-chip size="small" class="ml-2" color="primary">{{ filteredOrders.length }}</v-chip>
            <v-spacer />
            <v-btn size="small" color="success" variant="outlined" :href="exportUrl" prepend-icon="mdi-download" class="mr-2">
              导出
            </v-btn>
            <v-btn size="small" color="primary" variant="outlined" @click="batchVerifyDialog = true" :disabled="filteredOrders.length === 0">
              批量核销
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-table density="compact" v-if="filteredOrders.length > 0">
              <thead>
                <tr>
                  <th>
                    <v-checkbox-btn v-model="selectAll" hide-details density="compact" />
                  </th>
                  <th>用户ID</th>
                  <th>姓名</th>
                  <th>日期</th>
                  <th>餐次</th>
                  <th>订餐时间</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in filteredOrders" :key="o.id">
                  <td>
                    <v-checkbox-btn v-model="selectedIds" :value="o.id" hide-details density="compact" />
                  </td>
                  <td>{{ o.user_id }}</td>
                  <td>{{ o.user_name }}</td>
                  <td>{{ o.date }}</td>
                  <td>{{ o.meal_type }}</td>
                  <td class="text-caption">{{ formatTime(o.ordered_at) }}</td>
                  <td>
                    <v-chip :color="o.consumed ? 'success' : 'grey-lighten-1'" size="small">
                      {{ o.consumed ? '已用餐' : '未核销' }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <div v-else class="text-center text-grey py-8">
              <v-icon size="48" class="mb-2">mdi-inbox</v-icon>
              <div>暂无订餐记录</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="mb-4">
          <v-card-title>
            本月订餐统计
            <v-spacer />
            <v-btn icon size="small" @click="changeMonth(-1)"><v-icon>mdi-chevron-left</v-icon></v-btn>
            <v-btn icon size="small" @click="changeMonth(1)"><v-icon>mdi-chevron-right</v-icon></v-btn>
          </v-card-title>
          <v-card-text>
            <div class="text-center text-subtitle-1 mb-2">{{ calendarTitle }}</div>
            <div class="calendar-grid">
              <div v-for="d in weekDays" :key="d" class="calendar-header">{{ d }}</div>
              <div
                v-for="(cell, idx) in calendarCells"
                :key="idx"
                class="calendar-cell"
                :class="{ 'other-month': !cell.currentMonth, 'today': cell.date === today }"
                @click="selectCalendarDate(cell)"
              >
                <div class="cell-date">{{ cell.day }}</div>
                <div v-if="cell.count > 0" class="cell-count">{{ cell.count }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title>汇总</v-card-title>
          <v-card-text>
            <div class="d-flex justify-space-between mb-2">
              <span>总订餐数</span>
              <strong>{{ filteredOrders.length }}</strong>
            </div>
            <div class="d-flex justify-space-between mb-2">
              <span>已用餐</span>
              <strong class="text-success">{{ consumedCount }}</strong>
            </div>
            <div class="d-flex justify-space-between mb-2">
              <span>未核销</span>
              <strong class="text-grey">{{ filteredOrders.length - consumedCount }}</strong>
            </div>
            <v-divider class="my-2" />
            <div class="d-flex justify-space-between">
              <span>用餐率</span>
              <strong>{{ consumeRate }}%</strong>
            </div>
            <v-progress-linear :model-value="consumeRate" color="success" class="mt-2" rounded />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="batchVerifyDialog" max-width="500">
      <v-card>
        <v-card-title>批量核销</v-card-title>
        <v-card-text>
          <div class="mb-3">已选择 {{ selectedIds.length }} 条订餐记录</div>
          <v-select v-model="batchStatus" :items="[{title:'已用餐',value:true},{title:'缺勤',value:false}]" label="核销状态" item-title="title" item-value="value" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="batchVerifyDialog = false">取消</v-btn>
          <v-btn color="primary" @click="doBatchVerify" :loading="batchLoading">确认核销</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '../api.js'

const showSnackbar = inject('showSnackbar', () => {})

const selectedDate = ref(new Date().toISOString().split('T')[0])
const mealTypeFilter = ref('')
const searchName = ref('')
const orders = ref([])
const statusRecords = ref([])
const selectedIds = ref([])
const selectAll = ref(false)
const today = new Date().toISOString().split('T')[0]

const batchVerifyDialog = ref(false)
const batchStatus = ref(true)
const batchLoading = ref(false)

const calendarDate = ref(new Date())
const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const monthOrderCounts = ref({})

const calendarTitle = computed(() => {
  const d = calendarDate.value
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
})

const calendarCells = computed(() => {
  const d = calendarDate.value
  const year = d.getFullYear()
  const month = d.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < startWeekday; i++) {
    const day = prevMonthLastDay - startWeekday + 1 + i
    const dateStr = formatDateStr(year, month - 1, day)
    cells.push({ day, date: dateStr, currentMonth: false, count: monthOrderCounts.value[dateStr] || 0 })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateStr(year, month, day)
    cells.push({ day, date: dateStr, currentMonth: true, count: monthOrderCounts.value[dateStr] || 0 })
  }
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const dateStr = formatDateStr(year, month + 1, i)
      cells.push({ day: i, date: dateStr, currentMonth: false, count: monthOrderCounts.value[dateStr] || 0 })
    }
  }
  return cells
})

function formatDateStr(year, month, day) {
  const d = new Date(year, month, day)
  return d.toISOString().split('T')[0]
}

function changeMonth(delta) {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() + delta)
  calendarDate.value = d
  loadMonthStats()
}

function selectCalendarDate(cell) {
  if (cell.currentMonth) {
    selectedDate.value = cell.date
    loadOrders()
  }
}

const exportUrl = computed(() => api.exportStatsCsv({ start_date: selectedDate.value, end_date: selectedDate.value, meal_type: mealTypeFilter.value || undefined }))

const filteredOrders = computed(() => {
  let result = orders.value
  if (searchName.value) {
    result = result.filter(o => (o.user_name || '').includes(searchName.value))
  }
  return result
})

const consumedCount = computed(() => filteredOrders.value.filter(o => o.consumed).length)
const consumeRate = computed(() => {
  if (filteredOrders.value.length === 0) return 0
  return Math.round((consumedCount.value / filteredOrders.value.length) * 100)
})

function formatTime(t) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

async function loadOrders() {
  try {
    const params = { date: selectedDate.value }
    if (mealTypeFilter.value) params.meal_type = mealTypeFilter.value
    orders.value = await api.getOrders(params)
    statusRecords.value = await api.getStatus({ date: selectedDate.value })
    const statusMap = {}
    statusRecords.value.forEach(s => { statusMap[`${s.user_id}_${s.meal_type}`] = s.consumed })
    orders.value = orders.value.map(o => ({
      ...o,
      consumed: statusMap[`${o.user_id}_${o.meal_type}`] === 1
    }))
    selectedIds.value = []
  } catch (e) {
    console.error(e)
  }
}

async function loadMonthStats() {
  try {
    const d = calendarDate.value
    const year = d.getFullYear()
    const month = d.getMonth()
    const start = formatDateStr(year, month, 1)
    const end = formatDateStr(year, month + 1, 0)
    const allOrders = await api.getOrders({})
    const counts = {}
    allOrders.forEach(o => {
      if (o.date >= start && o.date <= end) {
        counts[o.date] = (counts[o.date] || 0) + 1
      }
    })
    monthOrderCounts.value = counts
  } catch (e) {
    console.error(e)
  }
}

async function doBatchVerify() {
  batchLoading.value = true
  try {
    const statuses = filteredOrders.value
      .filter(o => selectedIds.value.includes(o.id))
      .map(o => ({
        user_id: o.user_id,
        user_name: o.user_name,
        date: o.date,
        meal_type: o.meal_type,
        consumed: batchStatus.value
      }))
    await api.batchCreateStatus(statuses)
    showSnackbar(`已核销 ${statuses.length} 条记录`, 'success')
    batchVerifyDialog.value = false
    await loadOrders()
  } catch (e) {
    showSnackbar('核销失败: ' + (e.response?.data?.error || e.message), 'error')
  } finally {
    batchLoading.value = false
  }
}

onMounted(async () => {
  await loadOrders()
  await loadMonthStats()
})
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.calendar-header {
  text-align: center;
  font-weight: bold;
  padding: 4px;
  color: #666;
  font-size: 12px;
}
.calendar-cell {
  min-height: 48px;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 4px;
  background: #fafafa;
  cursor: pointer;
  transition: background 0.2s;
}
.calendar-cell:hover {
  background: #e3f2fd;
}
.calendar-cell.other-month {
  opacity: 0.4;
}
.calendar-cell.today {
  border-color: #1976d2;
  border-width: 2px;
}
.cell-date {
  font-size: 12px;
  font-weight: 500;
}
.cell-count {
  font-size: 14px;
  font-weight: bold;
  color: #1976d2;
  text-align: center;
}
</style>
