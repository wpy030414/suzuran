# 应用 SDK

> 版本：v1.0.0

Suzuran Cloud 应用 SDK（`@suzuran/sdk`）让 Agent 生成的应用能便捷地调用平台 MCP Server 和注册 HTTP 路由。

## 安装

```bash
npm install @suzuran/sdk
```

## 快速开始

```javascript
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

应用容器启动时，平台会注入以下环境变量：

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

```javascript
// 调用 MCP tool
const org = await app.mcp.call('org.get', { orgId: req.orgId })
```

### 获取当前组织成员

```javascript
const result = await app.mcp.call('user.list_members', { orgId: req.orgId })
const members = result.members
```

### 上传文件

```javascript
const fileContent = fs.readFileSync('report.pdf').toString('base64')
const result = await app.mcp.call('file.upload', {
  orgId: req.orgId,
  fileName: 'report.pdf',
  fileBase64: fileContent,
  contentType: 'application/pdf',
})
```

### 查询审计日志

```javascript
const logs = await app.mcp.call('audit.query', {
  orgId: req.orgId,
  action: 'create',
  limit: 50,
})
```

## HTTP 路由

### 注册路由

```javascript
app.get('/api/items', listItems)
app.post('/api/items', createItem)
app.put('/api/items/:id', updateItem)
app.delete('/api/items/:id', deleteItem)
```

### 请求对象

```javascript
app.get('/api/profile', (req, res) => {
  const userId = req.userId   // 当前用户 ID（从 token 提取）
  const orgId = req.orgId     // 当前组织 ID
  const role = req.role       // 用户角色
  res.json({ userId, orgId, role })
})
```

## 应用清单 (app.json)

应用根目录必须包含 `app.json` 清单文件：

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "runtime": "node:18",
  "entrypoint": "node server.js",
  "port": 8080,
  "resources": {
    "cpu": "0.5",
    "memory": "512Mi"
  },
  "mcp_scopes": ["org.read", "file.write"],
  "routes": [
    { "path": "/api/*", "handler": "http://localhost:8080" }
  ]
}
```

## 生命周期

| 事件 | 说明 |
|------|------|
| `app.onStart()` | 容器启动时回调 |
| `app.onStop()` | 容器停止时回调（优雅关闭） |

```javascript
app.onStart(async () => {
  console.log('App starting...')
  // 初始化数据库连接等
})

app.onStop(async () => {
  console.log('App stopping...')
  // 清理资源
})
```

## 支持的运行时

| 运行时 | 镜像 | 说明 |
|--------|------|------|
| `node:18` | node:18-alpine | Node.js 18 |
| `node:20` | node:20-alpine | Node.js 20 |
| `python:3.11` | python:3.11-slim | Python 3.11 |
| `go:1.21` | golang:1.21-alpine | Go 1.21 |

## 部署流程

```bash
# 1. 通过平台 API 创建应用
curl -X POST http://localhost:8888/api/provider/apps \
  -H "Authorization: Bearer $TOKEN" \
  -d @app.json

# 2. 部署应用
curl -X POST http://localhost:8888/api/provider/apps/<appId>/deploy \
  -H "Authorization: Bearer $TOKEN"

# 3. 访问应用
curl http://localhost:8888/apps/<appId>/api/hello
```
