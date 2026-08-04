# @suzuran/sdk

> Suzuran Cloud 应用开发 SDK — Agent 通过此 SDK 快速接入平台 MCP Server

## 安装

```bash
npm install @suzuran/sdk
```

## 快速开始

```typescript
import { createApp } from '@suzuran/sdk'

const app = createApp({
  name: 'my-app',
  port: 8080,
})

// 注册 HTTP 路由
app.get('/api/hello', async (req, res) => {
  // 通过 MCP 调用平台数据
  const members = await app.mcp.call('user.list_members', { orgId: req.orgId })
  res.json({
    message: 'Hello, World!',
    memberCount: members.length,
  })
})

app.start()
```

## 运行时环境变量

应用容器启动时，平台会自动注入以下环境变量：

| 变量 | 说明 |
|------|------|
| `APP_ID` | 应用 ID |
| `ORG_ID` | 所属组织 ID |
| `PORT` | 应用监听端口 |
| `MCP_ENDPOINT` | MCP Server 地址（`http://backend:8888/mcp`） |
| `OAUTH_TOKEN` | 平台签发的 OAuth token（用于 MCP 鉴权） |

SDK 会自动读取这些环境变量，无需手动配置。

## MCP 调用

### 基本调用

```typescript
// 调用 MCP tool
const org = await app.mcp.call('org.get', { orgId: req.orgId })
```

### 获取当前组织成员

```typescript
const result = await app.mcp.call('user.list_members', { orgId: req.orgId })
const members = result.members
```

### 上传文件

```typescript
import fs from 'fs'

const fileContent = fs.readFileSync('report.pdf').toString('base64')
const result = await app.mcp.call('file.upload', {
  orgId: req.orgId,
  fileName: 'report.pdf',
  fileBase64: fileContent,
  contentType: 'application/pdf',
})
```

### 查询审计日志

```typescript
const logs = await app.mcp.call('audit.query', {
  orgId: req.orgId,
  action: 'create',
  limit: 50,
})
```

## HTTP 路由

### 注册路由

```typescript
app.get('/api/items', listItems)
app.post('/api/items', createItem)
app.put('/api/items/:id', updateItem)
app.delete('/api/items/:id', deleteItem)
```

### 请求对象

```typescript
app.get('/api/profile', (req, res) => {
  const appId = req.appId   // 当前应用 ID（从环境变量注入）
  const orgId = req.orgId   // 当前组织 ID
  res.json({ appId, orgId })
})
```

### 路径参数

```typescript
app.get('/api/users/:userId', (req, res) => {
  const userId = req.params.userId
  res.json({ userId })
})
```

### 查询参数

```typescript
app.get('/api/search', (req, res) => {
  const keyword = req.query.keyword
  res.json({ keyword })
})
```

## 生命周期

| 事件 | 说明 |
|------|------|
| `app.onStart()` | 容器启动时回调 |
| `app.onStop()` | 容器停止时回调（优雅关闭） |

```typescript
app.onStart(async () => {
  console.log('App starting...')
  // 初始化数据库连接等
})

app.onStop(async () => {
  console.log('App stopping...')
  // 清理资源
})
```

## 本地开发

本地开发时需要手动设置环境变量：

```bash
export APP_ID=my-app
export ORG_ID=123
export PORT=8080
export MCP_ENDPOINT=http://localhost:8888/mcp
export OAUTH_TOKEN=your-token-here

node server.js
```

## TypeScript 支持

SDK 使用 TypeScript 编写，提供完整的类型声明：

```typescript
import { createApp, type RequestContext, type ResponseContext } from '@suzuran/sdk'

const app = createApp({ name: 'my-app', port: 8080 })

app.get('/api/hello', async (req: RequestContext, res: ResponseContext) => {
  // req 和 res 都有完整的类型提示
  res.json({ message: 'Hello!' })
})
```

## 可用 MCP Tools

完整列表见平台契约文档 `docs/contracts/mcp-tools.json`。

常用 tools：

- `org.get` / `org.list` — 组织数据
- `user.list_members` / `user.create_member` — 用户管理
- `dept.list` / `dept.tree` / `dept.create` — 部门管理
- `file.upload` / `file.download` — 文件存储
- `audit.query` / `audit.log` — 审计日志

## License

MIT
