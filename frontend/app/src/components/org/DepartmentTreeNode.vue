<template>
  <div>
    <div class="d-flex align-center pl-4" :style="{ paddingLeft: depth * 24 + 'px' }">
      <v-btn
        v-if="node.children && node.children.length > 0"
        size="x-small"
        variant="text"
        :icon="expanded ? 'mdi-chevron-down' : 'mdi-chevron-right'"
        @click="expanded = !expanded"
        class="mr-1"
      />
      <v-icon v-else size="20" class="mr-1 ml-4" color="grey">mdi-folder-outline</v-icon>

      <span class="text-subtitle-2 font-weight-medium flex-grow-1">{{ node.name }}</span>

      <v-chip v-if="managerName" size="x-small" variant="tonal" color="info" class="mr-2">
        {{ managerName }}
      </v-chip>
      <span v-if="node.description" class="text-caption text-grey mr-2" style="max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
        {{ node.description }}
      </span>

      <v-btn size="x-small" variant="text" color="primary" icon="mdi-account-cog" title="设负责人" @click="$emit('setManager', node)" />
      <v-btn size="x-small" variant="text" color="primary" icon="mdi-pencil" title="编辑" @click="$emit('edit', node)" />
      <v-btn size="x-small" variant="text" color="error" icon="mdi-delete" title="删除" @click="$emit('delete', node)" />
    </div>
    <div v-if="expanded && node.children && node.children.length > 0">
      <DepartmentTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :members="members"
        :all-flat="allFlat"
        :depth="depth + 1"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
        @set-manager="$emit('setManager', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DepartmentNode, Department } from '../../api/department'
import type { Member } from '../../api/user'

const props = defineProps<{
  node: DepartmentNode
  members: Member[]
  allFlat: Department[]
  depth: number
}>()

const emit = defineEmits<{
  edit: [dept: Department]
  delete: [dept: Department]
  setManager: [dept: Department]
}>()

const expanded = ref(true)

const managerName = computed(() => {
  if (props.node.managerUserId == null) return ''
  const m = props.members.find(m => m.userId === props.node.managerUserId)
  return m ? m.name : ''
})
</script>
