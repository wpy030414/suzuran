<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <h1 class="text-h4">统计分析</h1>
          <v-spacer />
          <v-btn
            color="primary"
            prepend-icon="mdi-download"
            @click="exportCSV"
          >
            导出CSV
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-row>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="startDate"
          label="开始日期"
          type="date"
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="endDate"
          label="结束日期"
          type="date"
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-select
          v-model="selectedPeriodId"
          :items="periods"
          item-title="name"
          item-value="id"
          label="学期（菜谱统计）"
          clearable
          density="compact"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="4">
        <v-btn color="primary" block @click="loadAll">
          <v-icon start>mdi-magnify</v-icon>
          查询
        </v-btn>
      </v-col>
    </v-row>

    <!-- Summary Cards -->
    <v-row class="mt-4">
      <v-col cols="12" md="3">
        <v-card color="primary" variant="tonal">
          <v-card-text class="text-center">
            <v-icon size="40">mdi-school</v-icon>
            <div class="text-h4 mt-2">{{ summary.totalCampuses }}</div>
            <div class="text-caption">校区总数</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="success" variant="tonal">
          <v-card-text class="text-center">
            <v-icon size="40">mdi-chart-line</v-icon>
            <div class="text-h4 mt-2">{{ summary.avgStdRate }}%</div>
            <div class="text-caption">平均餐标公示率</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="info" variant="tonal">
          <v-card-text class="text-center">
            <v-icon size="40">mdi-calendar-check</v-icon>
            <div class="text-h4 mt-2">{{ summary.avgMenuRate }}%</div>
            <div class="text-caption">平均菜谱发布率</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="warning" variant="tonal">
          <v-card-text class="text-center">
            <v-icon size="40">mdi-alert</v-icon>
            <div class="text-h4 mt-2">{{ summary.belowThreshold }}</div>
            <div class="text-caption">低于阈值校区</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Standards Stats -->
    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start>mdi-image</v-icon>
            餐标公示率
          </v-card-title>
          <v-card-text>
            <div v-if="standardsStats.length === 0" class="text-center text-grey py-4">
              暂无数据
            </div>
            <div v-for="stat in standardsStats" :key="stat.campus_id" class="mb-4">
              <div class="d-flex align-center mb-1">
                <span class="font-weight-medium">{{ stat.campus_name }}</span>
                <v-spacer />
                <span class="text-caption">
                  {{ stat.published_days }}/{{ stat.total_days }}天
                </span>
                <v-chip
                  :color="stat.publish_rate >= 80 ? 'success' : stat.publish_rate >= 50 ? 'warning' : 'error'"
                  size="small"
                  class="ml-2"
                >
                  {{ stat.publish_rate }}%
                </v-chip>
              </div>
              <v-progress-linear
                :model-value="stat.publish_rate"
                :color="stat.publish_rate >= 80 ? 'success' : stat.publish_rate >= 50 ? 'warning' : 'error'"
                height="20"
                rounded
              >
                <template v-slot:default>
                  <span class="text-caption text-white">{{ stat.publish_rate }}%</span>
                </template>
              </v-progress-linear>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Menus Stats -->
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>
            <v-icon start>mdi-calendar-week</v-icon>
            菜谱发布率
          </v-card-title>
          <v-card-text>
            <div v-if="menusStats.length === 0" class="text-center text-grey py-4">
              暂无数据
            </div>
            <div v-for="stat in menusStats" :key="stat.campus_id" class="mb-4">
              <div class="d-flex align-center mb-1">
                <span class="font-weight-medium">{{ stat.campus_name }}</span>
                <v-spacer />
                <span class="text-caption">
                  {{ stat.published_weeks }}/{{ stat.total_weeks }}周
                </span>
                <v-chip
                  :color="stat.publish_rate >= 80 ? 'success' : stat.publish_rate >= 50 ? 'warning' : 'error'"
                  size="small"
                  class="ml-2"
                >
                  {{ stat.publish_rate }}%
                </v-chip>
              </div>
              <v-progress-linear
                :model-value="stat.publish_rate"
                :color="stat.publish_rate >= 80 ? 'success' : stat.publish_rate >= 50 ? 'warning' : 'error'"
                height="20"
                rounded
              >
                <template v-slot:default>
                  <span class="text-caption text-white">{{ stat.publish_rate }}%</span>
                </template>
              </v-progress-linear>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api.js';

const periods = ref([]);
const standardsStats = ref([]);
const menusStats = ref([]);

const startDate = ref('');
const endDate = ref('');
const selectedPeriodId = ref(null);

const THRESHOLD = 80;

const summary = computed(() => {
  const totalCampuses = standardsStats.value.length;
  const avgStdRate = totalCampuses > 0
    ? Math.round(standardsStats.value.reduce((sum, s) => sum + s.publish_rate, 0) / totalCampuses)
    : 0;
  const avgMenuRate = menusStats.value.length > 0
    ? Math.round(menusStats.value.reduce((sum, s) => sum + s.publish_rate, 0) / menusStats.value.length)
    : 0;
  const belowThreshold = standardsStats.value.filter(s => s.publish_rate < THRESHOLD).length;

  return { totalCampuses, avgStdRate, avgMenuRate, belowThreshold };
});

function exportCSV() {
  const params = {};
  if (startDate.value) params.start_date = startDate.value;
  if (endDate.value) params.end_date = endDate.value;
  if (selectedPeriodId.value) params.period_id = selectedPeriodId.value;
  api.exportStats(params);
}

async function loadAll() {
  await Promise.all([loadStandardsStats(), loadMenusStats()]);
}

async function loadStandardsStats() {
  try {
    const params = {};
    if (startDate.value) params.start_date = startDate.value;
    if (endDate.value) params.end_date = endDate.value;
    const result = await api.getStatsStandards(params);
    standardsStats.value = result.stats || [];
  } catch (err) {
    console.error('Failed to load standards stats:', err);
  }
}

async function loadMenusStats() {
  try {
    const params = {};
    if (selectedPeriodId.value) params.period_id = selectedPeriodId.value;
    const result = await api.getStatsMenus(params);
    menusStats.value = result.stats || [];
  } catch (err) {
    console.error('Failed to load menus stats:', err);
  }
}

async function loadPeriods() {
  try {
    periods.value = await api.getPeriods();
  } catch (err) {
    console.error('Failed to load periods:', err);
  }
}

onMounted(async () => {
  await loadPeriods();
  await loadAll();
});
</script>
