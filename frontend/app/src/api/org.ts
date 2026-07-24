// frontend/app/src/api/org.ts
import apiClient from './client'

export interface Org {
  id: number
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

// List all organizations (provider view)
export function listOrgs() {
  return apiClient.get<Org[]>('/api/provider/orgs')
}

export interface OrgRequest {
  name: string
  description?: string
}

// Create a new organization
export function createOrg(data: OrgRequest) {
  return apiClient.post<Org>('/api/provider/orgs', data)
}

// Update an organization
export function updateOrg(id: number, data: OrgRequest) {
  return apiClient.put(`/api/provider/orgs/${id}`, data)
}

// Delete an organization
export function deleteOrg(id: number) {
  return apiClient.delete(`/api/provider/orgs/${id}`)
}
