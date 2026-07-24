// frontend/app/src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, selectOrg as apiSelectOrg, type LoginResponse } from '../api/auth'

interface User {
  id: number
  name: string
  phone: string
  role?: 'provider' | 'tenant_admin' | 'user'
  orgId?: number
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string>('')
  const preToken = ref<string>('')
  const availableOrgs = ref<LoginResponse['orgs']>([])

  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role || '')

  // Login function
  async function login(phone: string, password: string) {
    try {
      const response = await apiLogin({ phone, password })

      preToken.value = response.data.preToken
      user.value = response.data.user
      availableOrgs.value = response.data.orgs

      // Store in localStorage
      localStorage.setItem('preToken', response.data.preToken)
      localStorage.setItem('user', JSON.stringify(response.data.user))

      return response.data
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  // Select organization and get final token
  async function selectOrganization(orgId: number) {
    if (!preToken.value) {
      throw new Error('No pre_token available')
    }

    try {
      const response = await apiSelectOrg({
        preToken: preToken.value,
        orgId: orgId,
      })

      token.value = response.data.token
      user.value = response.data.user

      // Store in localStorage
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))

      return response.data
    } catch (error) {
      console.error('Select org error:', error)
      throw error
    }
  }

  // Logout function
  function logout() {
    user.value = null
    token.value = ''
    preToken.value = ''
    availableOrgs.value = []
    localStorage.removeItem('token')
    localStorage.removeItem('preToken')
    localStorage.removeItem('user')
  }

  // Initialize from localStorage
  function initFromStorage() {
    const storedToken = localStorage.getItem('token')
    const storedPreToken = localStorage.getItem('preToken')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      token.value = storedToken
      user.value = JSON.parse(storedUser)
    } else if (storedPreToken && storedUser) {
      preToken.value = storedPreToken
      user.value = JSON.parse(storedUser)
    }
  }

  return {
    user,
    token,
    preToken,
    availableOrgs,
    isAuthenticated,
    userRole,
    login,
    selectOrganization,
    logout,
    initFromStorage,
  }
})
