// frontend/app/src/api/department.ts
import apiClient from './client'

export interface Department {
  id: number
  orgId: number
  name: string
  parentId: number | null
  level: number
  managerUserId: number | null
  description: string
  createdAt: string
  updatedAt: string
}

export interface DepartmentNode extends Department {
  children: DepartmentNode[]
}

export interface DepartmentRequest {
  name: string
  parentId?: number | null
  description?: string
}

export function listDepartments(orgId: number) {
  return apiClient.get<Department[]>(`/api/provider/orgs/${orgId}/departments`)
}

export function getDepartmentTree(orgId: number) {
  return apiClient.get<DepartmentNode[]>(`/api/provider/orgs/${orgId}/departments/tree`)
}

export function createDepartment(orgId: number, data: DepartmentRequest) {
  return apiClient.post<Department>(`/api/provider/orgs/${orgId}/departments`, data)
}

export function updateDepartment(orgId: number, deptId: number, data: Partial<DepartmentRequest>) {
  return apiClient.put<{ message: string }>(`/api/provider/orgs/${orgId}/departments/${deptId}`, data)
}

export function deleteDepartment(orgId: number, deptId: number) {
  return apiClient.delete<{ message: string }>(`/api/provider/orgs/${orgId}/departments/${deptId}`)
}

export function setDepartmentManager(orgId: number, deptId: number, managerUserId: number) {
  return apiClient.post<{ message: string }>(`/api/provider/orgs/${orgId}/departments/${deptId}/manager`, { managerUserId })
}
