<!-- 分发对话框：选目标组织 + 覆盖同包名旧版本开关 -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h5">分发应用</v-card-title>
      <v-card-text>
        <div v-if="sourceApp" class="text-body-2 text-grey-darken-1 mb-4">
          将「<strong>{{ sourceApp.name }}</strong>」
          <v-chip size="x-small" variant="tonal" class="ml-1">{{ sourceApp.packageName }}</v-chip>
          分发到目标组织
        </div>
        <v-select
          v-model="targetOrgId"
          :items="availableOrgs"
          item-title="name"
          item-value="id"
          label="目标组织"
          variant="outlined"
          class="mb-2"
          :rules="[v => !!v || '请选择目标组织']"
        />
        <v-switch
          v-model="overwrite"
          label="覆盖目标组织同包名的旧版本"
          color="primary"
          hide-details
          density="compact"
        />
        <div class="text-caption text-grey mt-1">
          开启后，若目标组织已有同包名应用，将被删除并替换为本次分发的内容
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">取消</v-btn>
        <v-btn color="primary" :disabled="!targetOrgId" @click="onConfirm">分发</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Org } from '../../api/org'
import type { Application } from '../../api/application'

const props = defineProps<{
  modelValue: boolean
  sourceApp: Application | null
  orgs: Org[]
  currentOrgId?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', payload: { targetOrgId: number; overwrite: boolean }): void
}>()

const targetOrgId = ref<number | null>(null)
const overwrite = ref(true)

// 排除当前组织，不能分发给自己
const availableOrgs = computed(() => {
  if (!props.currentOrgId) return props.orgs
  return props.orgs.filter(o => o.id !== props.currentOrgId)
})

// 打开时重置
watch(
  () => props.modelValue,
  v => {
    if (v) {
      targetOrgId.value = null
      overwrite.value = true
    }
  }
)

function onConfirm() {
  if (!targetOrgId.value) return
  emit('confirm', { targetOrgId: targetOrgId.value, overwrite: overwrite.value })
}

function close() {
  emit('update:modelValue', false)
}
</script>
