<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <v-icon size="32" color="primary" class="mr-2">mdi-check-circle</v-icon>
      <h2 class="text-h5">用餐核销</h2>
    </div>

    <v-row>
      <v-col cols="12" md="4">
        <v-card class="mb-4">
          <v-card-title>核销条件</v-card-title>
          <v-card-text>
            <v-text-field v-model="selectedDate" type="date" label="日期" density="compact" class="mb-3" />
            <v-select v-model="mealType" :items="['早餐', '午餐', '晚餐']" label="餐次" density="compact" class="mb-3" />
            <v-btn color="primary" block @click="loadData" prepend-icon="mdi-magnify">查询</v-btn>
          </v-card-text>
        </v-card>

        <v-card class="mb-4">
          <v-card-title>核销汇总</v-card-title>
          <v-card-text>
            <div class="d-flex justify-space-between mb-2">
              <span>已订餐</span>
              <strong>{{ orderedCount }}</strong>
            </div>
            <div class="d-flex justify-space-between mb-2">
              <span>已用餐</span>
              <strong class="text-success">{{ consumedCount }}</strong>
            </div>
            <div class="d-flex justify-space-between mb-2">
              <span>未用餐</span>
              <strong class="text-error">{{ absentCount }}</strong>
            </div>
            <v-divider class="my-2" />
            <div class="d-flex justify-space-between">
              <span>用餐率</span>
              <strong>{{ consumeRate }}%</strong>
            </div>
            <v-progress-linear :model-value="consumeRate" color="success" class="mt-2" rounded />
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title>快捷操作</v-card-title>
          <v-card-text>
            <v-btn color="success" block class="mb-2" @click="verifyAll(true)" :disabled="absentPending.length === 0" prepend-icon="mdi-check-all">
              全部标记已用餐 ({{ absentPending.length }})
            </v-btn>
            <v-btn color="error" block variant="outlined" @click="verifyAll(false)" :disabled="absentPending.length === 0" prepend-icon="mdi-close-circle">
              全部标记缺勤 ({{ absentPending.length }})
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card>
          <v-card-title>
            待核销学生
            <v-chip size="small" class="ml-2" color="primary">{{ orderedList.length }}</v-chip>
          </v-card-title>
          <v-card-text>
            <v-table density="compact" v-if="orderedList.length > 0">
              <thead>
                <tr>
                  <th>用户ID</th>
                  <th>姓名</th>
                  <th>餐次</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in orderedList" :key="item.user_id">
                  <td>{{ item.user_id }}</td>
                  <td>{{ item.user_name }}</td>
                  <td>{{ item.meal_type }}</td>
                  <td>
                    <v-chip :color="item.consumed ? 'success' : 'warning'" size="small">
                      {{ item.consumed ? '已用餐' : '待核销' }}
                    </v-chip>
                  </td>
                  <td>
                    <v-btn
                      v-if="!item.consumed"
                      size="x-small"
                      color="success"
                      @click="verifySingle(item, true)"
                    >
                      已用餐
                    </v-btn>
                    <v-btn
                      v-else
                      size="x-small"
                      color="warning"
                      variant="outlined"
                      @click="verifySingle(item, false)"
                    >
                      撤销
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <div v-else class="text-center text-grey py-8">
              <v-icon size="48" class="mb-2">mdi-inbox</v-icon>
              <div>今日暂无订餐记录</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '../api.js'

const showSnackbar = inject('showSnackbar', () => {})

const selectedDate = ref(new Date().toISOString().split('T')[0])
const mealType = ref('午餐')
const orders = ref([])
const statusRecords = ref([])

const orderedList = computed(() => {
  const statusMap = {}
  statusRecords.value.forEach(s => {
    statusMap[`${s.user_id}_${s.meal_type}`] = s.consumed
  })
  return orders.value.map(o => ({
    ...o,
    consumed: statusMap[`${o.user_id}_${o.meal_type}`] === 1
  }))
})

const absentPending = computed(() => orderedList.value.filter(o => !o.consumed))
const orderedCount = computed(() => orderedList.value.length)
const consumedCount = computed(() => orderedList.value.filter(o => o.consumed).length)
const absentCount = computed(() => orderedCount.value - consumedCount.value)
const consumeRate = computed(() => {
  if (orderedCount.value === 0) return 0
  return Math.round((consumedCount.value / orderedCount.value) * 100)
})

async function loadData() {
  try {
    orders.value = await api.getOrders({ date: selectedDate.value, meal_type: mealType.value })
    statusRecords.value = await api.getStatus({ date: selectedDate.value, meal_type: mealType.value })
  } catch (e) {
    console.error(e)
  }
}

async function verifySingle(item, consumed) {
  try {
    await api.createStatus({
      user_id: item.user_id,
      user_name: item.user_name,
      date: selectedDate.value,
      meal_type: item.meal_type,
      consumed
    })
    showSnackbar(consumed ? '已标记为已用餐' : '已撤销', 'success')
    await loadData()
  } catch (e) {
    showSnackbar('核销失败: ' + (e.response?.data?.error || e.message), 'error')
  }
}

async function verifyAll(consumed) {
  try {
    const statuses = absentPending.value.map(o => ({
      user_id: o.user_id,
      user_name: o.user_name,
      date: selectedDate.value,
      meal_type: o.meal_type,
      consumed
    }))
    await api.batchCreateStatus(statuses)
    showSnackbar(`已批量核销 ${statuses.length} 条`, 'success')
    await loadData()
  } catch (e) {
    showSnackbar('批量核销失败: ' + (e.response?.data?.error || e.message), 'error')
  }
}

onMounted(loadData)
</script>
