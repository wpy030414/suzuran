<!-- 组织管理：列表（表格）+ 创建/编辑（共用对话框）+ 删除（禁止删除当前所属组织） -->
<template>
  <div>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">组织管理</h1>
      <v-spacer></v-spacer>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
        创建组织
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <v-progress-linear v-if="loading && !orgs.length" indeterminate color="primary" class="mb-4"></v-progress-linear>

    <!-- 空状态 -->
    <v-card v-if="!loading && !orgs.length" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1">mdi-domain</v-icon>
      <div class="text-h6 mt-4 text-grey-darken-1">还没有组织</div>
      <div class="text-body-2 text-grey mt-2">点击右上角"创建组织"添加第一个组织</div>
    </v-card>

    <!-- 组织表格 -->
    <v-card v-if="orgs.length">
      <v-table>
        <thead>
          <tr>
            <th class="text-left">ID</th>
            <th class="text-left">名称</th>
            <th class="text-left">描述</th>
            <th class="text-left">创建时间</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="org in orgs" :key="org.id">
            <td class="text-grey">{{ org.id }}</td>
            <td class="font-weight-medium">
              {{ org.name }}
              <v-chip v-if="org.id === currentOrgId" size="x-small" color="primary" variant="tonal" class="ml-2">当前</v-chip>
            </td>
            <td class="text-grey-darken-1">{{ org.description || '—' }}</td>
            <td class="text-grey">{{ formatDate(org.createdAt) }}</td>
            <td class="text-right">
              <v-btn size="small" variant="text" color="primary" prepend-icon="mdi-cog" @click="onManage(org)">
                管理
              </v-btn>
              <v-btn size="small" variant="text" color="primary" prepend-icon="mdi-pencil" @click="openEdit(org)">
                编辑
              </v-btn>
              <v-btn
                size="small"
                variant="text"
                color="error"
                prepend-icon="mdi-delete"
                :disabled="org.id === currentOrgId"
                @click="onDelete(org)"
              >
                删除
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- 创建/编辑对话框 -->
    <v-dialog v-model="showDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">{{ editing ? '编辑组织' : '创建组织' }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="onSave">
            <v-text-field
              v-model="form.name"
              label="组织名称"
              variant="outlined"
              :rules="[v => !!v?.trim() || '请输入组织名称']"
              class="mb-4"
            ></v-text-field>
            <v-textarea
              v-model="form.description"
              label="描述"
              variant="outlined"
              rows="2"
            ></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="saving" @click="onSave">{{ editing ? '保存' : '创建' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="2000" color="success">{{ snackbarMsg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listOrgs, createOrg, updateOrg, deleteOrg, type Org } from '../../api/org'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()

const authStore = useAuthStore()
const currentOrgId = authStore.user?.orgId

const orgs = ref<Org[]>([])
const loading = ref(false)
const error = ref('')

const showDialog = ref(false)
const saving = ref(false)
const editing = ref<Org | null>(null)
const form = ref({ name: '', description: '' })

const snackbar = ref(false)
const snackbarMsg = ref('')

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function showSnack(msg: string) {
  snackbarMsg.value = msg
  snackbar.value = true
}

async function fetchOrgs() {
  loading.value = true
  error.value = ''
  try {
    const r = await listOrgs()
    orgs.value = r.data
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载组织列表失败'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', description: '' }
  showDialog.value = true
}

function openEdit(org: Org) {
  editing.value = org
  form.value = { name: org.name, description: org.description }
  showDialog.value = true
}

async function onSave() {
  if (!form.value.name.trim()) return
  saving.value = true
  error.value = ''
  try {
    if (editing.value) {
      await updateOrg(editing.value.id, { name: form.value.name, description: form.value.description })
      showSnack(`已更新组织「${form.value.name}」`)
    } else {
      await createOrg({ name: form.value.name, description: form.value.description })
      showSnack(`已创建组织「${form.value.name}」`)
    }
    showDialog.value = false
    await fetchOrgs()
  } catch (e: any) {
    error.value = e.response?.data?.error || '保存组织失败'
  } finally {
    saving.value = false
  }
}

function onManage(org: Org) {
  router.push(`/provider/orgs/${org.id}`)
}

async function onDelete(org: Org) {
  if (!confirm(`确认删除组织「${org.name}」？此操作不可撤销。`)) return
  error.value = ''
  try {
    await deleteOrg(org.id)
    showSnack(`已删除组织「${org.name}」`)
    await fetchOrgs()
  } catch (e: any) {
    error.value = e.response?.data?.error || '删除组织失败'
  }
}

onMounted(fetchOrgs)
</script>
