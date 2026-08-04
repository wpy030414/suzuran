// frontend/app/src/api/client.ts
import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor - on 401 try a single token refresh, else clear & redirect.
let isRefreshing = false
let pendingRequests: Array<(token: string | null) => void> = []

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response && error.response.status === 401 && !originalRequest._retried) {
      originalRequest._retried = true
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) {
        clearAndRedirect()
        return Promise.reject(error)
      }
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((token: string | null) => {
            if (!token) {
              reject(error)
              return
            }
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(originalRequest))
          })
        })
      }
      try {
        isRefreshing = true
        const params = new URLSearchParams()
        params.set('grant_type', 'refresh_token')
        params.set('refresh_token', refreshToken)
        params.set('client_id', 'suzuran-spa')
        const resp = await axios.post(`${apiClient.defaults.baseURL}/oauth/token`, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        const newToken = resp.data.access_token
        const newRefresh = resp.data.refresh_token
        localStorage.setItem('token', newToken)
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh)
        pendingRequests.forEach((cb) => cb(newToken))
        pendingRequests = []
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } catch {
        pendingRequests.forEach((cb) => cb(null))
        pendingRequests = []
        clearAndRedirect()
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  },
)

function clearAndRedirect() {
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  localStorage.removeItem('scope')
  // Emit a custom event so the router can handle navigation without page reload.
  // The App.vue or main.ts listens for this event and uses router.push('/login').
  window.dispatchEvent(new CustomEvent('auth:logout'))
}

export default apiClient
