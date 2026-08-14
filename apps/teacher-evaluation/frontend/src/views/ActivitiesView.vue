<template>
  <v-container>
    <h2 class="text-h5 mb-4">评价活动管理</h2>

    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          prepend-icon="mdi-magnify"
          label="搜索活动"
          clearable
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="statusFilter"
          :items="['', 'active', 'completed']"
          label="状态筛选"
          clearable
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="5" class="d-flex justify-end">
        <v-btn color="primary" @click="dialog = true" prepend-icon="mdi-plus">
          新建活动
        </v-btn>
      </v-col>
    </v-row>

    <v-table density="compact">
      <thead>
        <tr>
          <th>名称</th>
          <th>开始日期</th>
          <th>结束日期</th>
          <th>状态</th>
          <th>进度</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in filteredActivities" :key="a.id">
          <td>{{ a.name }}</td>
          <td>{{ a.start_date }}</td>
          <td>{{ a.end_date }}</td>
          <td>
            <v-chip :color="a.status === 'active' ? 'success' : 'grey'" size="small">
              {{ a.status === 'active' ? '进行中' : '已完成' }}
            </v-chip>
          </td>
          <td>
            <v-progress-linear
              :model-value="progressMap[a.id]?.progress_percent || 0"
              color="primary"
              height="20"
              rounded
            >
              <template v-slot:default>
                <span class="text-caption">
                  {{ progressMap[a.id]?.completed || 0 }}/{{ progressMap[a.id]?.total_assignments || 0 }}
                </span>
              </template>
            </v-progress-linear>
          </td>
          <td>
            <v-btn size="small" color="primary" @click="aggregate(a.id)" :loading="aggregatingId === a.id">
              汇总
            </v-btn>
            <v-btn size="small" color="secondary" @click="toggleStatus(a)" class="ml-2">
              {{ a.status === 'active' ? '结束' : '重启' }}
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>新建评价活动</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="活动名称" />
          <v-text-field v-model="form.start_date" type="date" label="开始日期" />
          <v-text-field v-model="form.end_date" type="date" label="结束日期" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const activities = ref([])
const progressMap = ref({})
const dialog = ref(false)
const search = ref('')
const statusFilter = ref('')
const aggregatingId = ref(null)
const snackbar = ref({ show: false, text: '', color: 'success' })

const form = ref({ name: '', start_date: '', end_date: '' })

const filteredActivities = computed(() => {
  return activities.value.filter(a => {
    const matchSearch = !search.value || a.name.toLowerCase().includes(search.value.toLowerCase())
    const matchStatus = !statusFilter.value || a.status === statusFilter.value
    return matchSearch && matchStatus
  })
})

async function save() {
  await api.createActivity({ ...form.value, status: 'active' })
  dialog.value = false
  activities.value = await api.getActivities()
  showSnackbar('活动创建成功', 'success')
}

async function toggleStatus(activity) {
  const newStatus = activity.status === 'active' ? 'completed' : 'active'
  await api.updateActivity(activity.id, { status: newStatus })
  activities.value = await api.getActivities()
  showSnackbar('状态已更新', 'success')
}

async function aggregate(id) {
  aggregatingId.value = id
  try {
    const result = await api.aggregateActivity(id)
    showSnackbar(`汇总完成，生成 ${result.data.count} 条结果`, 'success')
  } catch (e) {
    showSnackbar('汇总失败: ' + (e.response?.data?.error || e.message), 'error')
  } finally {
    aggregatingId.value = null
  }
}

async function loadProgress() {
  for (const a of activities.value) {
    try {
      const progress = await api.getActivityProgress(a.id)
      progressMap.value[a.id] = progress
    } catch (e) {
      console.error('Failed to load progress for activity', a.id, e)
    }
  }
}

function showSnackbar(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

onMounted(async () => {
  activities.value = await api.getActivities()
  await loadProgress()
})
</script>
