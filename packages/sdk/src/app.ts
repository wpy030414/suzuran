import { createServer, Server } from 'http'
import { MCPClient } from './mcp-client.js'
import { Router } from './router.js'
import type { AppConfig, RouteHandler, LifecycleHook } from './types.js'

/**
 * Suzuran 应用实例
 */
export class SuzuranApp {
  readonly name: string
  readonly port: number
  readonly appId: string
  readonly orgId: number
  readonly mcp: MCPClient

  private router: Router
  private server: Server | null = null
  private startHook: LifecycleHook | null = null
  private stopHook: LifecycleHook | null = null

  constructor(config: AppConfig) {
    this.name = config.name
    this.port = config.port

    // 从环境变量读取平台注入的信息
    this.appId = process.env.APP_ID || ''
    this.orgId = parseInt(process.env.ORG_ID || '0', 10)

    const mcpEndpoint = process.env.MCP_ENDPOINT || 'http://backend:8888/mcp'
    const oauthToken = process.env.OAUTH_TOKEN || ''

    this.mcp = new MCPClient(mcpEndpoint, oauthToken)
    this.router = new Router()
  }

  /**
   * 注册 GET 路由
   */
  get(path: string, handler: RouteHandler): void {
    this.router.get(path, handler)
  }

  /**
   * 注册 POST 路由
   */
  post(path: string, handler: RouteHandler): void {
    this.router.post(path, handler)
  }

  /**
   * 注册 PUT 路由
   */
  put(path: string, handler: RouteHandler): void {
    this.router.put(path, handler)
  }

  /**
   * 注册 DELETE 路由
   */
  delete(path: string, handler: RouteHandler): void {
    this.router.delete(path, handler)
  }

  /**
   * 注册启动钩子
   */
  onStart(hook: LifecycleHook): void {
    this.startHook = hook
  }

  /**
   * 注册停止钩子
   */
  onStop(hook: LifecycleHook): void {
    this.stopHook = hook
  }

  /**
   * 启动应用
   */
  async start(): Promise<void> {
    // 执行启动钩子
    if (this.startHook) {
      await this.startHook()
    }

    // 创建 HTTP 服务器
    this.server = createServer((req, res) => {
      this.router.handle(req, res, this.appId, this.orgId)
    })

    // 监听端口
    await new Promise<void>((resolve) => {
      this.server!.listen(this.port, () => {
        console.log(`[${this.name}] App started on port ${this.port}`)
        console.log(`[${this.name}] App ID: ${this.appId}, Org ID: ${this.orgId}`)
        resolve()
      })
    })

    // 优雅关闭
    const shutdown = async () => {
      console.log(`[${this.name}] Shutting down...`)

      if (this.stopHook) {
        await this.stopHook()
      }

      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => {
            console.log(`[${this.name}] Server closed`)
            resolve()
          })
        })
      }

      process.exit(0)
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
  }
}

/**
 * 创建 Suzuran 应用实例
 */
export function createApp(config: AppConfig): SuzuranApp {
  return new SuzuranApp(config)
}
