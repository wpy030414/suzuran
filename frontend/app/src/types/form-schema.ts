// frontend/app/src/types/form-schema.ts
export type FormFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'heading' | 'divider'

export interface FormFieldOption {
  label: string
  value: string
}

export interface FormFieldValidation {
  required?: boolean
  min?: number
  max?: number
  pattern?: string
  message?: string
}

export type FormFieldWidth = 'full' | 'half'

export interface FormFieldSchema {
  id: string
  type: FormFieldType
  label: string
  name: string
  placeholder?: string
  defaultValue?: string | number | string[] | boolean
  width: FormFieldWidth
  validation: FormFieldValidation
  options?: FormFieldOption[]
}

export interface FormSchema {
  fields: FormFieldSchema[]
}

// 工厂函数：根据类型创建空白字段
export function createField(type: FormFieldType): FormFieldSchema {
  const id = 'fld_' + Math.random().toString(36).slice(2, 10)
  const defaultLabel: Record<FormFieldType, string> = {
    text: '文本字段',
    textarea: '多行文本',
    number: '数字字段',
    date: '日期字段',
    select: '下拉选择',
    radio: '单选',
    checkbox: '多选',
    heading: '标题',
    divider: '分割线',
  }
  const hasOptions = type === 'select' || type === 'radio' || type === 'checkbox'
  return {
    id,
    type,
    label: defaultLabel[type],
    name: 'field_' + Math.random().toString(36).slice(2, 10),
    width: 'full',
    validation: {},
    ...(hasOptions
      ? {
          options: [
            { label: '选项1', value: 'opt1' },
            { label: '选项2', value: 'opt2' },
          ],
        }
      : {}),
  }
}

// 字段类型元信息（供组件库渲染图标和标签）
export const FIELD_TYPE_META: Array<{
  type: FormFieldType
  label: string
  icon: string
  group: 'input' | 'layout'
}> = [
  { type: 'text', label: '文本', icon: 'mdi-form-textbox', group: 'input' },
  { type: 'textarea', label: '多行文本', icon: 'mdi-text-box-outline', group: 'input' },
  { type: 'number', label: '数字', icon: 'mdi-numeric', group: 'input' },
  { type: 'date', label: '日期', icon: 'mdi-calendar', group: 'input' },
  { type: 'select', label: '下拉选择', icon: 'mdi-form-dropdown', group: 'input' },
  { type: 'radio', label: '单选', icon: 'mdi-radiobox-marked', group: 'input' },
  { type: 'checkbox', label: '多选', icon: 'mdi-checkbox-marked', group: 'input' },
  { type: 'heading', label: '标题', icon: 'mdi-format-header-pound', group: 'layout' },
  { type: 'divider', label: '分割线', icon: 'mdi-minus', group: 'layout' },
]
