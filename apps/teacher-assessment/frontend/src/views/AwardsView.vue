<template>
  <v-container>
    <h2 class="text-h5 mb-4">获奖登记</h2>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" sm="4" md="3">
        <v-text-field v-model="search" label="搜索（教师/标题）" prepend-inner-icon="mdi-magnify" density="compact" clearable hide-details />
      </v-col>
      <v-col cols="12" sm="4" md="3">
        <v-select v-model="filterStatus" :items="statusOptions" label="状态筛选" density="compact" clearable hide-details />
      </v-col>
      <v-col cols="12" sm="4" md="3">
        <v-select v-model="filterLevel" :items="levelOptions" label="级别筛选" density="compact" clearable hide-details />
      </v-col>
      <v-col cols="12" sm="4" md="3" class="d-flex align-center">
        <v-btn color="primary" @click="dialog = true" class="mr-2">
          <v-icon start>mdi-plus</v-icon>登记获奖
        </v-btn>
      </v-col>
    </v-row>

    <!-- Awards Table -->
    <v-card>
      <v-table density="compact" class="overflow-x-auto">
        <thead>
          <tr>
            <th>教师ID</th>
            <th>级别等第</th>
            <th>标题</th>
            <th>范围</th>
            <th>获奖日期</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in filteredAwards" :key="a.id">
            <td>{{ a.teacher_id }}</td>
            <td>
              <v-chip color="primary" variant="tonal" size="small">{{ a.level_rank || (a.level + a.rank) }}</v-chip>
            </td>
            <td>{{ a.title }}</td>
            <td>
              <v-chip v-if="a.scope" :color="a.scope === 'semester' ? 'info' : 'purple'" size="x-small">
                {{ a.scope === 'semester' ? '学期' : '学年' }}
              </v-chip>
              <span v-else class="text-grey">--</span>
            </td>
            <td>{{ a.award_date || '--' }}</td>
            <td>
              <v-chip :color="statusColor(a.status)" size="small">
                {{ statusLabel(a.status) }}
              </v-chip>
            </td>
            <td>
              <div class="d-flex ga-1">
                <v-btn v-if="a.status === 'pending' && canApprove" size="x-small" color="success" variant="tonal" @click="approve(a.id)">
                  <v-icon start size="small">mdi-check</v-icon>通过
                </v-btn>
                <v-btn v-if="a.status === 'pending' && canApprove" size="x-small" color="error" variant="tonal" @click="openReject(a)">
                  <v-icon start size="small">mdi-close</v-icon>驳回
                </v-btn>
                <v-btn size="x-small" color="error" variant="tonal" @click="remove(a.id)">删除</v-btn>
              </div>
              <div v-if="a.status === 'rejected' && a.reject_reason" class="text-caption text-error mt-1">
                原因: {{ a.reject_reason }}
              </div>
            </td>
          </tr>
          <tr v-if="filteredAwards.length === 0">
            <td colspan="7" class="text-center text-grey pa-4">暂无数据</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Create Dialog -->
    <v-dialog v-model="dialog" max-width="650" :fullscreen="isMobile">
      <v-card>
        <v-card-title>登记获奖</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.teacher_id" type="number" label="教师ID *" :error-messages="errors.teacher_id" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="form.scope" :items="scopeOptions" label="考核范围" clearable />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" sm="6">
              <v-select v-model="form.level" :items="levelOptions" label="级别 *" :error-messages="errors.level" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select v-model="form.rank" :items="rankOptions" label="等级 *" :error-messages="errors.rank" />
            </v-col>
          </v-row>
          <v-text-field v-model="form.title" label="标题 *" :error-messages="errors.title" />
          <v-select
            v-if="form.scope"
            v-model="form.category_id"
            :items="filteredCategories"
            item-title="name"
            item-value="id"
            label="获奖类别"
            clearable
          />
          <v-text-field v-model="form.award_date" type="date" label="获奖日期" />
          <v-textarea v-model="form.description" label="描述" rows="2" />
          <v-text-field v-model="form.certificate_url" label="证书URL（上传占位）" prepend-inner-icon="mdi-file-certificate" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reject Dialog -->
    <v-dialog v-model="rejectDialog" max-width="450" :fullscreen="isMobile">
      <v-card>
        <v-card-title>驳回获奖登记</v-card-title>
        <v-card-text>
          <p class="mb-2">确认驳回 <strong>{{ rejectTarget?.title }}</strong> ？</p>
          <v-textarea v-model="rejectReason" label="驳回原因" rows="3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="rejectDialog = false">取消</v-btn>
          <v-btn color="error" @click="doReject">确认驳回</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api.js'

const awards = ref([])
const categories = ref([])
const dialog = ref(false)
const rejectDialog = ref(false)
const rejectTarget = ref(null)
const rejectReason = ref('')
const search = ref('')
const filterStatus = ref(null)
const filterLevel = ref(null)
const isMobile = ref(window.innerWidth < 600)

const levelOptions = ['国家级', '省级', '市级', '区级', '校级']
const rankOptions = ['一等奖', '二等奖', '三等奖', '优秀奖']
const scopeOptions = [
  { title: '学期', value: 'semester' },
  { title: '学年', value: 'annual' },
]
const statusOptions = [
  { title: '待审核', value: 'pending' },
  { title: '已通过', value: 'approved' },
  { title: '已驳回', value: 'rejected' },
]

const form = ref({
  teacher_id: '', level: '', rank: '', title: '', description: '',
  scope: '', category_id: null, award_date: '', certificate_url: '',
})
const errors = ref({})

const currentRole = localStorage.getItem('user_role') || 'admin'
const canApprove = ['admin', 'director'].includes(currentRole)

const filteredCategories = computed(() => {
  if (!form.value.scope) return categories.value
  return categories.value.filter(c => c.scope === form.value.scope)
})

const filteredAwards = computed(() => {
  let result = awards.value
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(a =>
      String(a.teacher_id).includes(q) ||
      (a.title || '').toLowerCase().includes(q) ||
      (a.level_rank || '').toLowerCase().includes(q)
    )
  }
  if (filterStatus.value) {
    result = result.filter(a => a.status === filterStatus.value)
  }
  if (filterLevel.value) {
    result = result.filter(a => a.level === filterLevel.value)
  }
  return result
})

function statusColor(status) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'error'
  return 'warning'
}

function statusLabel(status) {
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已驳回'
  return '待审核'
}

function validate() {
  const e = {}
  if (!form.value.teacher_id) e.teacher_id = '必填'
  if (!form.value.level) e.level = '必填'
  if (!form.value.rank) e.rank = '必填'
  if (!form.value.title) e.title = '必填'
  errors.value = e
  return Object.keys(e).length === 0
}

async function save() {
  if (!validate()) return
  await api.createAward({
    teacher_id: parseInt(form.value.teacher_id),
    level: form.value.level,
    rank: form.value.rank,
    title: form.value.title,
    description: form.value.description,
    scope: form.value.scope || null,
    category_id: form.value.category_id ? parseInt(form.value.category_id) : null,
    award_date: form.value.award_date || null,
    certificate_url: form.value.certificate_url || null,
  })
  dialog.value = false
  form.value = { teacher_id: '', level: '', rank: '', title: '', description: '', scope: '', category_id: null, award_date: '', certificate_url: '' }
  errors.value = {}
  awards.value = await api.getAwards()
}

async function approve(id) {
  await api.approveAward(id)
  awards.value = await api.getAwards()
}

function openReject(award) {
  rejectTarget.value = award
  rejectReason.value = ''
  rejectDialog.value = true
}

async function doReject() {
  await api.rejectAward(rejectTarget.value.id, rejectReason.value)
  rejectDialog.value = false
  awards.value = await api.getAwards()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteAward(id)
    awards.value = await api.getAwards()
  }
}

onMounted(async () => {
  awards.value = await api.getAwards()
  categories.value = await api.getAwardCategories()
})
</script>
