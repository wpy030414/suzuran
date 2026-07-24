<!-- 视图创建对话框：name/code/type/description，按类型初始化默认 config -->
<template>
  <v-dialog :model-value="modelValue" max-width="500" @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="text-h5">新建视图</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="onSave">
          <v-text-field
            v-model="form.name"
            label="视图名称"
            variant="outlined"
            class="mb-4"
            :rules="[v => !!v || '请输入视图名称']"
          />
          <v-text-field
            v-model="form.code"
            label="视图标识 (code)"
            variant="outlined"
            class="mb-4"
            hint="应用内唯一"
            persistent-hint
            :rules="[v => !!v || '请输入标识']"
          />
          <v-select
            v-model="form.type"
            :items="typeItems"
            item-title="label"
            item-value="value"
            label="视图类型"
            variant="outlined"
            class="mb-4"
          />
          <v-textarea v-model="form.description" label="描述" variant="outlined" rows="2" />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">取消</v-btn>
        <v-btn color="primary" @click="onSave">创建</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { defaultViewConfig, type ViewType } from '../../types/view-config'
import type { CreateViewRequest } from '../../api/view'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', data: CreateViewRequest): void
}>()

const typeItems = [
  { label: '表格', value: 'table' },
  { label: '图表', value: 'chart' },
  { label: '看板', value: 'kanban' },
]

const form = ref({ name: '', code: '', type: 'table' as ViewType, description: '' })

// 打开时重置
watch(
  () => props.modelValue,
  v => {
    if (v) form.value = { name: '', code: '', type: 'table', description: '' }
  }
)

function onSave() {
  if (!form.value.name || !form.value.code) return
  emit('save', {
    name: form.value.name,
    code: form.value.code,
    type: form.value.type,
    description: form.value.description,
    config: defaultViewConfig(form.value.type),
  })
  close()
}

function close() {
  emit('update:modelValue', false)
}
</script>
