// frontend/app/src/stores/form.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  listForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  type Form,
  type CreateFormRequest,
  type UpdateFormRequest,
} from '../api/form'

export const useFormStore = defineStore('form', () => {
  const forms = ref<Form[]>([])
  const currentForm = ref<Form | null>(null)
  const loading = ref(false)
  const error = ref('')

  async function fetchForms(applicationId: number) {
    loading.value = true
    error.value = ''
    try {
      const response = await listForms(applicationId)
      forms.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || '获取表单列表失败'
      console.error('Fetch forms error:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchForm(applicationId: number, formId: number) {
    loading.value = true
    error.value = ''
    try {
      const response = await getForm(applicationId, formId)
      currentForm.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || '获取表单详情失败'
      console.error('Fetch form error:', err)
    } finally {
      loading.value = false
    }
  }

  async function saveForm(applicationId: number, formId: number, data: UpdateFormRequest) {
    loading.value = true
    error.value = ''
    try {
      const response = await updateForm(applicationId, formId, data)
      currentForm.value = response.data
      const idx = forms.value.findIndex(f => f.id === formId)
      if (idx !== -1) {
        forms.value[idx] = response.data
      }
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || '保存表单失败'
      console.error('Save form error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addForm(applicationId: number, data: CreateFormRequest) {
    loading.value = true
    error.value = ''
    try {
      const response = await createForm(applicationId, data)
      forms.value.push(response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || '创建表单失败'
      console.error('Create form error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function removeForm(applicationId: number, formId: number) {
    loading.value = true
    error.value = ''
    try {
      await deleteForm(applicationId, formId)
      forms.value = forms.value.filter(f => f.id !== formId)
      if (currentForm.value?.id === formId) {
        currentForm.value = null
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || '删除表单失败'
      console.error('Delete form error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    forms,
    currentForm,
    loading,
    error,
    fetchForms,
    fetchForm,
    saveForm,
    addForm,
    removeForm,
  }
})
