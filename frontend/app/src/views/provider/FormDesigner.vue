<!-- 表单设计器主页：三栏（组件库/画布/属性）+ 顶栏（设计/预览/保存），纯 div 布局避免 v-app 嵌套 -->
<template>
  <div>
    <!-- 顶栏 -->
    <v-card flat color="surface" class="d-flex align-center pa-2 mb-2" elevation="1">
      <v-btn icon="mdi-arrow-left" variant="text" size="small" @click="router.back()" />
      <v-icon color="primary" class="ml-2">mdi-form-select</v-icon>
      <v-text-field
        v-model="formName"
        variant="plain"
        density="compact"
        hide-details
        class="ml-2"
        style="max-width: 260px"
      />
      <v-spacer />
      <v-btn-toggle v-model="mode" mandatory density="compact" class="mr-2">
        <v-btn value="design" size="small"><v-icon start>mdi-pencil</v-icon>设计</v-btn>
        <v-btn value="preview" size="small"><v-icon start>mdi-eye</v-icon>预览</v-btn>
      </v-btn-toggle>
      <v-btn color="primary" size="small" :loading="saving" prepend-icon="mdi-content-save" @click="onSave">
        保存
      </v-btn>
    </v-card>

    <v-alert v-if="formStore.error" type="error" class="mb-2" closable>{{ formStore.error }}</v-alert>

    <!-- 三栏 -->
    <div class="d-flex designer-body">
      <!-- 左栏：组件库 -->
      <div class="palette-col">
        <ComponentPalette @add="quickAdd" />
      </div>

      <!-- 中栏：画布 / 预览 -->
      <div class="canvas-col">
        <DesignCanvas
          v-if="mode === 'design'"
          v-model:fields="fields"
          v-model:selected-id="selectedId"
        />
        <FormPreview v-else :schema="{ fields }" />
      </div>

      <!-- 右栏：属性 -->
      <div class="prop-col">
        <PropertyPanel :field="selectedField" />
      </div>
    </div>

    <v-snackbar v-model="saved" :timeout="1500" color="success">已保存</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFormStore } from '../../stores/form'
import { createField, type FormFieldSchema, type FormFieldType } from '../../types/form-schema'
import ComponentPalette from '../../components/form-designer/ComponentPalette.vue'
import DesignCanvas from '../../components/form-designer/DesignCanvas.vue'
import PropertyPanel from '../../components/form-designer/PropertyPanel.vue'
import FormPreview from '../../components/form-designer/FormPreview.vue'

const route = useRoute()
const router = useRouter()
const formStore = useFormStore()

const appId = Number(route.params.id)
const formId = Number(route.params.formId)

const formName = ref('')
const fields = ref<FormFieldSchema[]>([])
const selectedId = ref<string | null>(null)
const mode = ref<'design' | 'preview'>('design')
const saving = ref(false)
const saved = ref(false)

const selectedField = computed(() => fields.value.find(f => f.id === selectedId.value) ?? null)

onMounted(async () => {
  await formStore.fetchForm(appId, formId)
  if (formStore.currentForm) {
    formName.value = formStore.currentForm.name
    fields.value = formStore.currentForm.schema?.fields ?? []
  }
})

// 双击组件库快速添加（E2E 友好路径）
function quickAdd(type: FormFieldType) {
  const f = createField(type)
  fields.value.push(f)
  selectedId.value = f.id
}

async function onSave() {
  saving.value = true
  try {
    await formStore.saveForm(appId, formId, {
      name: formName.value,
      schema: { fields: fields.value },
    })
    saved.value = true
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.designer-body {
  height: calc(100vh - 180px);
  min-height: 480px;
}
.palette-col {
  width: 240px;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
  overflow-y: auto;
  flex-shrink: 0;
}
.canvas-col {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  min-width: 0;
}
.prop-col {
  width: 300px;
  border-left: 1px solid rgba(0, 0, 0, 0.12);
  overflow-y: auto;
  flex-shrink: 0;
}
</style>
