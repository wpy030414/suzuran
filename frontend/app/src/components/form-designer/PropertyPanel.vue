<!-- 右栏：编辑选中字段的属性，v-model 直接回写 field 对象 -->
<template>
  <div class="property-panel">
    <div class="text-subtitle-2 pa-3 pb-1 text-grey">属性</div>

    <!-- 未选中 -->
    <div v-if="!field" class="text-center text-grey-lighten-1 pa-6">
      <v-icon size="40">mdi-cursor-default-click-outline</v-icon>
      <div class="text-body-2 mt-2">选择一个字段以编辑属性</div>
    </div>

    <!-- 编辑区 -->
    <div v-else class="pa-3 pt-0">
      <v-text-field
        v-model="field.label"
        label="标题"
        variant="outlined"
        density="compact"
        class="mb-3"
        hide-details
      />

      <template v-if="!isLayout">
        <v-text-field
          v-model="field.name"
          label="字段标识 (name)"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
          hint="提交数据时的 key"
          persistent-hint
        />
        <v-text-field
          v-if="hasPlaceholder"
          v-model="field.placeholder"
          label="占位提示"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
        />
        <v-switch
          v-model="field.validation.required"
          label="必填"
          color="primary"
          hide-details
          density="compact"
          class="mb-2"
        />
        <v-select
          v-model="field.width"
          :items="widthItems"
          item-title="label"
          item-value="value"
          label="宽度"
          variant="outlined"
          density="compact"
          class="mb-3"
          hide-details
        />
      </template>

      <!-- 选项编辑器（select/radio/checkbox） -->
      <template v-if="hasOptions">
        <div class="text-caption text-grey mb-1">选项</div>
        <div v-for="(opt, i) in field.options" :key="i" class="d-flex align-center mb-2">
          <v-text-field v-model="opt.label" variant="outlined" density="compact" hide-details class="mr-2" />
          <v-btn icon="mdi-close" size="small" variant="text" color="error" @click="field.options!.splice(i, 1)" />
        </div>
        <v-btn size="small" variant="tonal" color="primary" prepend-icon="mdi-plus" @click="addOption">
          添加选项
        </v-btn>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FormFieldSchema } from '../../types/form-schema'

const props = defineProps<{ field: FormFieldSchema | null }>()

const isLayout = computed(() => props.field?.type === 'heading' || props.field?.type === 'divider')
const hasPlaceholder = computed(
  () => !!props.field && ['text', 'textarea', 'number', 'date', 'select'].includes(props.field.type)
)
const hasOptions = computed(
  () => !!props.field && ['select', 'radio', 'checkbox'].includes(props.field.type)
)

const widthItems = [
  { label: '全宽', value: 'full' },
  { label: '半宽', value: 'half' },
]

function addOption() {
  if (!props.field?.options) return
  const n = props.field.options.length + 1
  props.field.options.push({ label: `选项${n}`, value: `option_${n}` })
}
</script>
