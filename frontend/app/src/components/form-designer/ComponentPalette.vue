<!-- 左栏：组件库，可拖出字段类型，双击快速添加 -->
<template>
  <div class="component-palette">
    <div class="text-subtitle-2 pa-3 pb-1 text-grey">组件库</div>
    <v-list density="compact" nav>
      <template v-for="group in groups" :key="group.name">
        <v-list-subheader>{{ group.label }}</v-list-subheader>
        <v-list-item
          v-for="item in group.items"
          :key="item.type"
          :prepend-icon="item.icon"
          :title="item.label"
          :data-type="item.type"
          draggable="true"
          class="palette-item"
          @dragstart="onDragStart($event, item.type)"
          @dblclick="emit('add', item.type)"
        />
      </template>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { FIELD_TYPE_META, type FormFieldType } from '../../types/form-schema'

const emit = defineEmits<{ (e: 'add', type: FormFieldType): void }>()

const groups = computed(() => [
  { name: 'input', label: '输入字段', items: FIELD_TYPE_META.filter(i => i.group === 'input') },
  { name: 'layout', label: '布局元素', items: FIELD_TYPE_META.filter(i => i.group === 'layout') },
])

// 拖拽协议：dataTransfer 带 JSON { source, type }
function onDragStart(event: DragEvent, type: FormFieldType) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('text/plain', JSON.stringify({ source: 'palette', type }))
  event.dataTransfer.effectAllowed = 'copy'
}
</script>

<style scoped>
.palette-item {
  cursor: grab;
}
.palette-item:active {
  cursor: grabbing;
}
</style>
