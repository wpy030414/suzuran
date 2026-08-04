// frontend/app/src/stores/application.ts
// Application store — manages app list state for the OA start page.
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  listApps,
  type Application,
} from '../api/application'

export const useApplicationStore = defineStore('application', () => {
  const apps = ref<Application[]>([])
  const loading = ref(false)
  const error = ref<string>('')

  const runningApps = computed(() =>
    apps.value.filter((a) => a.status === 'running'),
  )
  const stoppedApps = computed(() =>
    apps.value.filter((a) => a.status === 'stopped' || a.status === 'created'),
  )

  async function fetchApps() {
    loading.value = true
    error.value = ''
    try {
      const resp = await listApps()
      apps.value = resp.data.apps || []
    } catch (e: any) {
      error.value = e.response?.data?.error || e.message || '获取应用列表失败'
    } finally {
      loading.value = false
    }
  }

  function clear() {
    apps.value = []
    error.value = ''
  }

  return {
    apps,
    loading,
    error,
    runningApps,
    stoppedApps,
    fetchApps,
    clear,
  }
})
