<!-- 组织部门树形管理组件 -->
<template>
  <div>
    <div class="d-flex align-center mb-4">
      <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="openCreateDialog">新建部门</v-btn>
      <v-spacer />
      <v-progress-linear v-if="loading" indeterminate color="primary" style="max-width: 200px" />
    </div>

    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = ''">{{ error }}</v-alert>

    <v-card v-if="!loading && tree.length === 0" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1">mdi-folder-tree</v-icon>
      <div class="text-h6 mt-4 text-grey-darken-1">还没有部门</div>
      <div class="text-body-2 text-grey mt-2">点击「新建部门」添加第一个部门</div>
    </v-card>

    <v-card v-if="tree.length > 0">
      <v-card-text>
        <DepartmentTreeNode
          v-for="node in tree"
          :key="node.id"
          :node="node"
          :members="members"
          :all-flat="allFlat"
          :depth="0"
          @edit="openEditDialog"
          @delete="onDelete"
          @set-manager="openManagerDialog"
        />
      </v-card-text>
    </v-card>

    <!-- 新建/编辑部门对话框 -->
    <v-dialog v-model="showFormDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">{{ editing ? '编辑部门' : '新建部门' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.name"
            label="部门名称"
            variant="outlined"
            :rules="[v => !!v?.trim() || '请输入部门名称']"
            class="mb-4"
          />
          <v-select
            v-model="form.parentId"
            :items="parentOptions"
            item-title="title"
            item-value="value"
            label="上级部门"
            variant="outlined"
            clearable
            class="mb-4"
          />
          <v-textarea v-model="form.description" label="描述" variant="outlined" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showFormDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="saving" @click="onSave">{{ editing ? '保存' : '创建' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 设置负责人对话框 -->
    <v-dialog v-model="showManagerDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5">设置部门负责人</v-card-title>
        <v-card-text>
          <div class="text-body-2 mb-2">部门：{{ managerTarget?.name }}</div>
          <v-select
            v-model="managerUserId"
            :items="members"
            item-title="name"
            item-value="userId"
            label="选择成员"
            variant="outlined"
            clearable
            hint="清空则取消负责人"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showManagerDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="settingManager" @click="onSetManager">确定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="2000" color="success">{{ snackbarMsg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getDepartmentTree,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  setDepartmentManager,
  type DepartmentNode,
  type Department,
} from '../../api/department'
import { listMembers, type Member } from '../../api/user'
import DepartmentTreeNode from './DepartmentTreeNode.vue'

const props = defineProps<{ orgId: number }>()

const tree = ref<DepartmentNode[]>([])
const members = ref<Member[]>([])
const allFlat = ref<Department[]>([])
const loading = ref(false)
const error = ref('')
const snackbar = ref(false)
const snackbarMsg = ref('')

const showFormDialog = ref(false)
const saving = ref(false)
const editing = ref<Department | null>(null)
const form = ref({ name: '', parentId: null as number | null, description: '' })

const showManagerDialog = ref(false)
const settingManager = ref(false)
const managerTarget = ref<Department | null>(null)
const managerUserId = ref<number | null>(null)

const parentOptions = computed(() => {
  const flat = allFlat.value
    .filter(d => !editing.value || d.id !== editing.value.id)
    .map(d => ({ title: d.name, value: d.id }))
  return [{ title: '无（根部门）', value: null }, ...flat]
})

function showSnack(msg: string) {
  snackbarMsg.value = msg
  snackbar.value = true
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [deptRes, memberRes] = await Promise.all([
      getDepartmentTree(props.orgId),
      listMembers(props.orgId),
    ])
    tree.value = deptRes.data
    members.value = memberRes.data
    flattenTree(tree.value)
  } catch (e: any) {
    error.value = e.response?.data?.error || '加载部门数据失败'
  } finally {
    loading.value = false
  }
}

function flattenTree(nodes: DepartmentNode[]) {
  const flat: Department[] = []
  function walk(ns: DepartmentNode[]) {
    for (const n of ns) {
      flat.push(n)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(nodes)
  allFlat.value = flat
}

function openCreateDialog() {
  editing.value = null
  form.value = { name: '', parentId: null, description: '' }
  showFormDialog.value = true
}

function openEditDialog(dept: Department) {
  editing.value = dept
  form.value = { name: dept.name, parentId: dept.parentId, description: dept.description }
  showFormDialog.value = true
}

async function onSave() {
  if (!form.value.name.trim()) return
  saving.value = true
  error.value = ''
  try {
    const payload: Record<string, unknown> = { name: form.value.name.trim() }
    if (form.value.parentId !== null) payload.parentId = form.value.parentId
    else payload.parentId = null
    if (form.value.description) payload.description = form.value.description

    if (editing.value) {
      await updateDepartment(props.orgId, editing.value.id, payload as { name: string; parentId?: number | null; description?: string })
      showSnack(`已更新部门「${form.value.name}」`)
    } else {
      await createDepartment(props.orgId, payload as { name: string; parentId?: number | null; description?: string })
      showSnack(`已创建部门「${form.value.name}」`)
    }
    showFormDialog.value = false
    await loadData()
  } catch (e: any) {
    error.value = e.response?.data?.error || '保存部门失败'
  } finally {
    saving.value = false
  }
}

async function onDelete(dept: Department) {
  if (!confirm(`确认删除部门「${dept.name}」？子部门将一并删除。`)) return
  error.value = ''
  try {
    await deleteDepartment(props.orgId, dept.id)
    showSnack(`已删除部门「${dept.name}」`)
    await loadData()
  } catch (e: any) {
    error.value = e.response?.data?.error || '删除部门失败'
  }
}

function openManagerDialog(dept: Department) {
  managerTarget.value = dept
  managerUserId.value = dept.managerUserId
  showManagerDialog.value = true
}

async function onSetManager() {
  if (!managerTarget.value) return
  settingManager.value = true
  error.value = ''
  try {
    if (managerUserId.value != null) {
      await setDepartmentManager(props.orgId, managerTarget.value.id, managerUserId.value)
      showSnack(`已设置部门负责人`)
    } else {
      await setDepartmentManager(props.orgId, managerTarget.value.id, 0)
      showSnack(`已取消部门负责人`)
    }
    showManagerDialog.value = false
    await loadData()
  } catch (e: any) {
    error.value = e.response?.data?.error || '设置负责人失败'
  } finally {
    settingManager.value = false
  }
}

onMounted(loadData)
</script>
