// frontend/app/src/api/application.ts
import apiClient from './client'

export interface Application {
  id: number
  uuid: string
  packageName: string
  version: string
  name: string
  description: string
  orgId: number
  schema: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateAppRequest {
  name: string
  packageName: string
  description?: string
}

// List all applications for current org
export function listApplications() {
  return apiClient.get<Application[]>('/api/provider/applications')
}

// Get application by ID
export function getApplication(id: number) {
  return apiClient.get<Application>(`/api/provider/applications/${id}`)
}

// Create a new application
export function createApplication(data: CreateAppRequest) {
  return apiClient.post<Application>('/api/provider/applications', data)
}

// Copy an application (generates new UUID and version)
export function copyApplication(id: number, name?: string) {
  return apiClient.post<Application>(`/api/provider/applications/${id}/copy`, { name })
}

// Update application version (generates new UUID and version)
export function updateApplicationVersion(id: number) {
  return apiClient.post<Application>(`/api/provider/applications/${id}/update`)
}

// Delete an application version (current version only)
export function deleteApplication(id: number) {
  return apiClient.delete(`/api/provider/applications/${id}`)
}

export interface DistributeRequest {
  targetOrgId: number
  overwrite: boolean
}

// Distribute an application to a target org (optionally overwrite same-package versions)
export function distributeApplication(id: number, data: DistributeRequest) {
  return apiClient.post<Application>(`/api/provider/applications/${id}/distribute`, data)
}
