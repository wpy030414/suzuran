<template>
  <div v-if="app">
    <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="router.push('/provider/apps')" class="mb-4">
      返回应用列表
    </v-btn>

    <!-- 应用头部 -->
    <v-card class="mb-6">
      <v-card-text>
        <div class="d-flex align-center">
          <v-avatar color="primary" size="56" class="mr-4">
            <v-icon size="32">mdi-package-variant</v-icon>
          </v-avatar>
          <div>
            <div class="text-h5 font-weight-bold">{{ app.name }}</div>
            <div class="text-caption text-grey mt-1">{{ app.packageName }} · v{{ app.version }}</div>
          </div>
          <v-spacer></v-spacer>
          <v-chip size="small" variant="tonal" color="info">{{ app.uuid.substring(0, 8) }}...</v-chip>
        </div>
        <v-divider class="my-4"></v-divider>
        <div class="text-body-2 text-grey-darken-1">{{ app.description || '暂无描述' }}</div>
      </v-card-text>
    </v-card>

    <!-- 表单 / 视图 Tab -->
    <v-tabs v-model="activeTab" color="primary" class="mb-4">
      <v-tab value="forms">
        <v-icon start>mdi-form-select</v-icon>表单 ({{ forms.length }})
      </v-tab>
      <v-tab value="views">
        <v-icon start>mdi-chart-line</v-icon>视图 ({{ views.length }})
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- 表单 Tab -->
      <v-window-item value="forms">
        <div class="d-flex align-center mb-3">
          <span class="text-h6">表单</span>
          <v-spacer />
          <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="showFormDialog = true">新建表单</v-btn>
        </div>
        <v-progress-linear v-if="formsLoading" indeterminate color="primary" class="mb-3" />
        <v-alert v-if="!formsLoading && forms.length === 0" type="info" variant="tonal">
          还没有表单，点击右上角「新建表单」开始设计
        </v-alert>
        <v-row>
          <v-col v-for="form in forms" :key="form.id" cols="12" sm="6" md="4">
            <v-card class="h-100">
              <v-card-text>
                <div class="d-flex align-start">
                  <v-icon color="primary" class="mr-2">mdi-form-select</v-icon>
                  <div class="flex-grow-1">
                    <div class="text-subtitle-1 font-weight-bold">{{ form.name }}</div>
                    <div class="text-caption text-grey">{{ form.code }}</div>
                  </div>
                </div>
                <div class="text-body-2 text-grey-darken-1 mt-2" style="min-height: 24px">
                  {{ form.description || '暂无描述' }}
                </div>
                <div class="text-caption text-grey mt-1">
                  字段数：{{ form.schema?.fields?.length ?? 0 }}
                </div>
              </v-card-text>
              <v-card-actions>
                <v-btn size="small" variant="text" color="primary" prepend-icon="mdi-pencil" @click="designForm(form.id)">
                  设计
                </v-btn>
                <v-btn size="small" variant="text" color="error" prepend-icon="mdi-delete" @click="removeForm(form.id)">
                  删除
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- 视图 Tab -->
      <v-window-item value="views">
        <div class="d-flex align-center mb-3">
          <span class="text-h6">视图</span>
          <v-spacer />
          <v-btn color="primary" size="small" prepend-icon="mdi-plus" @click="showViewDialog = true">新建视图</v-btn>
        </div>
        <v-alert v-if="views.length === 0" type="info" variant="tonal">
          还没有视图，点击右上角「新建视图」
        </v-alert>
        <v-row>
          <v-col v-for="view in views" :key="view.id" cols="12" sm="6" md="4">
            <v-card>
              <v-card-text>
                <div class="d-flex align-center">
                  <v-icon :color="viewTypeColor(view.type)" class="mr-2">{{ viewTypeIcon(view.type) }}</v-icon>
                  <div class="flex-grow-1">
                    <div class="text-subtitle-1 font-weight-bold">{{ view.name }}</div>
                    <div class="text-caption text-grey">{{ view.code }}</div>
                  </div>
                  <v-chip size="x-small" variant="tonal">{{ viewTypeLabel(view.type) }}</v-chip>
                </div>
                <div class="text-body-2 text-grey-darken-1 mt-2">{{ view.description || '暂无描述' }}</div>
              </v-card-text>
              <v-card-actions>
                <v-btn size="small" variant="text" color="error" prepend-icon="mdi-delete" @click="removeView(view.id)">
                  删除
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <!-- 新建表单对话框 -->
    <v-dialog v-model="showFormDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">新建表单</v-card-title>
        <v-card-text>
          <v-text-field v-model="newForm.name" label="表单名称" variant="outlined" class="mb-4" />
          <v-text-field
            v-model="newForm.code"
            label="表单标识 (code)"
            variant="outlined"
            class="mb-4"
            hint="应用内唯一"
            persistent-hint
          />
          <v-textarea v-model="newForm.description" label="描述" variant="outlined" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showFormDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="creating" @click="createFormData">创建并设计</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 新建视图对话框 -->
    <ViewCreateDialog v-model="showViewDialog" @save="createViewData" />
  </div>

  <div v-else class="text-center pa-8">
    <v-progress-circular indeterminate color="primary"></v-progress-circular>
    <div class="mt-4 text-grey">加载应用中...</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getApplication, type Application } from '../../api/application'
import { listForms, createForm as apiCreateForm, deleteForm, type Form } from '../../api/form'
import {
  listViews,
  createView as apiCreateView,
  deleteView,
  type View,
  type CreateViewRequest,
} from '../../api/view'
import ViewCreateDialog from '../../components/view/ViewCreateDialog.vue'

const router = useRouter()
const route = useRoute()
const appId = Number(route.params.id)

const app = ref<Application | null>(null)
const activeTab = ref('forms')
const forms = ref<Form[]>([])
const views = ref<View[]>([])
const formsLoading = ref(false)
const creating = ref(false)
const showFormDialog = ref(false)
const showViewDialog = ref(false)
const newForm = ref({ name: '', code: '', description: '' })

onMounted(async () => {
  try {
    const r = await getApplication(appId)
    app.value = r.data
  } catch (err) {
    console.error('Failed to load application:', err)
  }
  await loadForms()
})

async function loadForms() {
  formsLoading.value = true
  try {
    const r = await listForms(appId)
    forms.value = r.data
  } catch (err) {
    console.error('Failed to load forms:', err)
  } finally {
    formsLoading.value = false
  }
}

async function loadViews() {
  try {
    const r = await listViews(appId)
    views.value = r.data
  } catch (err) {
    console.error('Failed to load views:', err)
  }
}

// 切到视图 Tab 时懒加载
watch(activeTab, t => {
  if (t === 'views' && views.value.length === 0) loadViews()
})

async function createFormData() {
  creating.value = true
  try {
    const r = await apiCreateForm(appId, {
      name: newForm.value.name,
      code: newForm.value.code,
      description: newForm.value.description,
    })
    showFormDialog.value = false
    newForm.value = { name: '', code: '', description: '' }
    router.push(`/provider/apps/${appId}/forms/${r.data.id}`)
  } catch (err) {
    console.error('Failed to create form:', err)
  } finally {
    creating.value = false
  }
}

function designForm(formId: number) {
  router.push(`/provider/apps/${appId}/forms/${formId}`)
}

async function removeForm(formId: number) {
  if (!confirm('确认删除该表单？')) return
  try {
    await deleteForm(appId, formId)
    forms.value = forms.value.filter(f => f.id !== formId)
  } catch (err) {
    console.error('Failed to delete form:', err)
  }
}

async function createViewData(data: CreateViewRequest) {
  try {
    await apiCreateView(appId, data)
    showViewDialog.value = false
    await loadViews()
  } catch (err) {
    console.error('Failed to create view:', err)
  }
}

async function removeView(viewId: number) {
  if (!confirm('确认删除该视图？')) return
  try {
    await deleteView(appId, viewId)
    views.value = views.value.filter(v => v.id !== viewId)
  } catch (err) {
    console.error('Failed to delete view:', err)
  }
}

function viewTypeIcon(t: string) {
  return ({ table: 'mdi-table', chart: 'mdi-chart-line', kanban: 'mdi-view-column-outline' } as Record<string, string>)[t] ?? 'mdi-chart-line'
}
function viewTypeColor(t: string) {
  return ({ table: 'primary', chart: 'success', kanban: 'warning' } as Record<string, string>)[t] ?? 'primary'
}
function viewTypeLabel(t: string) {
  return ({ table: '表格', chart: '图表', kanban: '看板' } as Record<string, string>)[t] ?? t
}
</script>
