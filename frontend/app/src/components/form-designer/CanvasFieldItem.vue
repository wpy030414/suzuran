<!-- 画布内单个字段卡片：拖拽手柄+类型图标+标题+必填/宽度chip+删除 -->
<template>
  <v-card
    variant="outlined"
    flat
    :class="['canvas-field-item', { selected }]"
    draggable="true"
    @dragstart="emit('dragstart', $event)"
    @dragend="emit('dragend', $event)"
    @dragover="emit('dragover', $event)"
    @dragleave="emit('dragleave', $event)"
    @click.stop="emit('select')"
  >
    <v-card-text class="d-flex align-center pa-2">
      <v-icon size="16" class="drag-handle mr-2">mdi-drag-horizontal-variant</v-icon>
      <v-icon size="18" class="mr-2" :color="iconColor">{{ icon }}</v-icon>
      <span class="text-body-2 flex-grow-1">{{ field.label || '(未命名字段)' }}</span>
      <v-chip v-if="field.validation.required" size="x-small" color="error" class="mr-2">必填</v-chip>
      <v-chip size="x-small" variant="tonal" class="mr-2">{{ widthLabel }}</v-chip>
      <v-btn icon="mdi-delete-outline" size="x-small" variant="text" color="error" @click.stop="emit('delete')" />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FIELD_TYPE_META, type FormFieldSchema } from '../../types/form-schema'

const props = defineProps<{
  field: FormFieldSchema
  selected: boolean
}>()

const emit = defineEmits<{
  (e: 'select'): void
  (e: 'delete'): void
  (e: 'dragstart', ev: DragEvent): void
  (e: 'dragend', ev: DragEvent): void
  (e: 'dragover', ev: DragEvent): void
  (e: 'dragleave', ev: DragEvent): void
}>()

const meta = computed(() => FIELD_TYPE_META.find(m => m.type === props.field.type))
const icon = computed(() => meta.value?.icon ?? 'mdi-help-circle-outline')
const iconColor = computed(() => (meta.value?.group === 'layout' ? 'grey' : 'primary'))
const widthLabel = computed(() => (props.field.width === 'half' ? '半宽' : '全宽'))
</script>

<style scoped>
.canvas-field-item {
  cursor: grab;
  transition: border-color 0.15s, box-shadow 0.15s;
  margin-bottom: 6px;
}
.canvas-field-item.selected {
  border-color: rgb(25, 118, 210);
  box-shadow: 0 0 0 1px rgb(25, 118, 210);
}
.canvas-field-item:active {
  cursor: grabbing;
}
.drag-handle {
  opacity: 0.4;
}
.canvas-field-item:hover .drag-handle {
  opacity: 0.8;
}
</style>
