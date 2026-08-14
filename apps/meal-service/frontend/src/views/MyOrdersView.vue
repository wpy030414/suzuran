<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <v-icon size="32" color="primary" class="mr-2">mdi-clipboard-check</v-icon>
      <h2 class="text-h5">我的订餐</h2>
    </div>

    <v-alert v-if="message" :type="messageType" class="mb-4" closable @click:close="message=''">
      {{ message }}
    </v-alert>

    <v-row>
      <v-col cols="12" md="5">
        <v-card class="mb-4">
          <v-card-title>快速订餐</v-card-title>
          <v-card-text>
            <div class="text-subtitle-2 mb-2">
              <v-icon size="small">mdi-account</v-icon>
              {{ currentUser.userName }}
              <v-chip size="x-small" class="ml-2">{{ today }}</v-chip>
            </div>
            <v-select
              v-model="mealType"
              :items="mealTypes"
              label="选择餐次"
              class="mb-3"
            />
            <v-btn
              color="primary"
              block
              size="large"
              @click="orderToday"
              :loading="loading"
              prepend-icon="mdi-cart-plus"
            >
              一键订餐
            </v-btn>
            <v-alert v-if="alreadyOrdered" type="info" variant="tonal" class="mt-3">
              <div class="d-flex align-center">
                <v-icon class="mr-2">mdi-information</v-icon>
                <div>
                  <div>今日{{ mealType }}已订餐</div>
                  <div class="text-caption">{{ existingOrder?.ordered_at ? formatTime(existingOrder.ordered_at) : '' }}</div>
                </div>
              </div>
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title>
            本月订餐日历
            <v-spacer />
            <v-btn icon size="small" @click="changeMonth(-1)"><v-icon>mdi-chevron-left</v-icon></v-btn>
            <span class="mx-2 text-subtitle-2">{{ calendarTitle }}</span>
            <v-btn icon size="small" @click="changeMonth(1)"><v-icon>mdi-chevron-right</v-icon></v-btn>
          </v-card-title>
          <v-card-text>
            <div class="calendar-grid">
              <div v-for="d in weekDays" :key="d" class="calendar-header">{{ d }}</div>
              <div
                v-for="(cell, idx) in calendarCells"
                :key="idx"
                class="calendar-cell"
                :class="{
                  'other-month': !cell.currentMonth,
                  'today': cell.date === today,
                  'has-order': cell.orders.length > 0,
                  'has-consumed': cell.orders.some(o => o.consumed)
                }"
              >
                <div class="cell-date">{{ cell.day }}</div>
                <div v-if="cell.orders.length" class="cell-badges">
                  <v-chip
                    v-for="o in cell.orders"
                    :key="o.id"
                    :color="o.consumed ? 'success' : 'info'"
                    size="x-small"
                  >
                    {{ mealTypeShort(o.meal_type) }}
                  </v-chip>
                </div>
              </div>
            </div>
            <div class="mt-3 d-flex align-center text-caption">
              <v-chip size="x-small" color="info" class="mr-1">订</v-chip>已订餐
              <v-chip size="x-small" color="success" class="ml-2 mr-1">用</v-chip>已用餐
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="7">
        <v-card>
          <v-card-title>
            订餐记录
            <v-chip size="small" class="ml-2" color="primary">{{ orders.length }}</v-chip>
          </v-card-title>
          <v-card-text>
            <v-table density="compact" v-if="orders.length > 0">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>餐次</th>
                  <th>状态</th>
                  <th>订餐时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in sortedOrders" :key="o.id">
                  <td>{{ o.date }}</td>
                  <td>{{ o.meal_type }}</td>
                  <td>
                    <v-chip
                      :color="o.consumed ? 'success' : 'grey-lighten-1'"
                      size="small"
                      variant="flat"
                    >
                      {{ o.consumed ? '已用餐' : '已订餐' }}
                    </v-chip>
                  </td>
                  <td class="text-caption">{{ formatTime(o.ordered_at) }}</td>
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
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import api from '../api.js'

const showSnackbar = inject('showSnackbar', () => {})

const currentUser = ref({
  userId: parseInt(localStorage.getItem('demo_user_id') || '0'),
  userName: localStorage.getItem('demo_user_name') || '',
  role: localStorage.getItem('demo_user_role') || 'student'
})

const mealTypes = ['早餐', '午餐', '晚餐']
const mealType = ref('午餐')
const loading = ref(false)
const message = ref('')
const messageType = ref('success')
const orders = ref([])
const statusRecords = ref([])
const today = new Date().toISOString().split('T')[0]

const calendarDate = ref(new Date())
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

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
    cells.push({ day, date: dateStr, currentMonth: false, orders: getOrdersForDate(dateStr) })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateStr(year, month, day)
    cells.push({ day, date: dateStr, currentMonth: true, orders: getOrdersForDate(dateStr) })
  }
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const dateStr = formatDateStr(year, month + 1, i)
      cells.push({ day: i, date: dateStr, currentMonth: false, orders: getOrdersForDate(dateStr) })
    }
  }
  return cells
})

function formatDateStr(year, month, day) {
  const d = new Date(year, month, day)
  return d.toISOString().split('T')[0]
}

function getOrdersForDate(dateStr) {
  return orders.value.filter(o => o.date === dateStr)
}

function mealTypeShort(t) {
  return t === '早餐' ? '早' : t === '午餐' ? '午' : '晚'
}

function formatTime(t) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

function changeMonth(delta) {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() + delta)
  calendarDate.value = d
}

const alreadyOrdered = computed(() => {
  return orders.value.some(o => o.date === today && o.meal_type === mealType.value)
})

const existingOrder = computed(() => {
  return orders.value.find(o => o.date === today && o.meal_type === mealType.value)
})

const sortedOrders = computed(() =>
  [...orders.value].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
)

async function loadOrders() {
  try {
    orders.value = await api.getOrders({ user_id: currentUser.value.userId })
    statusRecords.value = await api.getStatus({ user_id: currentUser.value.userId })
    const statusMap = {}
    statusRecords.value.forEach(s => { statusMap[`${s.date}_${s.meal_type}`] = s.consumed })
    orders.value = orders.value.map(o => ({
      ...o,
      consumed: statusMap[`${o.date}_${o.meal_type}`] === 1
    }))
  } catch (e) {
    console.error(e)
  }
}

async function orderToday() {
  loading.value = true
  message.value = ''
  try {
    const res = await api.createOrder({ meal_type: mealType.value, date: today })
    if (res.idempotent) {
      message.value = '今日已点餐，无需重复订餐'
      messageType.value = 'info'
    } else {
      message.value = '订餐成功！'
      messageType.value = 'success'
      showSnackbar('订餐成功', 'success')
    }
    await loadOrders()
  } catch (e) {
    message.value = e.response?.data?.error || '订餐失败'
    messageType.value = 'error'
  } finally {
    loading.value = false
  }
}

watch(mealType, () => {
  // Reset message when meal type changes
  message.value = ''
})

onMounted(loadOrders)
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
  min-height: 56px;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 4px;
  background: #fafafa;
}
.calendar-cell.other-month {
  opacity: 0.4;
}
.calendar-cell.today {
  border-color: #1976d2;
  border-width: 2px;
}
.calendar-cell.has-order {
  background: #e3f2fd;
}
.calendar-cell.has-consumed {
  background: #e8f5e9;
}
.cell-date {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 2px;
}
.cell-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
</style>
