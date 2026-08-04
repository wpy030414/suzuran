import type { MCPRequest, MCPResponse } from './types.js'

/**
 * MCP JSON-RPC 2.0 客户端
 * 封装对平台 MCP Server 的调用
 */
export class MCPClient {
  private endpoint: string
  private token: string
  private requestId: number = 0

  constructor(endpoint: string, token: string) {
    this.endpoint = endpoint
    this.token = token
  }

  /**
   * 调用 MCP tool
   * @param toolName - tool 名称，如 'user.list_members'
   * @param args - tool 输入参数
   * @returns tool 返回结果（已解析 JSON）
   */
  async call<T = any>(toolName: string, args: Record<string, any>): Promise<T> {
    const id = ++this.requestId

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`MCP HTTP error: ${response.status} ${response.statusText}`)
    }

    const json = await response.json() as MCPResponse

    if (json.error) {
      throw new Error(`MCP error [${json.error.code}]: ${json.error.message}`)
    }

    if (!json.result?.content?.[0]?.text) {
      throw new Error('MCP response missing content')
    }

    try {
      return JSON.parse(json.result.content[0].text) as T
    } catch {
      // 如果不是 JSON，返回原始文本
      return json.result.content[0].text as any
    }
  }
}
