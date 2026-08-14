<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <h1 class="text-h4">餐标总览</h1>
          <v-spacer />
          <v-chip color="primary" variant="elevated" class="mr-2">
            <v-icon start>mdi-calendar-range</v-icon>
            {{ weekLabel || '请选择周' }}
          </v-chip>
        </div>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-row>
      <v-col cols="12" md="6">
        <v-select
          v-model="selectedPeriodId"
          :items="periods"
          item-title="name"
          item-value="id"
          label="选择学期"
          density="compact"
          @update:model-value="onPeriodChange"
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-select
          v-model="selectedWeekLabel"
          :items="availableWeeks"
          label="选择周"
          density="compact"
          @update:model-value="loadOverview"
        />
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64" />
        <div class="mt-4 text-grey">加载中...</div>
      </v-col>
    </v-row>

    <!-- Matrix Table -->
    <v-row v-else-if="overviewData">
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-h6">
            {{ overviewData.period?.name || '' }} - {{ overviewData.week_label }}
          </v-card-title>
          <v-card-text>
            <div class="matrix-wrapper">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th class="campus-col">校区</th>
                    <th class="menu-col">菜谱</th>
                    <th
                      v-for="day in overviewData.week_dates"
                      :key="day.day_of_week"
                      class="day-col"
                      :class="{ 'weekend': day.day_of_week >= 6 }"
                    >
                      <div>{{ day.day_name }}</div>
                      <div class="text-caption">{{ formatDateShort(day.date) }}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="campus in overviewData.campuses" :key="campus.campus_id">
                    <td class="campus-name">{{ campus.campus_name }}</td>
                    <td class="menu-cell" @click="clickMenu(campus)">
                      <div v-if="campus.menu" class="cell-content has-data">
                        <v-icon color="white" size="20">mdi-check</v-icon>
                        <div class="text-caption">已发布</div>
                      </div>
                      <div v-else class="cell-content no-data">
                        <v-icon color="grey" size="20">mdi-close</v-icon>
                        <div class="text-caption text-grey">未发布</div>
                      </div>
                    </td>
                    <td
                      v-for="day in campus.days"
                      :key="day.day_of_week"
                      class="day-cell"
                      :class="{ 'weekend': day.day_of_week >= 6 }"
                      @click="clickDay(campus, day)"
                    >
                      <div v-if="day.standard" class="cell-content has-data">
                        <v-icon color="white" size="20">mdi-check</v-icon>
                        <div class="text-caption">已公示</div>
                      </div>
                      <div v-else class="cell-content no-data">
                        <v-icon color="grey" size="20">mdi-close</v-icon>
                        <div class="text-caption text-grey">未公示</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-else>
      <v-col cols="12" class="text-center py-12">
        <v-icon size="64" color="grey">mdi-information-outline</v-icon>
        <div class="mt-4 text-grey">请选择学期和周查看数据</div>
      </v-col>
    </v-row>

    <!-- Detail Dialog -->
    <v-dialog v-model="showDetailDialog" max-width="600">
      <v-card v-if="detailData">
        <v-card-title>
          {{ detailData.title }}
          <v-btn icon="mdi-close" variant="text" @click="showDetailDialog = false" class="ml-auto" />
        </v-card-title>
        <v-card-text>
          <div v-if="detailData.type === 'menu' && detailData.data">
            <v-list>
              <v-list-item
                :title="`周标签: ${detailData.data.week_label}`"
                :subtitle="`发布者: ${detailData.data.published_by_name}`"
              >
                <template v-slot:prepend>
                  <v-avatar size="40" rounded>
                    <v-img v-if="detailData.data.image_urls" :src="detailData.data.image_urls.split(',')[0]" />
                    <v-icon v-else>mdi-image</v-icon>
                  </v-avatar>
                </template>
              </v-list-item>
            </v-list>
          </div>
          <div v-else-if="detailData.type === 'day' && detailData.data">
            <v-list>
              <v-list-item
                :title="`${detailData.data.campus_name} - ${detailData.data.date}`"
                :subtitle="`上传者: ${detailData.data.uploaded_by_name}`"
              >
                <template v-slot:prepend>
                  <v-avatar size="40" rounded>
                    <v-img v-if="detailData.data.image_urls" :src="detailData.data.image_urls.split(',')[0]" />
                    <v-icon v-else>mdi-image</v-icon>
                  </v-avatar>
                </template>
              </v-list-item>
            </v-list>
          </div>
          <div v-else class="text-center text-grey py-8">
            <v-icon size="64">mdi-information-outline</v-icon>
            <div class="mt-2">暂无数据</div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api.js';

const loading = ref(false);
const periods = ref([]);
const availableWeeks = ref([]);
const overviewData = ref(null);

const selectedPeriodId = ref(null);
const selectedWeekLabel = ref(null);

const showDetailDialog = ref(false);
const detailData = ref(null);

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function clickMenu(campus) {
  if (campus.menu) {
    detailData.value = {
      type: 'menu',
      title: `${campus.campus_name} - 周菜谱`,
      data: campus.menu
    };
    showDetailDialog.value = true;
  }
}

function clickDay(campus, day) {
  if (day.standard) {
    detailData.value = {
      type: 'day',
      title: `${campus.campus_name} - ${day.date} 餐标`,
      data: day.standard
    };
    showDetailDialog.value = true;
  }
}

async function loadPeriods() {
  try {
    periods.value = await api.getPeriods();
    if (periods.value.length > 0) {
      selectedPeriodId.value = periods.value[0].id;
      await loadWeeks();
    }
  } catch (err) {
    console.error('Failed to load periods:', err);
  }
}

async function loadWeeks() {
  try {
    availableWeeks.value = await api.getOverviewWeeks();
    if (availableWeeks.value.length > 0) {
      selectedWeekLabel.value = availableWeeks.value[availableWeeks.value.length - 1];
      await loadOverview();
    }
  } catch (err) {
    console.error('Failed to load weeks:', err);
  }
}

function onPeriodChange() {
  loadWeeks();
}

async function loadOverview() {
  if (!selectedPeriodId.value || !selectedWeekLabel.value) return;

  loading.value = true;
  try {
    overviewData.value = await api.getOverview({
      period_id: selectedPeriodId.value,
      week_label: selectedWeekLabel.value
    });
  } catch (err) {
    console.error('Failed to load overview:', err);
    overviewData.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadPeriods();
});
</script>

<style scoped>
.matrix-wrapper {
  overflow-x: auto;
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

.matrix-table th,
.matrix-table td {
  border: 1px solid #e0e0e0;
  padding: 8px;
  text-align: center;
  vertical-align: middle;
}

.matrix-table th {
  background: #f5f5f5;
  font-weight: 600;
}

.campus-col {
  min-width: 120px;
  text-align: left !important;
}

.menu-col {
  min-width: 100px;
}

.day-col {
  min-width: 80px;
}

.day-col.weekend {
  background: #fafafa;
}

.campus-name {
  text-align: left !important;
  font-weight: 500;
}

.menu-cell,
.day-cell {
  cursor: pointer;
  transition: background 0.2s;
}

.menu-cell:hover,
.day-cell:hover {
  background: #e3f2fd;
}

.day-cell.weekend {
  background: #fafafa;
}

.cell-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  border-radius: 4px;
  padding: 4px;
}

.cell-content.has-data {
  background: #4caf50;
  color: white;
}

.cell-content.no-data {
  background: #f5f5f5;
}
</style>
