<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <h1 class="text-h4">餐标公示</h1>
          <v-spacer />
          <v-btn-toggle v-model="viewMode" mandatory color="primary" class="mr-2">
            <v-btn value="calendar" size="small">
              <v-icon start>mdi-calendar-month</v-icon>
              日历
            </v-btn>
            <v-btn value="list" size="small">
              <v-icon start>mdi-format-list-bulleted</v-icon>
              列表
            </v-btn>
          </v-btn-toggle>
          <v-btn
            v-if="canUpload"
            color="primary"
            prepend-icon="mdi-plus"
            @click="openUploadDialog"
          >
            上传餐标
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Calendar View -->
    <v-row v-if="viewMode === 'calendar'">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-btn icon="mdi-chevron-left" variant="text" @click="prevMonth" />
            <span class="text-h6 mx-2">{{ currentMonthLabel }}</span>
            <v-btn icon="mdi-chevron-right" variant="text" @click="nextMonth" />
            <v-spacer />
            <v-chip color="primary" variant="text">
              <v-icon start>mdi-filter</v-icon>
              {{ selectedCampusName || '全部校区' }}
            </v-chip>
          </v-card-title>

          <v-card-text>
            <!-- Weekday headers -->
            <div class="calendar-grid">
              <div v-for="day in weekDays" :key="day" class="calendar-header">
                {{ day }}
              </div>

              <!-- Calendar cells -->
              <div
                v-for="(cell, idx) in calendarCells"
                :key="idx"
                class="calendar-cell"
                :class="{ 'other-month': !cell.currentMonth, 'today': cell.isToday }"
                @click="cell.currentMonth && selectDate(cell.date)"
              >
                <div class="cell-date">{{ cell.day }}</div>
                <div class="cell-dots">
                  <v-icon
                    v-for="campus in cell.campuses"
                    :key="campus.id"
                    :color="campus.color"
                    size="12"
                    class="mx-1"
                  >
                    mdi-circle
                  </v-icon>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- List View -->
    <v-row v-if="viewMode === 'list'">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-select
              v-model="filterCampusId"
              :items="campuses"
              item-title="name"
              item-value="id"
              label="筛选校区"
              clearable
              density="compact"
              class="mr-4"
              style="max-width: 300px;"
            />
          </v-card-title>

          <v-data-table
            :headers="headers"
            :items="standards"
            :loading="loading"
            hover
          >
            <template v-slot:item.campus_name="{ item }">
              {{ item.campus_name }}
            </template>

            <template v-slot:item.date="{ item }">
              <div>
                <div>{{ item.date }}</div>
                <div class="text-caption text-grey">{{ item.week_day }} 第{{ item.week_number }}周</div>
              </div>
            </template>

            <template v-slot:item.image_urls="{ item }">
              <v-avatar v-if="item.image_urls" size="40" rounded>
                <v-img :src="item.image_urls.split(',')[0]" />
              </v-avatar>
              <span v-else class="text-grey">无图片</span>
            </template>

            <template v-slot:item.uploaded_at="{ item }">
              {{ formatDate(item.uploaded_at) }}
            </template>

            <template v-slot:item.actions="{ item }">
              <v-btn
                v-if="canUpload"
                icon="mdi-delete"
                variant="text"
                color="error"
                size="small"
                @click="deleteStandard(item.id)"
              />
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Day Detail Dialog -->
    <v-dialog v-model="showDayDialog" max-width="600">
      <v-card v-if="selectedDate">
        <v-card-title>
          {{ selectedDate }} {{ getWeekDay(selectedDate) }}
          <v-btn icon="mdi-close" variant="text" @click="showDayDialog = false" class="ml-auto" />
        </v-card-title>
        <v-card-text>
          <v-list v-if="dayStandards.length > 0">
            <v-list-item
              v-for="std in dayStandards"
              :key="std.id"
              :title="std.campus_name"
              :subtitle="`上传者: ${std.uploaded_by_name}`"
            >
              <template v-slot:prepend>
                <v-avatar size="40" rounded>
                  <v-img :src="std.image_urls.split(',')[0]" />
                </v-avatar>
              </template>
              <template v-slot:append>
                <v-btn
                  v-if="canUpload"
                  icon="mdi-delete"
                  variant="text"
                  color="error"
                  size="small"
                  @click="deleteStandard(std.id)"
                />
              </template>
            </v-list-item>
          </v-list>
          <div v-else class="text-center text-grey py-8">
            <v-icon size="64">mdi-image-off</v-icon>
            <div class="mt-2">当日暂无餐标公示</div>
          </div>
        </v-card-text>
        <v-card-actions v-if="canUpload">
          <v-btn color="primary" @click="uploadForSelectedDate">
            <v-icon start>mdi-plus</v-icon>
            上传餐标
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Upload Dialog -->
    <v-dialog v-model="showUploadDialog" max-width="500">
      <v-card>
        <v-card-title>
          上传餐标
          <v-btn icon="mdi-close" variant="text" @click="showUploadDialog = false" class="ml-auto" />
        </v-card-title>
        <v-card-text>
          <v-form ref="form">
            <v-select
              v-model="uploadForm.campus_id"
              :items="campuses"
              item-title="name"
              item-value="id"
              label="校区"
              :rules="[v => !!v || '请选择校区']"
              class="mb-3"
            />
            <v-text-field
              v-model="uploadForm.date"
              label="日期"
              type="date"
              :rules="[v => !!v || '请选择日期']"
              class="mb-3"
            />
            <v-text-field
              v-model="uploadForm.image_urls"
              label="图片URL（多张用逗号分隔）"
              :rules="[v => !!v || '请输入图片URL']"
              placeholder="https://example.com/image1.jpg,https://example.com/image2.jpg"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showUploadDialog = false">取消</v-btn>
          <v-btn color="primary" @click="submitUpload" :loading="uploading">上传</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import api from '../api.js';

const viewMode = ref('calendar');
const loading = ref(false);
const standards = ref([]);
const campuses = ref([]);
const filterCampusId = ref(null);

const user = ref(null);
const canUpload = computed(() => user.value && (user.value.role === 'admin' || user.value.role === 'staff'));

// Calendar state
const currentDate = ref(new Date());
const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const showDayDialog = ref(false);
const selectedDate = ref(null);
const dayStandards = ref([]);

// Upload dialog
const showUploadDialog = ref(false);
const uploading = ref(false);
const form = ref(null);
const uploadForm = ref({
  campus_id: null,
  date: '',
  image_urls: ''
});

const headers = [
  { title: '校区', key: 'campus_name' },
  { title: '日期', key: 'date' },
  { title: '图片', key: 'image_urls' },
  { title: '上传者', key: 'uploaded_by_name' },
  { title: '上传时间', key: 'uploaded_at' },
  { title: '操作', key: 'actions', sortable: false }
];

const currentMonthLabel = computed(() => {
  const d = currentDate.value;
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
});

const selectedCampusName = computed(() => {
  const c = campuses.value.find(c => c.id === filterCampusId.value);
  return c ? c.name : '';
});

const calendarCells = computed(() => {
  const d = currentDate.value;
  const year = d.getFullYear();
  const month = d.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = lastDay.getDate();

  const cells = [];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = formatDateObj(new Date(year, month - 1, day));
    cells.push({
      day,
      date,
      currentMonth: false,
      isToday: date === todayStr,
      campuses: getCampusesForDate(date)
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = formatDateObj(new Date(year, month, day));
    cells.push({
      day,
      date,
      currentMonth: true,
      isToday: date === todayStr,
      campuses: getCampusesForDate(date)
    });
  }

  // Next month days
  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    const date = formatDateObj(new Date(year, month + 1, day));
    cells.push({
      day,
      date,
      currentMonth: false,
      isToday: date === todayStr,
      campuses: getCampusesForDate(date)
    });
  }

  return cells;
});

function formatDateObj(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCampusesForDate(date) {
  const stds = standards.value.filter(s => s.date === date);
  if (filterCampusId.value) {
    return stds.filter(s => s.campus_id === filterCampusId.value).map(s => ({
      id: s.campus_id,
      color: getCampusColor(s.campus_id)
    }));
  }
  const uniqueCampusIds = [...new Set(stds.map(s => s.campus_id))];
  return uniqueCampusIds.map(id => ({
    id,
    color: getCampusColor(id)
  }));
}

function getCampusColor(campusId) {
  const colors = ['blue', 'green', 'orange', 'purple', 'red', 'teal', 'pink', 'indigo'];
  return colors[campusId % colors.length];
}

function getWeekDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return weekDays[day];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function prevMonth() {
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() - 1);
  currentDate.value = d;
}

function nextMonth() {
  const d = new Date(currentDate.value);
  d.setMonth(d.getMonth() + 1);
  currentDate.value = d;
}

function selectDate(date) {
  selectedDate.value = date;
  dayStandards.value = standards.value.filter(s => s.date === date);
  if (filterCampusId.value) {
    dayStandards.value = dayStandards.value.filter(s => s.campus_id === filterCampusId.value);
  }
  showDayDialog.value = true;
}

function openUploadDialog() {
  uploadForm.value = {
    campus_id: campuses.value[0]?.id || null,
    date: formatDateObj(new Date()),
    image_urls: ''
  };
  showUploadDialog.value = true;
}

function uploadForSelectedDate() {
  showDayDialog.value = false;
  uploadForm.value.date = selectedDate.value;
  showUploadDialog.value = true;
}

async function submitUpload() {
  const { valid } = await form.value.validate();
  if (!valid) return;

  uploading.value = true;
  try {
    await api.createStandard(uploadForm.value);
    showUploadDialog.value = false;
    await loadData();
  } catch (err) {
    alert('上传失败: ' + (err.response?.data?.error || err.message));
  } finally {
    uploading.value = false;
  }
}

async function deleteStandard(id) {
  if (!confirm('确定删除该餐标记录？')) return;
  try {
    await api.deleteStandard(id);
    await loadData();
    if (showDayDialog.value) {
      dayStandards.value = dayStandards.value.filter(s => s.id !== id);
    }
  } catch (err) {
    alert('删除失败: ' + (err.response?.data?.error || err.message));
  }
}

async function loadData() {
  loading.value = true;
  try {
    const params = {};
    if (filterCampusId.value) params.campus_id = filterCampusId.value;
    standards.value = await api.getStandards(params);
  } catch (err) {
    console.error('Failed to load standards:', err);
  } finally {
    loading.value = false;
  }
}

async function loadCampuses() {
  try {
    campuses.value = await api.getCampuses();
  } catch (err) {
    console.error('Failed to load campuses:', err);
  }
}

onMounted(async () => {
  try {
    user.value = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    user.value = null;
  }
  await loadCampuses();
  await loadData();
});

watch(filterCampusId, () => {
  loadData();
});
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-header {
  text-align: center;
  font-weight: 600;
  padding: 8px;
  color: #666;
}

.calendar-cell {
  min-height: 80px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.calendar-cell:hover {
  background: #f5f5f5;
  border-color: #1976d2;
}

.calendar-cell.other-month {
  opacity: 0.3;
}

.calendar-cell.today {
  background: #e3f2fd;
  border-color: #1976d2;
}

.cell-date {
  font-weight: 500;
  margin-bottom: 4px;
}

.cell-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
</style>
