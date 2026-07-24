<!-- 中栏画布：放置区 + 字段卡片列表，HTML5 拖拽主逻辑（新增/重排/删除） -->
<template>
  <v-card
    variant="outlined"
    class="design-canvas"
    :class="{ 'drag-active': isDragOver }"
    @dragover="onZoneDragOver"
    @dragleave="onZoneDragLeave"
    @drop="onZoneDrop"
  >
    <!-- 空状态 -->
    <div v-if="!modelFields.length" class="text-center text-grey pa-8">
      <v-icon size="48" color="grey-lighten-2">mdi-drag-variant</v-icon>
      <div class="text-h6 mt-3">拖拽左侧组件到此处</div>
      <div class="text-body-2 mt-1">或双击左侧组件快速添加</div>
    </div>

    <!-- 字段列表 -->
    <div v-else class="pa-3">
      <template v-for="(field, index) in modelFields" :key="field.id">
        <div v-if="dragOverIndex === index" class="drop-indicator" />
        <CanvasFieldItem
          :field="field"
          :selected="field.id === modelSelectedId"
          @select="modelSelectedId = field.id"
          @delete="removeField(index)"
          @dragstart="onItemDragStart($event, index)"
          @dragend="onDragEnd"
          @dragover="onItemDragOver($event, index)"
          @dragleave="onItemDragLeave"
        />
      </template>
      <div v-if="dragOverIndex === modelFields.length" class="drop-indicator" />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { createField, type FormFieldSchema, type FormFieldType } from '../../types/form-schema'
import CanvasFieldItem from './CanvasFieldItem.vue'

const modelFields = defineModel<FormFieldSchema[]>('fields', { required: true })
const modelSelectedId = defineModel<string | null>('selectedId')

const dragOverIndex = ref<number | null>(null)
const isDragOver = ref(false)
// 拖拽来源（dragstart 记录，drop 时读 dataTransfer 兜底）
let dragSource: { source: 'palette' | 'canvas'; type?: string; index?: number } | null = null

// 画布内字段拖起 → 重排
function onItemDragStart(event: DragEvent, index: number) {
  dragSource = { source: 'canvas', index }
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', JSON.stringify(dragSource))
    event.dataTransfer.effectAllowed = 'move'
  }
}

// 拖到某字段上方：按光标上下半判断插入位置
function onItemDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  event.stopPropagation()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const midY = rect.top + rect.height / 2
  dragOverIndex.value = event.clientY < midY ? index : index + 1
}

function onItemDragLeave() {
  // 不立即清空，避免抖动；drop/dragend 统一清理
}

// 整个画布区域允许放置
function onZoneDragOver(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = dragSource?.source === 'canvas' ? 'move' : 'copy'
  }
  // 拖到空白区域 → 放最后
  if (dragOverIndex.value === null) dragOverIndex.value = modelFields.value.length
}

function onZoneDragLeave() {
  isDragOver.value = false
}

// 核心放置逻辑：区分 palette 新增 vs canvas 重排
function onZoneDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  const raw = event.dataTransfer?.getData('text/plain')
  let payload = dragSource
  if (raw) {
    try {
      payload = JSON.parse(raw)
    } catch {
      /* 保留 dragSource */
    }
  }
  const insertAt = dragOverIndex.value ?? modelFields.value.length

  if (payload?.source === 'palette' && payload.type) {
    // 从组件库新增字段
    const newField = createField(payload.type as FormFieldType)
    modelFields.value.splice(insertAt, 0, newField)
    modelSelectedId.value = newField.id
  } else if (payload?.source === 'canvas' && payload.index !== undefined) {
    // 画布内重排
    const from = payload.index
    let to = insertAt
    if (from < to) to -= 1
    if (from !== to) {
      const [moved] = modelFields.value.splice(from, 1)
      modelFields.value.splice(to, 0, moved)
    }
  }

  dragOverIndex.value = null
  dragSource = null
}

function onDragEnd() {
  dragOverIndex.value = null
  dragSource = null
}

function removeField(index: number) {
  const removed = modelFields.value[index]
  modelFields.value.splice(index, 1)
  if (modelSelectedId.value === removed.id) modelSelectedId.value = null
}
</script>

<style scoped>
.design-canvas {
  min-height: 400px;
}
.design-canvas.drag-active {
  border-color: rgb(25, 118, 210);
  border-style: dashed;
}
.drop-indicator {
  height: 3px;
  background: rgb(25, 118, 210);
  border-radius: 2px;
  margin: 2px 0;
}
</style>
