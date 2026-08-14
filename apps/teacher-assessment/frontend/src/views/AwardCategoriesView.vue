<template>
  <v-container>
    <h2 class="text-h5 mb-4">获奖类别管理</h2>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" sm="4" md="3">
        <v-select v-model="filterScope" :items="scopeOptions" label="范围筛选" density="compact" clearable hide-details />
      </v-col>
      <v-col cols="12" sm="4" md="3" class="d-flex align-center">
        <v-btn color="primary" @click="dialog = true" v-if="canManage">
          <v-icon start>mdi-plus</v-icon>添加类别
        </v-btn>
      </v-col>
    </v-row>

    <!-- Categories Table -->
    <v-card>
      <v-table density="compact">
        <thead>
          <tr>
            <th>名称</th>
            <th>范围</th>
            <th>描述</th>
            <th v-if="canManage">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in filteredCategories" :key="c.id">
            <td>{{ c.name }}</td>
            <td>
              <v-chip :color="c.scope === 'semester' ? 'info' : 'purple'" size="small">
                {{ c.scope === 'semester' ? '学期' : '学年' }}
              </v-chip>
            </td>
            <td>{{ c.description || '--' }}</td>
            <td v-if="canManage">
              <v-btn size="x-small" color="error" variant="tonal" @click="remove(c.id)">删除</v-btn>
            </td>
          </tr>
          <tr v-if="filteredCategories.length === 0">
            <td :colspan="canManage ? 4 : 3" class="text-center text-grey pa-4">暂无数据</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Create Dialog -->
    <v-dialog v-model="dialog" max-width="500" :fullscreen="isMobile">
      <v-card>
        <v-card-title>添加获奖类别</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="名称 *" :error-messages="errors.name" />
          <v-select v-model="form.scope" :items="scopeOptions" label="范围 *" :error-messages="errors.scope" />
          <v-textarea v-model="form.description" label="描述" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const categories = ref([])
const dialog = ref(false)
const filterScope = ref(null)
const isMobile = ref(window.innerWidth < 600)

const scopeOptions = [
  { title: '学期', value: 'semester' },
  { title: '学年', value: 'annual' },
]

const form = ref({ name: '', scope: '', description: '' })
const errors = ref({})

const currentRole = localStorage.getItem('user_role') || 'admin'
const canManage = ['admin', 'director'].includes(currentRole)

const filteredCategories = computed(() => {
  if (!filterScope.value) return categories.value
  return categories.value.filter(c => c.scope === filterScope.value)
})

function validate() {
  const e = {}
  if (!form.value.name) e.name = '必填'
  if (!form.value.scope) e.scope = '必填'
  errors.value = e
  return Object.keys(e).length === 0
}

async function save() {
  if (!validate()) return
  try {
    await api.createAwardCategory({
      name: form.value.name,
      scope: form.value.scope,
      description: form.value.description || null,
    })
    dialog.value = false
    form.value = { name: '', scope: '', description: '' }
    errors.value = {}
    categories.value = await api.getAwardCategories()
  } catch (err) {
    console.error(err)
  }
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteAwardCategory(id)
    categories.value = await api.getAwardCategories()
  }
}

onMounted(async () => {
  categories.value = await api.getAwardCategories()
})
</script>
