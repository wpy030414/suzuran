<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <v-icon size="32" color="primary" class="mr-2">mdi-file-document-edit</v-icon>
      <h2 class="text-h5">学期注册</h2>
    </div>

    <v-alert v-if="message" :type="messageType" class="mb-4" closable @click:close="message=''">
      {{ message }}
    </v-alert>

    <v-card class="mb-4">
      <v-card-title>注册本学期用餐</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="5">
            <v-select
              v-model="selectedPeriodId"
              :items="periods"
              item-title="name"
              item-value="id"
              label="选择学期"
              :loading="loadingPeriods"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:subtitle>
                    {{ item.raw.code }} | {{ item.raw.start_date }} ~ {{ item.raw.end_date }}
                  </template>
                </v-list-item>
              </template>
            </v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field :model-value="currentUser.userName" label="当前用户" disabled />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field :model-value="selectedPeriod?.code || ''" label="注册码" disabled />
          </v-col>
          <v-col cols="12" md="2">
            <v-btn color="primary" block @click="register" :loading="registering" :disabled="!selectedPeriodId">
              立即注册
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="mb-4">
      <v-card-title>
        我的注册记录
        <v-chip size="small" class="ml-2" color="primary">{{ registrations.length }}</v-chip>
      </v-card-title>
      <v-card-text>
        <v-table density="compact" v-if="registrations.length > 0">
          <thead>
            <tr>
              <th>学期</th>
              <th>注册码</th>
              <th>注册时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in registrations" :key="r.id">
              <td>{{ getPeriodName(r.period_id) }}</td>
              <td><v-chip size="small">{{ r.registration_code }}</v-chip></td>
              <td>{{ formatTime(r.registered_at) }}</td>
            </tr>
          </tbody>
        </v-table>
        <div v-else class="text-center text-grey py-6">
          <v-icon size="48" class="mb-2">mdi-inbox</v-icon>
          <div>暂无注册记录</div>
        </div>
      </v-card-text>
    </v-card>

    <v-card v-if="isAdmin">
      <v-card-title>
        学期管理
        <v-spacer />
        <v-btn color="primary" size="small" @click="periodDialog = true" prepend-icon="mdi-plus">
          新增学期
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-table density="compact" v-if="periods.length > 0">
          <thead>
            <tr>
              <th>名称</th>
              <th>学年</th>
              <th>学期</th>
              <th>代码</th>
              <th>开始日期</th>
              <th>结束日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in periods" :key="p.id">
              <td>{{ p.name }}</td>
              <td>{{ p.academic_year }}</td>
              <td>{{ p.semester }}</td>
              <td><v-chip size="small" color="primary">{{ p.code }}</v-chip></td>
              <td>{{ p.start_date }}</td>
              <td>{{ p.end_date }}</td>
              <td>
                <v-btn size="x-small" color="error" variant="text" @click="deletePeriodHandler(p.id)">
                  删除
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="periodDialog" max-width="500">
      <v-card>
        <v-card-title>新增学期</v-card-title>
        <v-card-text>
          <v-text-field v-model="newPeriod.name" label="学期名称" placeholder="例：2025-2026学年第一学期" />
          <v-text-field v-model="newPeriod.academic_year" label="学年" placeholder="例：2025-2026" />
          <v-select v-model="newPeriod.semester" :items="['第一学期', '第二学期']" label="学期" />
          <v-text-field v-model="newPeriod.start_date" type="date" label="开始日期" />
          <v-text-field v-model="newPeriod.end_date" type="date" label="结束日期" />
          <v-alert type="info" variant="tonal" class="mt-2">
            注册码将自动生成：学年前4位 + 学期首字母（A/B）
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="periodDialog = false">取消</v-btn>
          <v-btn color="primary" @click="createPeriodHandler" :loading="creatingPeriod">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import api from '../api.js'

const showSnackbar = inject('showSnackbar', () => {})

const currentUser = ref({
  userId: parseInt(localStorage.getItem('demo_user_id') || '0'),
  userName: localStorage.getItem('demo_user_name') || '',
  role: localStorage.getItem('demo_user_role') || 'student'
})

const isAdmin = computed(() => ['admin', 'staff'].includes(currentUser.value.role))

const periods = ref([])
const registrations = ref([])
const selectedPeriodId = ref(null)
const loadingPeriods = ref(false)
const registering = ref(false)
const message = ref('')
const messageType = ref('success')

const periodDialog = ref(false)
const creatingPeriod = ref(false)
const newPeriod = ref({ name: '', academic_year: '', semester: '第一学期', start_date: '', end_date: '' })

const selectedPeriod = computed(() => periods.value.find(p => p.id === selectedPeriodId.value))

function getPeriodName(periodId) {
  const p = periods.value.find(x => x.id === periodId)
  return p ? p.name : '-'
}

function formatTime(t) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

async function loadPeriods() {
  loadingPeriods.value = true
  try {
    periods.value = await api.getPeriods()
  } catch (e) {
    console.error(e)
  } finally {
    loadingPeriods.value = false
  }
}

async function loadRegistrations() {
  try {
    registrations.value = await api.getRegistrations()
  } catch (e) {
    console.error(e)
  }
}

async function register() {
  registering.value = true
  message.value = ''
  try {
    await api.createRegistration({ period_id: selectedPeriodId.value })
    message.value = '注册成功！'
    messageType.value = 'success'
    showSnackbar('注册成功', 'success')
    await loadRegistrations()
  } catch (e) {
    message.value = e.response?.data?.error || '注册失败'
    messageType.value = 'error'
  } finally {
    registering.value = false
  }
}

async function createPeriodHandler() {
  creatingPeriod.value = true
  try {
    await api.createPeriod(newPeriod.value)
    periodDialog.value = false
    newPeriod.value = { name: '', academic_year: '', semester: '第一学期', start_date: '', end_date: '' }
    showSnackbar('学期创建成功', 'success')
    await loadPeriods()
  } catch (e) {
    showSnackbar('创建失败: ' + (e.response?.data?.error || e.message), 'error')
  } finally {
    creatingPeriod.value = false
  }
}

async function deletePeriodHandler(id) {
  if (!confirm('确定删除该学期？')) return
  try {
    await api.deletePeriod(id)
    showSnackbar('已删除', 'success')
    await loadPeriods()
  } catch (e) {
    showSnackbar('删除失败', 'error')
  }
}

onMounted(async () => {
  await loadPeriods()
  await loadRegistrations()
})
</script>
