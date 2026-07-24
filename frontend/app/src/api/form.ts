// frontend/app/src/api/form.ts
import apiClient from './client'
import type { FormSchema } from '../types/form-schema'

export interface Form {
  id: number
  applicationId: number
  name: string
  code: string
  description: string
  schema: FormSchema
  createdAt: string
  updatedAt: string
}

export interface CreateFormRequest {
  name: string
  code: string
  description?: string
  schema?: FormSchema
}

export interface UpdateFormRequest {
  name?: string
  description?: string
  schema?: FormSchema
}

export function listForms(applicationId: number) {
  return apiClient.get<Form[]>(`/api/provider/applications/${applicationId}/forms`)
}

export function getForm(applicationId: number, formId: number) {
  return apiClient.get<Form>(`/api/provider/applications/${applicationId}/forms/${formId}`)
}

export function createForm(applicationId: number, data: CreateFormRequest) {
  return apiClient.post<Form>(`/api/provider/applications/${applicationId}/forms`, data)
}

export function updateForm(applicationId: number, formId: number, data: UpdateFormRequest) {
  return apiClient.put<Form>(`/api/provider/applications/${applicationId}/forms/${formId}`, data)
}

export function deleteForm(applicationId: number, formId: number) {
  return apiClient.delete(`/api/provider/applications/${applicationId}/forms/${formId}`)
}
