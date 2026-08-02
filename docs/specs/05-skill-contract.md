# Spec 05: Skill/MCP 契约文档

> 发布严格契约，Agent 据此开发应用

## 目标

发布完整的 Skill/MCP 契约文档，让 Agent 能够：
1. 理解平台提供的能力（MCP tools、resources、prompts）
2. 知道如何获取 OAuth token（WebAuthn、钉钉 OAuth）
3. 知道如何开发应用（应用 SDK、运行时接口）
4. 知道数据模型（org/user/department 的 JSON Schema）

契约一旦发布就稳定，Agent 不需要猜测平台行为。

## 契约文档清单

### 1. MCP Tools Schema

**`docs/contracts/mcp-tools.json`**：

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Suzuran Cloud MCP Tools",
  "tools": [
    {
      "name": "org.list_users",
      "description": "获取组织内用户列表",
      "input": {
        "type": "object",
        "properties": {
          "orgId": { "type": "integer" },
          "limit": { "type": "integer", "default": 100 },
          "offset": { "type": "integer", "default": 0 }
        },
        "required": ["orgId"]
      },
      "output": {
        "type": "object",
        "properties": {
          "users": {
            "type": "array",
            "items": { "$ref": "#/schemas/User" }
          },
          "total": { "type": "integer" }
        }
      }
    }
    // ... 其他 tools
  ]
}
```

### 2. OAuth 流程文档

**`docs/contracts/oauth.md`**：

```markdown
# OAuth 流程

## 获取 Token

### WebAuthn 登录

1. 调用 `POST /oauth/webauthn/login/begin` 获取 challenge
2. 调用 `navigator.credentials.get()` 获取 credential
3. 调用 `POST /oauth/webauthn/login/finish` 提交 credential
4. 获取 access_token 和 refresh_token

### 钉钉 OAuth 登录

1. 重定向到 `/oauth/dingtalk/authorize`
2. 钉钉回调后自动登录
3. 获取 access_token 和 refresh_token

## 刷新 Token

POST /oauth/token
{
  "grant_type": "refresh_token",
  "refresh_token": "..."
}

## 撤销 Token

POST /oauth/revoke
{
  "token": "..."
}
```

### 3. 应用 SDK 文档

**`docs/contracts/app-sdk.md`**：

```markdown
# 应用 SDK

## 安装

npm install @suzuran/sdk

## 初始化

import { createApp } from '@suzuran/sdk'

const app = createApp({
  name: 'my-app',
  port: 8080,
})

## 调用 MCP

const users = await app.mcp.call('org.list_users', { orgId: 123 })

## 注册路由

app.get('/api/customers', async (req, res) => {
  // 处理请求
})

## 启动

app.start()
```

### 4. 数据模型 Schema

**`docs/contracts/schemas/org.json`**：
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Organization",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "createdAt": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "name"]
}
```

**`docs/contracts/schemas/user.json`**：
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "User",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "orgId": { "type": "integer" },
    "name": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "phone": { "type": "string" },
    "avatarURL": { "type": "string", "format": "uri" },
    "position": { "type": "string" },
    "createdAt": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "orgId", "name"]
}
```

**`docs/contracts/schemas/department.json`**：
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Department",
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "orgId": { "type": "integer" },
    "name": { "type": "string" },
    "parentId": { "type": ["integer", "null"] },
    "level": { "type": "integer" },
    "managerUserId": { "type": ["integer", "null"] },
    "createdAt": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "orgId", "name"]
}
```

### 5. 应用清单 Schema

**`docs/contracts/app-manifest.json`**：
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Application Manifest",
  "type": "object",
  "properties": {
    "name": { "type": "string", "pattern": "^[a-z0-9-]+$" },
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "runtime": { "type": "string", "enum": ["node:18", "node:20", "python:3.11", "go:1.21"] },
    "entrypoint": { "type": "string" },
    "port": { "type": "integer", "minimum": 1024, "maximum": 65535 },
    "resources": {
      "type": "object",
      "properties": {
        "cpu": { "type": "string", "pattern": "^\\d+(\\.\\d+)?$" },
        "memory": { "type": "string", "pattern": "^\\d+(Mi|Gi)$" },
        "database_connections": { "type": "integer", "minimum": 1, "maximum": 100 }
      },
      "required": ["cpu", "memory"]
    },
    "mcp_scopes": {
      "type": "array",
      "items": { "type": "string" }
    },
    "routes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "path": { "type": "string" },
          "handler": { "type": "string", "format": "uri" }
        },
        "required": ["path", "handler"]
      }
    }
  },
  "required": ["name", "version", "runtime", "entrypoint", "port"]
}
```

### 6. 示例应用

**`docs/contracts/examples/hello-world/`**：

```
hello-world/
├── app.json          # 应用清单
├── server.js         # 应用代码
├── package.json
└── README.md         # 说明文档
```

**`hello-world/app.json`**：
```json
{
  "name": "hello-world",
  "version": "1.0.0",
  "runtime": "node:18",
  "entrypoint": "node server.js",
  "port": 8080,
  "resources": {
    "cpu": "0.1",
    "memory": "128Mi"
  },
  "mcp_scopes": ["org.read"],
  "routes": [
    { "path": "/api/*", "handler": "http://localhost:8080" }
  ]
}
```

**`hello-world/server.js`**：
```javascript
import { createApp } from '@suzuran/sdk'

const app = createApp({
  name: 'hello-world',
  port: 8080,
})

app.get('/api/hello', async (req, res) => {
  const users = await app.mcp.call('org.list_users', { orgId: req.orgId })
  res.json({
    message: 'Hello, World!',
    userCount: users.length,
  })
})

app.start()
```

## 完成标准

- [ ] MCP tools schema 文档完整（覆盖所有 tools）
- [ ] OAuth 流程文档清晰（WebAuthn + 钉钉 OAuth）
- [ ] 应用 SDK 文档完整（安装、初始化、调用 MCP、注册路由）
- [ ] 数据模型 schema 完整（org/user/department）
- [ ] 应用清单 schema 完整
- [ ] 示例应用可运行（hello-world）
- [ ] 契约文档发布到 `docs/contracts/` 目录
- [ ] 契约文档有版本控制（v1.0.0）

## 版本控制

契约采用语义化版本（SemVer）：
- **MAJOR**（1.0.0 → 2.0.0）：不兼容的变更（删除 tool、修改输入/输出格式）
- **MINOR**（1.0.0 → 1.1.0）：向后兼容的新增（新增 tool、新增字段）
- **PATCH**（1.0.0 → 1.0.1）：向后兼容的修复（文档修正、示例更新）

## 预计工作量

3-5 天（Agent 执行）
