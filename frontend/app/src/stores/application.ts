// frontend/app/src/stores/application.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  listApplications,
  createApplication,
  copyApplication,
  updateApplicationVersion,
  type Application,
  type CreateAppRequest,
} from '../api/application'

export const useApplicationStore = defineStore('application', () => {
  const applications = ref<Application[]>([])
  const loading = ref(false)
  const error = ref('')

  // Fetch all applications
  async function fetchApplications() {
    loading.value = true
    error.value = ''
    try {
      const response = await listApplications()
      applications.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || '获取应用列表失败'
      console.error('Fetch applications error:', err)
    } finally {
      loading.value = false
    }
  }

  // Create a new application
  async function createApp(data: CreateAppRequest) {
    loading.value = true
    error.value = ''
    try {
      const response = await createApplication(data)
      applications.value.push(response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || '创建应用失败'
      console.error('Create application error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Copy an application
  async function copyApp(id: number, name?: string) {
    loading.value = true
    error.value = ''
    try {
      const response = await copyApplication(id, name)
      applications.value.push(response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || '复制应用失败'
      console.error('Copy application error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update application version
  async function updateVersion(id: number) {
    loading.value = true
    error.value = ''
    try {
      const response = await updateApplicationVersion(id)
      applications.value.push(response.data)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || '更新应用版本失败'
      console.error('Update application error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    applications,
    loading,
    error,
    fetchApplications,
    createApp,
    copyApp,
    updateVersion,
  }
})
