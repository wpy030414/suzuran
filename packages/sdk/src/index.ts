/**
 * Suzuran Cloud 应用开发 SDK
 *
 * @example
 * ```typescript
 * import { createApp } from '@suzuran/sdk'
 *
 * const app = createApp({ name: 'my-app', port: 8080 })
 *
 * app.get('/api/hello', async (req, res) => {
 *   const members = await app.mcp.call('user.list_members', { orgId: req.orgId })
 *   res.json({ message: 'Hello!', memberCount: members.length })
 * })
 *
 * app.start()
 * ```
 */

export { createApp, SuzuranApp } from './app.js'
export { MCPClient } from './mcp-client.js'
export { Router } from './router.js'
export type {
  AppConfig,
  MCPCallParams,
  MCPRequest,
  MCPResponse,
  RequestContext,
  ResponseContext,
  RouteHandler,
  LifecycleHook
} from './types.js'
