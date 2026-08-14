<template>
  <v-container>
    <h2 class="text-h5 mb-4">评价组管理</h2>

    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-select
          v-model="filterType"
          :items="typeOptions"
          label="组类型筛选"
          clearable
          density="compact"
        />
      </v-col>
      <v-col cols="12" md="8" class="d-flex justify-end">
        <v-btn color="primary" @click="openCreateDialog" prepend-icon="mdi-plus">
          新建评价组
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6" lg="4" v-for="group in filteredGroups" :key="group.id">
        <v-card>
          <v-card-title class="d-flex align-center">
            <span>{{ group.name }}</span>
            <v-spacer />
            <v-chip :color="group.evaluation_type === 'peer' ? 'blue' : 'green'" size="small">
              {{ group.evaluation_type === 'peer' ? '组内互评' : '全局评价' }}
            </v-chip>
          </v-card-title>
          <v-card-text>
            <div v-if="group.evaluation_type === 'peer'">
              <strong>评价对象（{{ (group.evaluatee_ids || []).length }}人）：</strong>
              <div class="mt-2">
                <v-chip
                  v-for="id in (group.evaluatee_ids || [])"
                  :key="id"
                  size="small"
                  class="mr-1 mb-1"
                >
                  教师 #{{ id }}
                </v-chip>
              </div>
            </div>
            <div v-else>
              <strong>评价主体（{{ (group.evaluator_ids || []).length }}人）：</strong>
              <div class="mt-2">
                <v-chip
                  v-for="id in (group.evaluator_ids || [])"
                  :key="id"
                  size="small"
                  class="mr-1 mb-1"
                >
                  评价人 #{{ id }}
                </v-chip>
              </div>
              <div class="mt-3" v-if="(group.evaluatee_ids || []).length > 0">
                <strong>评价对象（{{ group.evaluatee_ids.length }}人）：</strong>
                <div class="mt-2">
                  <v-chip
                    v-for="id in (group.evaluatee_ids || [])"
                    :key="id"
                    size="small"
                    class="mr-1 mb-1"
                  >
                    教师 #{{ id }}
                  </v-chip>
                </div>
              </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn size="small" color="primary" @click="openEditDialog(group)">编辑</v-btn>
            <v-btn size="small" color="error" @click="deleteGroup(group.id)">删除</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-alert v-if="filteredGroups.length === 0" type="info">
      暂无评价组，请点击"新建评价组"创建
    </v-alert>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="dialog" max-width="600" persistent>
      <v-card>
        <v-card-title>{{ editingGroup ? '编辑评价组' : '新建评价组' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" label="组名称" />
          <v-select
            v-model="form.evaluation_type"
            :items="typeOptions"
            label="组类型"
          />

          <v-textarea
            v-model="evaluatorIdsText"
            label="评价主体ID（逗号分隔，如：1,2,3）"
            hint="全局评价组必填，指定谁有权以该组名义评价"
            persistent-hint
            rows="2"
          />

          <v-textarea
            v-model="evaluateeIdsText"
            label="评价对象ID（逗号分隔，如：1,2,3）"
            :hint="form.evaluation_type === 'peer' ? '组内互评组必填，指定组内成员' : '可选，指定被评价的教师范围'"
            persistent-hint
            rows="2"
            class="mt-3"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveGroup">保存</v-btn>
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

const groups = ref([])
const dialog = ref(false)
const editingGroup = ref(null)
const filterType = ref('')
const snackbar = ref({ show: false, text: '', color: 'success' })

const form = ref({
  name: '',
  evaluation_type: 'peer',
})

const evaluatorIdsText = ref('')
const evaluateeIdsText = ref('')

const typeOptions = [
  { title: '组内互评', value: 'peer' },
  { title: '全局评价', value: 'global' },
]

const filteredGroups = computed(() => {
  if (!filterType.value) return groups.value
  return groups.value.filter(g => g.evaluation_type === filterType.value)
})

function parseIds(text) {
  if (!text || !text.trim()) return []
  return text.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
}

function formatIds(ids) {
  if (!ids || ids.length === 0) return ''
  return ids.join(',')
}

function openCreateDialog() {
  editingGroup.value = null
  form.value = { name: '', evaluation_type: 'peer' }
  evaluatorIdsText.value = ''
  evaluateeIdsText.value = ''
  dialog.value = true
}

function openEditDialog(group) {
  editingGroup.value = group
  form.value = { name: group.name, evaluation_type: group.evaluation_type }
  evaluatorIdsText.value = formatIds(
    typeof group.evaluator_ids === 'string' ? JSON.parse(group.evaluator_ids) : (group.evaluator_ids || [])
  )
  evaluateeIdsText.value = formatIds(
    typeof group.evaluatee_ids === 'string' ? JSON.parse(group.evaluatee_ids) : (group.evaluatee_ids || [])
  )
  dialog.value = true
}

async function saveGroup() {
  try {
    const data = {
      name: form.value.name,
      evaluation_type: form.value.evaluation_type,
      evaluator_ids: JSON.stringify(parseIds(evaluatorIdsText.value)),
      evaluatee_ids: JSON.stringify(parseIds(evaluateeIdsText.value)),
    }

    if (editingGroup.value) {
      await api.updateGroup(editingGroup.value.id, data)
      showSnackbar('评价组更新成功', 'success')
    } else {
      await api.createGroup(data)
      showSnackbar('评价组创建成功', 'success')
    }

    dialog.value = false
    groups.value = await api.getGroups()
  } catch (e) {
    showSnackbar('保存失败: ' + (e.response?.data?.error || e.message), 'error')
  }
}

async function deleteGroup(id) {
  if (!confirm('确定要删除此评价组吗？')) return
  try {
    await api.deleteGroup(id)
    groups.value = await api.getGroups()
    showSnackbar('评价组已删除', 'success')
  } catch (e) {
    showSnackbar('删除失败: ' + (e.response?.data?.error || e.message), 'error')
  }
}

function showSnackbar(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

onMounted(async () => {
  groups.value = await api.getGroups()
})
</script>
