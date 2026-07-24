// frontend/app/src/api/view.ts
import apiClient from './client'
import type { ViewConfig, ViewType } from '../types/view-config'

export interface View {
  id: number
  applicationId: number
  name: string
  code: string
  type: ViewType
  description: string
  config: ViewConfig
  createdAt: string
  updatedAt: string
}

export interface CreateViewRequest {
  name: string
  code: string
  type: ViewType
  description?: string
  config?: ViewConfig
}

export function listViews(applicationId: number) {
  return apiClient.get<View[]>(`/api/provider/applications/${applicationId}/views`)
}

export function createView(applicationId: number, data: CreateViewRequest) {
  return apiClient.post<View>(`/api/provider/applications/${applicationId}/views`, data)
}

export function deleteView(applicationId: number, viewId: number) {
  return apiClient.delete(`/api/provider/applications/${applicationId}/views/${viewId}`)
}
