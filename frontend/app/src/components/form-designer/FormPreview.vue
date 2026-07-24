<!-- 预览模式：根据 schema 用 Vuetify 渲染只读表单 -->
<template>
  <v-card class="pa-6">
    <v-form readonly>
      <v-row dense>
        <template v-for="field in schema.fields" :key="field.id">
          <!-- 标题 -->
          <v-col v-if="field.type === 'heading'" cols="12">
            <div class="text-h6 font-weight-bold mt-2">{{ field.label }}</div>
          </v-col>
          <!-- 分割线 -->
          <v-col v-else-if="field.type === 'divider'" cols="12">
            <v-divider class="my-3" />
          </v-col>
          <!-- 输入字段 -->
          <v-col v-else :cols="field.width === 'half' ? 6 : 12">
            <v-text-field
              v-if="field.type === 'text'"
              :label="labelText(field)"
              :placeholder="field.placeholder"
              variant="outlined"
              density="compact"
              hide-details
            />
            <v-textarea
              v-else-if="field.type === 'textarea'"
              :label="labelText(field)"
              :placeholder="field.placeholder"
              variant="outlined"
              rows="2"
              auto-grow
              density="compact"
              hide-details
            />
            <v-text-field
              v-else-if="field.type === 'number'"
              :label="labelText(field)"
              :placeholder="field.placeholder"
              type="number"
              variant="outlined"
              density="compact"
              hide-details
            />
            <v-text-field
              v-else-if="field.type === 'date'"
              :label="labelText(field)"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
            />
            <v-select
              v-else-if="field.type === 'select'"
              :label="labelText(field)"
              :items="field.options"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="compact"
              hide-details
            />
            <div v-else-if="field.type === 'radio'">
              <div class="text-body-2 mb-1">{{ labelText(field) }}</div>
              <v-radio-group density="compact" hide-details>
                <v-radio
                  v-for="opt in field.options"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </v-radio-group>
            </div>
            <div v-else-if="field.type === 'checkbox'">
              <div class="text-body-2 mb-1">{{ labelText(field) }}</div>
              <v-checkbox
                v-for="opt in field.options"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
                density="compact"
                hide-details
              />
            </div>
          </v-col>
        </template>
      </v-row>
      <div v-if="!schema.fields.length" class="text-center text-grey pa-4">
        暂无字段，先在设计模式添加
      </div>
    </v-form>
  </v-card>
</template>

<script setup lang="ts">
import type { FormSchema, FormFieldSchema } from '../../types/form-schema'

defineProps<{ schema: FormSchema }>()

function labelText(f: FormFieldSchema) {
  return f.validation.required ? `${f.label} *` : f.label
}
</script>
