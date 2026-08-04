/**
 * Suzuran SDK 类型定义
 */

/**
 * 应用配置
 */
export interface AppConfig {
  /** 应用名称 */
  name: string
  /** 监听端口 */
  port: number
}

/**
 * MCP 调用参数
 */
export interface MCPCallParams {
  /** MCP tool 名称，如 'user.list_members' */
  name: string
  /** tool 输入参数 */
  arguments: Record<string, any>
}

/**
 * MCP JSON-RPC 2.0 请求
 */
export interface MCPRequest {
  jsonrpc: '2.0'
  id: number
  method: 'tools/call'
  params: MCPCallParams
}

/**
 * MCP JSON-RPC 2.0 响应
 */
export interface MCPResponse {
  jsonrpc: '2.0'
  id: number
  result?: {
    content: Array<{
      type: 'text'
      text: string
    }>
  }
  error?: {
    code: number
    message: string
    data?: any
  }
}

/**
 * 扩展的请求对象（注入到路由 handler）
 */
export interface RequestContext {
  /** 应用 ID（从环境变量 APP_ID 注入） */
  appId: string
  /** 组织 ID（从环境变量 ORG_ID 注入） */
  orgId: number
  /** 请求路径 */
  url: string
  /** HTTP 方法 */
  method: string
  /** 请求头 */
  headers: Record<string, string | string[] | undefined>
  /** 路径参数（如 :id） */
  params: Record<string, string>
  /** 查询参数 */
  query: Record<string, string | string[]>
  /** 请求体（JSON 解析后） */
  body?: any
}

/**
 * 响应对象
 */
export interface ResponseContext {
  /** 发送 JSON 响应 */
  json: (data: any) => void
  /** 发送文本响应 */
  send: (data: string) => void
  /** 设置状态码 */
  status: (code: number) => ResponseContext
  /** 设置响应头 */
  header: (name: string, value: string) => ResponseContext
}

/**
 * 路由 handler
 */
export type RouteHandler = (req: RequestContext, res: ResponseContext) => void | Promise<void>

/**
 * 生命周期钩子
 */
export type LifecycleHook = () => void | Promise<void>
