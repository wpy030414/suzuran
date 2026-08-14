<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <v-icon size="32" color="primary" class="mr-2">mdi-view-dashboard</v-icon>
      <h2 class="text-h5">统计概览</h2>
      <v-spacer />
      <v-btn color="primary" variant="outlined" @click="refresh" :loading="loading">
        <v-icon start>mdi-refresh</v-icon>刷新
      </v-btn>
    </div>

    <v-row>
      <v-col cols="12" sm="6" md="3">
        <v-card color="primary" variant="tonal">
          <v-card-text class="text-center">
            <v-icon size="40" class="mb-2">mdi-account-group</v-icon>
            <div class="text-h4 font-weight-bold">{{ overview.total_registered }}</div>
            <div class="text-subtitle-2">本学期注册人数</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="info" variant="tonal">
          <v-card-text class="text-center">
            <v-icon size="40" class="mb-2">mdi-cart</v-icon>
            <div class="text-h4 font-weight-bold">{{ overview.today_ordered }}</div>
            <div class="text-subtitle-2">今日点餐数</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="success" variant="tonal">
          <v-card-text class="text-center">
            <v-icon size="40" class="mb-2">mdi-food</v-icon>
            <div class="text-h4 font-weight-bold">{{ overview.today_consumed }}</div>
            <div class="text-subtitle-2">今日已用餐</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card color="warning" variant="tonal">
          <v-card-text class="text-center">
            <v-icon size="40" class="mb-2">mdi-chart-donut</v-icon>
            <div class="text-h4 font-weight-bold">{{ overview.today_order_rate }}%</div>
            <div class="text-subtitle-2">今日点餐率</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>快捷操作</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="6">
                <v-btn block color="primary" to="/verify" prepend-icon="mdi-check-all">批量核销</v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn block color="secondary" to="/reviews" prepend-icon="mdi-file-chart">查看报表</v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn block color="info" to="/stats" prepend-icon="mdi-chart-line">统计详情</v-btn>
              </v-col>
              <v-col cols="6">
                <v-btn block color="success" :href="exportUrl" prepend-icon="mdi-download">导出数据</v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>今日动态</v-card-title>
          <v-card-text>
            <v-list v-if="recentOrders.length > 0" density="compact">
              <v-list-item
                v-for="(order, idx) in recentOrders"
                :key="idx"
                :prepend-icon="order.consumed ? 'mdi-check-circle' : 'mdi-clock-outline'"
                :title="`${order.user_name || '用户' + order.user_id} - ${order.meal_type}`"
                :subtitle="order.date"
              >
                <template v-slot:append>
                  <v-chip :color="order.consumed ? 'success' : 'grey'" size="x-small">
                    {{ order.consumed ? '已用餐' : '已订餐' }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
            <div v-else class="text-center text-grey py-6">
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
import { ref, onMounted, computed } from 'vue'
import api from '../api.js'

const loading = ref(false)
const overview = ref({ total_registered: 0, today_ordered: 0, today_consumed: 0, today_order_rate: 0 })
const recentOrders = ref([])
const today = new Date().toISOString().split('T')[0]
const exportUrl = computed(() => api.exportStatsCsv({ start_date: today, end_date: today }))

async function refresh() {
  loading.value = true
  try {
    overview.value = await api.getStatsOverview()
    const orders = await api.getOrders({ date: today })
    const status = await api.getStatus({ date: today })
    const statusMap = {}
    status.forEach(s => { statusMap[`${s.user_id}_${s.meal_type}`] = s.consumed })
    recentOrders.value = orders.slice(0, 8).map(o => ({
      ...o,
      consumed: statusMap[`${o.user_id}_${o.meal_type}`] === 1
    }))
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
</script>
