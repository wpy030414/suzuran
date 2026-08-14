<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <h1 class="text-h4">校区管理</h1>
          <v-spacer />
          <v-btn
            v-if="user?.role === 'admin'"
            color="primary"
            prepend-icon="mdi-plus"
            @click="openCreateDialog"
          >
            添加校区
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-text-field
              v-model="search"
              append-inner-icon="mdi-magnify"
              label="搜索校区"
              single-line
              hide-details
              density="compact"
              clearable
            />
          </v-card-title>

          <v-data-table
            :headers="headers"
            :items="filteredCampuses"
            :loading="loading"
            hover
          >
            <template v-slot:item.active="{ item }">
              <v-chip :color="item.active === 'true' ? 'success' : 'grey'" size="small">
                {{ item.active === 'true' ? '启用' : '停用' }}
              </v-chip>
            </template>

            <template v-slot:item.stats="{ item }">
              <div class="d-flex gap-2">
                <v-chip size="small" color="blue" variant="tonal">
                  <v-icon start size="small">mdi-image</v-icon>
                  {{ getStats(item.id, 'standards') }} 餐标
                </v-chip>
                <v-chip size="small" color="green" variant="tonal" class="ml-2">
                  <v-icon start size="small">mdi-calendar-week</v-icon>
                  {{ getStats(item.id, 'menus') }} 菜谱
                </v-chip>
              </div>
            </template>

            <template v-slot:item.actions="{ item }">
              <v-btn
                v-if="user?.role === 'admin'"
                icon="mdi-pencil"
                variant="text"
                color="primary"
                size="small"
                @click="openEditDialog(item)"
              />
              <v-btn
                v-if="user?.role === 'admin'"
                :icon="item.active === 'true' ? 'mdi-close-circle' : 'mdi-check-circle'"
                variant="text"
                :color="item.active === 'true' ? 'warning' : 'success'"
                size="small"
                @click="toggleActive(item)"
              />
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="showDialog" max-width="500">
      <v-card>
        <v-card-title>
          {{ editingCampus ? '编辑校区' : '添加校区' }}
          <v-btn icon="mdi-close" variant="text" @click="showDialog = false" class="ml-auto" />
        </v-card-title>
        <v-card-text>
          <v-form ref="form">
            <v-text-field
              v-model="campusForm.name"
              label="校区名称"
              :rules="[v => !!v || '请输入校区名称']"
              class="mb-3"
            />
            <v-text-field
              v-model="campusForm.address"
              label="地址"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDialog = false">取消</v-btn>
          <v-btn color="primary" @click="submitForm" :loading="saving">
            {{ editingCampus ? '保存' : '添加' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api.js';

const loading = ref(false);
const saving = ref(false);
const campuses = ref([]);
const standards = ref([]);
const menus = ref([]);
const search = ref('');

const user = ref(null);
const showDialog = ref(false);
const editingCampus = ref(null);
const form = ref(null);
const campusForm = ref({
  name: '',
  address: ''
});

const headers = [
  { title: '校区名称', key: 'name' },
  { title: '地址', key: 'address' },
  { title: '状态', key: 'active' },
  { title: '统计', key: 'stats', sortable: false },
  { title: '操作', key: 'actions', sortable: false }
];

const filteredCampuses = computed(() => {
  if (!search.value) return campuses.value;
  const term = search.value.toLowerCase();
  return campuses.value.filter(c =>
    c.name.toLowerCase().includes(term) ||
    (c.address && c.address.toLowerCase().includes(term))
  );
});

function getStats(campusId, type) {
  if (type === 'standards') {
    return standards.value.filter(s => s.campus_id === campusId).length;
  } else if (type === 'menus') {
    return menus.value.filter(m => m.campus_id === campusId).length;
  }
  return 0;
}

function openCreateDialog() {
  editingCampus.value = null;
  campusForm.value = { name: '', address: '' };
  showDialog.value = true;
}

function openEditDialog(campus) {
  editingCampus.value = campus;
  campusForm.value = {
    name: campus.name,
    address: campus.address || ''
  };
  showDialog.value = true;
}

async function submitForm() {
  const { valid } = await form.value.validate();
  if (!valid) return;

  saving.value = true;
  try {
    if (editingCampus.value) {
      await api.updateCampus(editingCampus.value.id, campusForm.value);
    } else {
      await api.createCampus(campusForm.value);
    }
    showDialog.value = false;
    await loadCampuses();
  } catch (err) {
    alert('操作失败: ' + (err.response?.data?.error || err.message));
  } finally {
    saving.value = false;
  }
}

async function toggleActive(campus) {
  const action = campus.active === 'true' ? '停用' : '启用';
  if (!confirm(`确定${action}该校区？`)) return;

  try {
    if (campus.active === 'true') {
      await api.deleteCampus(campus.id); // Soft delete
    } else {
      await api.updateCampus(campus.id, { active: 'true' });
    }
    await loadCampuses();
  } catch (err) {
    alert('操作失败: ' + (err.response?.data?.error || err.message));
  }
}

async function loadCampuses() {
  loading.value = true;
  try {
    campuses.value = await api.getCampuses();
  } catch (err) {
    console.error('Failed to load campuses:', err);
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  try {
    standards.value = await api.getStandards({});
    menus.value = await api.getMenus({});
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

onMounted(async () => {
  try {
    user.value = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    user.value = null;
  }
  await loadCampuses();
  await loadStats();
});
</script>
