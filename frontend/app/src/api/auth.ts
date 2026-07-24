// frontend/app/src/api/auth.ts
import apiClient from './client'

export interface LoginRequest {
  phone: string
  password: string
}

export interface LoginResponse {
  preToken: string
  user: {
    id: number
    name: string
    phone: string
  }
  orgs: Array<{
    orgId: number
    orgName: string
    isAdmin: boolean
  }>
}

export interface SelectOrgRequest {
  preToken: string
  orgId: number
}

export interface SelectOrgResponse {
  token: string
  orgId: number
  role: 'provider' | 'tenant_admin' | 'user'
  user: {
    id: number
    phone: string
    name: string
    role: 'provider' | 'tenant_admin' | 'user'
    orgId: number
  }
}

// Login API
export function login(data: LoginRequest) {
  return apiClient.post<LoginResponse>('/api/auth/login', data)
}

// Select organization API
export function selectOrg(data: SelectOrgRequest) {
  return apiClient.post<SelectOrgResponse>('/api/auth/select-org', data)
}
