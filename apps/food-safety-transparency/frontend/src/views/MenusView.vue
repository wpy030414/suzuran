<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <h1 class="text-h4">周菜谱</h1>
          <v-spacer />
          <v-btn
            v-if="canManage"
            color="primary"
            prepend-icon="mdi-plus"
            @click="openCreateDialog"
          >
            发布菜谱
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-row>
      <v-col cols="12" md="4">
        <v-select
          v-model="filterPeriodId"
          :items="periods"
          item-title="name"
          item-value="id"
          label="选择学期"
          clearable
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-select
          v-model="filterCampusId"
          :items="campuses"
          item-title="name"
          item-value="id"
          label="选择校区"
          clearable
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-select
          v-model="filterWeekLabel"
          :items="availableWeeks"
          label="选择周"
          clearable
          density="compact"
        />
      </v-col>
    </v-row>

    <!-- Menus List -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-data-table
            :headers="headers"
            :items="menus"
            :loading="loading"
            hover
            @click:row="selectMenu"
          >
            <template v-slot:item.image_urls="{ item }">
              <v-avatar v-if="item.image_urls" size="40" rounded>
                <v-img :src="item.image_urls.split(',')[0]" />
              </v-avatar>
              <span v-else class="text-grey">无图片</span>
            </template>

            <template v-slot:item.published_at="{ item }">
              {{ formatDate(item.published_at) }}
            </template>

            <template v-slot:item.actions="{ item }">
              <v-btn
                icon="mdi-food"
                variant="text"
                color="primary"
                size="small"
                @click.stop="viewMenuItems(item)"
              />
              <v-btn
                v-if="canManage"
                icon="mdi-delete"
                variant="text"
                color="error"
                size="small"
                @click.stop="deleteMenu(item.id)"
              />
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Menu Items Dialog -->
    <v-dialog v-model="showItemsDialog" max-width="900">
      <v-card v-if="selectedMenu">
        <v-card-title>
          {{ selectedMenu.campus_name }} - {{ selectedMenu.week_label }}
          <v-btn icon="mdi-close" variant="text" @click="showItemsDialog = false" class="ml-auto" />
        </v-card-title>
        <v-card-text>
          <div class="d-flex align-center mb-4">
            <h3 class="text-h6">菜谱明细</h3>
            <v-spacer />
            <v-btn
              v-if="canManage"
              color="primary"
              size="small"
              prepend-icon="mdi-plus"
              @click="openAddItemDialog"
            >
              添加菜品
            </v-btn>
          </div>

          <!-- Weekly Grid -->
          <v-table density="compact">
            <thead>
              <tr>
                <th>餐次</th>
                <th v-for="day in weekDays" :key="day">{{ day }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="meal in mealTypes" :key="meal">
                <td><strong>{{ meal }}</strong></td>
                <td v-for="(day, idx) in weekDays" :key="idx">
                  <div v-for="item in getItemsForDay(idx + 1, meal)" :key="item.id" class="menu-item-cell">
                    <div class="font-weight-medium">{{ item.dish_name }}</div>
                    <div v-if="item.ingredients" class="text-caption text-grey">{{ item.ingredients }}</div>
                    <div v-if="item.quantity" class="text-caption">{{ item.quantity }}</div>
                    <div v-if="item.price" class="text-caption text-primary">¥{{ item.price }}</div>
                    <v-btn
                      v-if="canManage"
                      icon="mdi-delete"
                      variant="text"
                      color="error"
                      size="x-small"
                      @click="deleteMenuItem(item.id)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Add Menu Item Dialog -->
    <v-dialog v-model="showAddItemDialog" max-width="500">
      <v-card>
        <v-card-title>
          添加菜品
          <v-btn icon="mdi-close" variant="text" @click="showAddItemDialog = false" class="ml-auto" />
        </v-card-title>
        <v-card-text>
          <v-form ref="itemForm">
            <v-select
              v-model="itemForm.day_of_week"
              :items="weekDays.map((d, i) => ({ title: d, value: i + 1 }))"
              label="星期"
              :rules="[v => !!v || '请选择']"
              class="mb-3"
            />
            <v-select
              v-model="itemForm.meal_type"
              :items="mealTypes"
              label="餐次"
              :rules="[v => !!v || '请选择']"
              class="mb-3"
            />
            <v-text-field
              v-model="itemForm.dish_name"
              label="菜品名称"
              :rules="[v => !!v || '请输入']"
              class="mb-3"
            />
            <v-text-field
              v-model="itemForm.ingredients"
              label="食材"
              class="mb-3"
            />
            <v-text-field
              v-model="itemForm.quantity"
              label="份量"
              class="mb-3"
            />
            <v-text-field
              v-model="itemForm.price"
              label="价格"
              type="number"
              step="0.1"
              prefix="¥"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showAddItemDialog = false">取消</v-btn>
          <v-btn color="primary" @click="submitAddItem" :loading="savingItem">添加</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Create Menu Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="500">
      <v-card>
        <v-card-title>
          发布周菜谱
          <v-btn icon="mdi-close" variant="text" @click="showCreateDialog = false" class="ml-auto" />
        </v-card-title>
        <v-card-text>
          <v-form ref="menuFormRef">
            <v-select
              v-model="menuFormData.campus_id"
              :items="campuses"
              item-title="name"
              item-value="id"
              label="校区"
              :rules="[v => !!v || '请选择']"
              class="mb-3"
            />
            <v-select
              v-model="menuFormData.period_id"
              :items="periods"
              item-title="name"
              item-value="id"
              label="学期"
              :rules="[v => !!v || '请选择']"
              class="mb-3"
            />
            <v-text-field
              v-model="menuFormData.week_label"
              label="周标签"
              placeholder="2025-2026学年第一学期第3周"
              :rules="[v => !!v || '请输入']"
              class="mb-3"
            />
            <v-text-field
              v-model="menuFormData.image_urls"
              label="菜谱图片URL"
              placeholder="https://example.com/menu.jpg"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showCreateDialog = false">取消</v-btn>
          <v-btn color="primary" @click="submitCreateMenu" :loading="creating">发布</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import api from '../api.js';

const loading = ref(false);
const menus = ref([]);
const campuses = ref([]);
const periods = ref([]);
const availableWeeks = ref([]);

const filterPeriodId = ref(null);
const filterCampusId = ref(null);
const filterWeekLabel = ref(null);

const user = ref(null);
const canManage = computed(() => user.value && (user.value.role === 'admin' || user.value.role === 'staff'));

const weekDays = ['周一', '周二', '周三', '周四', '周五'];
const mealTypes = ['早餐', '午餐', '晚餐'];

const selectedMenu = ref(null);
const menuItems = ref([]);
const showItemsDialog = ref(false);
const showAddItemDialog = ref(false);
const savingItem = ref(false);
const itemForm = ref(null);
const itemFormData = ref({
  day_of_week: null,
  meal_type: '',
  dish_name: '',
  ingredients: '',
  quantity: '',
  price: null
});

const showCreateDialog = ref(false);
const creating = ref(false);
const menuFormRef = ref(null);
const menuFormData = ref({
  campus_id: null,
  period_id: null,
  week_label: '',
  image_urls: ''
});

const headers = [
  { title: '校区', key: 'campus_name' },
  { title: '学期', key: 'period_id' },
  { title: '周', key: 'week_label' },
  { title: '图片', key: 'image_urls' },
  { title: '发布者', key: 'published_by_name' },
  { title: '发布时间', key: 'published_at' },
  { title: '操作', key: 'actions', sortable: false }
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getItemsForDay(dayOfWeek, mealType) {
  return menuItems.value.filter(
    item => item.day_of_week === dayOfWeek && item.meal_type === mealType
  );
}

function selectMenu(event, { item }) {
  viewMenuItems(item);
}

async function viewMenuItems(menu) {
  selectedMenu.value = menu;
  try {
    menuItems.value = await api.getMenuItems({ menu_id: menu.id });
    showItemsDialog.value = true;
  } catch (err) {
    console.error('Failed to load menu items:', err);
  }
}

function openAddItemDialog() {
  itemFormData.value = {
    day_of_week: null,
    meal_type: '',
    dish_name: '',
    ingredients: '',
    quantity: '',
    price: null
  };
  showAddItemDialog.value = true;
}

async function submitAddItem() {
  const { valid } = await itemForm.value.validate();
  if (!valid) return;

  savingItem.value = true;
  try {
    await api.createMenuItem({
      menu_id: selectedMenu.value.id,
      ...itemFormData.value
    });
    showAddItemDialog.value = false;
    menuItems.value = await api.getMenuItems({ menu_id: selectedMenu.value.id });
  } catch (err) {
    alert('添加失败: ' + (err.response?.data?.error || err.message));
  } finally {
    savingItem.value = false;
  }
}

async function deleteMenuItem(id) {
  if (!confirm('确定删除该菜品？')) return;
  try {
    await api.deleteMenuItem(id);
    menuItems.value = menuItems.value.filter(item => item.id !== id);
  } catch (err) {
    alert('删除失败: ' + (err.response?.data?.error || err.message));
  }
}

function openCreateDialog() {
  menuFormData.value = {
    campus_id: campuses.value[0]?.id || null,
    period_id: periods.value[0]?.id || null,
    week_label: '',
    image_urls: ''
  };
  showCreateDialog.value = true;
}

async function submitCreateMenu() {
  const { valid } = await menuFormRef.value.validate();
  if (!valid) return;

  creating.value = true;
  try {
    await api.createMenu(menuFormData.value);
    showCreateDialog.value = false;
    await loadData();
  } catch (err) {
    alert('发布失败: ' + (err.response?.data?.error || err.message));
  } finally {
    creating.value = false;
  }
}

async function deleteMenu(id) {
  if (!confirm('确定删除该菜谱？')) return;
  try {
    await api.deleteMenu(id);
    await loadData();
  } catch (err) {
    alert('删除失败: ' + (err.response?.data?.error || err.message));
  }
}

async function loadData() {
  loading.value = true;
  try {
    const params = {};
    if (filterPeriodId.value) params.period_id = filterPeriodId.value;
    if (filterCampusId.value) params.campus_id = filterCampusId.value;
    if (filterWeekLabel.value) params.week_label = filterWeekLabel.value;
    menus.value = await api.getMenus(params);
  } catch (err) {
    console.error('Failed to load menus:', err);
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

async function loadPeriods() {
  try {
    periods.value = await api.getPeriods();
  } catch (err) {
    console.error('Failed to load periods:', err);
  }
}

async function loadWeeks() {
  try {
    availableWeeks.value = await api.getOverviewWeeks();
  } catch (err) {
    console.error('Failed to load weeks:', err);
  }
}

onMounted(async () => {
  try {
    user.value = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    user.value = null;
  }
  await loadCampuses();
  await loadPeriods();
  await loadWeeks();
  await loadData();
});

watch([filterPeriodId, filterCampusId, filterWeekLabel], () => {
  loadData();
});
</script>

<style scoped>
.menu-item-cell {
  padding: 4px;
  border-bottom: 1px solid #eee;
}

.menu-item-cell:last-child {
  border-bottom: none;
}
</style>
