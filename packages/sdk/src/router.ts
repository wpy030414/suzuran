import type { IncomingMessage, ServerResponse } from 'http'
import { URL } from 'url'
import type { RouteHandler, RequestContext, ResponseContext } from './types.js'

interface Route {
  method: string
  path: string
  handler: RouteHandler
  paramNames: string[]
}

/**
 * 轻量 HTTP 路由器
 * 基于 Node.js 原生 http 模块，零外部依赖
 */
export class Router {
  private routes: Route[] = []

  get(path: string, handler: RouteHandler): void {
    this.addRoute('GET', path, handler)
  }

  post(path: string, handler: RouteHandler): void {
    this.addRoute('POST', path, handler)
  }

  put(path: string, handler: RouteHandler): void {
    this.addRoute('PUT', path, handler)
  }

  delete(path: string, handler: RouteHandler): void {
    this.addRoute('DELETE', path, handler)
  }

  private addRoute(method: string, path: string, handler: RouteHandler): void {
    const paramNames: string[] = []
    const regexPath = path.replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name)
      return '([^/]+)'
    })

    this.routes.push({
      method,
      path: `^${regexPath}$`,
      handler,
      paramNames
    })
  }

  async handle(req: IncomingMessage, res: ServerResponse, appId: string, orgId: number): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    const method = req.method || 'GET'
    const pathname = url.pathname

    for (const route of this.routes) {
      if (route.method !== method) continue

      const match = pathname.match(route.path)
      if (!match) continue

      // 提取路径参数
      const params: Record<string, string> = {}
      route.paramNames.forEach((name, i) => {
        params[name] = match[i + 1]
      })

      // 提取查询参数
      const query: Record<string, string | string[]> = {}
      url.searchParams.forEach((value, key) => {
        const existing = query[key]
        if (existing) {
          query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
        } else {
          query[key] = value
        }
      })

      // 解析请求体
      let body: any
      if (method === 'POST' || method === 'PUT') {
        body = await this.parseBody(req)
      }

      // 构造请求上下文
      const requestContext: RequestContext = {
        appId,
        orgId,
        url: pathname,
        method,
        headers: req.headers as Record<string, string | string[] | undefined>,
        params,
        query,
        body
      }

      // 构造响应上下文
      let statusCode = 200
      const responseHeaders: Record<string, string> = {}

      const responseContext: ResponseContext = {
        status(code: number) {
          statusCode = code
          return this
        },
        header(name: string, value: string) {
          responseHeaders[name] = value
          return this
        },
        json(data: any) {
          responseHeaders['Content-Type'] = 'application/json'
          res.writeHead(statusCode, responseHeaders)
          res.end(JSON.stringify(data))
        },
        send(data: string) {
          responseHeaders['Content-Type'] = 'text/plain'
          res.writeHead(statusCode, responseHeaders)
          res.end(data)
        }
      }

      try {
        await route.handler(requestContext, responseContext)
      } catch (error) {
        console.error('Route handler error:', error)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Internal server error' }))
      }

      return
    }

    // 未匹配到路由
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }

  private parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })
      req.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch {
          resolve(body)
        }
      })
    })
  }
}
