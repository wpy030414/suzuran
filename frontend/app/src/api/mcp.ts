// frontend/app/src/api/mcp.ts
// MCP server inspection + audit log API client.
import apiClient from './client'

export interface MCPTool {
  name: string
  description: string
  inputSchema?: {
    type: string
    properties?: Record<string, unknown>
    required?: string[]
  }
}

// The /mcp/tools endpoint returns a JSON-RPC envelope; we unwrap the result.
export async function listMCPTools() {
  return apiClient.get<{ tools: MCPTool[] }>('/mcp/tools', {
    // The backend returns a JSON-RPC wrapper; transform it in the store.
    transformResponse: [(data) => data],
  })
}

export interface AuditLogEntry {
  id: number
  orgId?: number
  userId?: number
  action: string
  resourceType?: string
  resourceId?: number
  ipAddress?: string
  userAgent?: string
  requestData?: Record<string, unknown>
  responseStatus?: number
  createdAt: string
}

export function listAuditLogs(params?: { orgId?: number; action?: string; limit?: number }) {
  return apiClient.get<{ logs: AuditLogEntry[] }>('/api/provider/audit/logs', { params })
}
