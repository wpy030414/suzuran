# Suzuran Cloud Architecture

> 架构地图 — 描述稳定的结构关系，让 Agent 理解系统边界

## 系统分层

```
┌─────────────────────────────────────────────────────────────┐
│                     外部请求（HTTP/WebSocket）                │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  API Gateway / Reverse Proxy                                │
│  - OAuth 校验（WebAuthn / 钉钉）                             │
│  - 请求路由（平台 API vs 应用路由）                            │
│  - Rate limiting、CORS                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
┌─────────▼─────────┐   ┌──────────▼──────────┐
│  Platform API     │   │  Application Router  │
│  - 租户管理        │   │  - 请求分发到应用     │
│  - 应用管理        │   │  - Session 隔离      │
│  - 用户管理        │   │  - 资源配额          │
│  - 审计日志        │   │                      │
└─────────┬─────────┘   └──────────┬──────────┘
          │                         │
          └────────────┬────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  MCP Server（数据共享层）                                     │
│  - org.getUsers()、org.getDepartments()                     │
│  - file.upload()、file.download()                           │
│  - data.query()、data.mutate()                              │
│  - audit.log()、audit.query()                               │
│  - 权限校验（基于 OAuth token）                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Application Runtime（应用运行时）                            │
│  - 应用进程管理（启动/停止/重启）                              │
│  - 沙箱隔离（命名空间、cgroup、seccomp）                      │
│  - 资源配额（CPU、内存、数据库连接）                           │
│  - 应用间通信（通过 MCP，不直接进程间调用）                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Data Layer（数据层）                                         │
│  - PostgreSQL（共享数据库，org_id 字段隔离）                   │
│  - Redis（Session、缓存、MCP 调用限流）                       │
│  - MinIO（文件存储，S3 兼容）                                 │
└─────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. OAuth IdP（平台自建）

平台自己实现 OAuth2 + WebAuthn ceremony：
- **WebAuthn**：注册/登录 ceremony、credential 存储、authenticator 交互
- **钉钉 OAuth**：authorization_code 流程、组织架构同步
- **Token 管理**：access_token（JWT，短期）+ refresh_token（长期，可撤销）
- **OAuth 端点**：`/oauth/authorize`、`/oauth/token`、`/oauth/revoke`、`/.well-known/openid-configuration`

应用信任平台签发的 token，不自己实现鉴权。

### 2. MCP Server

平台暴露的 MCP Server 是应用访问数据的唯一通道：
- **Tools**：定义好的数据操作（CRUD + 查询 + 文件操作）
- **Resources**：应用可以读取的只读资源（如 schema 文档、配置）
- **Prompts**：平台提供的提示模板（帮助 Agent 理解如何调用）

MCP Server 内部做权限校验：每个 tool 调用都检查 OAuth token 中的 org_id/user_id/role。

### 3. Application Runtime

应用运行在平台管理的沙箱中：
- **隔离**：每个应用一个独立进程/容器，不能直接访问其他应用的内存/文件
- **通信**：应用间不直接调用，通过 MCP Server 中转（数据共享）
- **生命周期**：平台管理应用的创建、部署、升级、销毁
- **资源**：每个应用有 CPU/内存/数据库连接配额，超出则限流或拒绝

### 4. Multi-tenant Data Isolation

多租户隔离策略：
- **数据库**：共享 PostgreSQL，所有表有 `org_id` 字段，查询自动加 `WHERE org_id = ?`
- **文件存储**：MinIO bucket 按 org_id 前缀隔离
- **缓存**：Redis key 按 `org:<org_id>:<resource>:<id>` 命名空间隔离
- **审计**：所有操作记录 org_id/user_id/action/resource

### 5. Skill/MCP Contract

平台发布的契约是 Agent 开发的依据：
- **MCP tool schema**：每个 tool 的输入/输出 JSON Schema
- **OAuth 流程文档**：Agent 如何获取 token、如何刷新
- **应用 SDK**：平台提供的运行时接口（如何启动应用、如何注册路由）
- **数据模型**：共享数据的 JSON Schema（org、user、department 等）

契约一旦发布就稳定，Agent 不需要猜测平台行为。

## 数据流示例

**场景：Agent 开发一个 CRM 应用，需要读取员工列表**

1. Agent 调用平台 OAuth 端点获取 token（用 WebAuthn 或钉钉登录）
2. Agent 开发 CRM 代码，代码中调用 MCP tool：`mcp.call('org.getUsers', {orgId: 123})`
3. CRM 部署到平台，平台启动应用进程
4. 终端用户访问 CRM，CRM 调用 MCP Server
5. MCP Server 校验 token → 查询 PostgreSQL（`SELECT * FROM users WHERE org_id = 123`）→ 返回结果
6. MCP Server 记录审计日志（谁、什么时候、读了什么）

## 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Go 1.26 + Gin + GORM |
| **数据库** | PostgreSQL 15（JSONB + GIN 索引） |
| **缓存** | Redis 7（Session、MCP 限流） |
| **对象存储** | MinIO（S3 兼容） |
| **鉴权** | OAuth2 + WebAuthn（go-webauthn） |
| **MCP** | mark3labs/mcp-go（MCP server SDK） |
| **应用运行时** | Docker / gVisor / Firecracker（待定） |
| **前端** | Vue 3 + Vite + Vuetify + Pinia |
| **容器化** | Docker Compose |

## 边界与约束

- 平台不提供低代码编辑器（拖拽、可视化工作流）
- 应用必须通过 MCP 访问数据，不能直接连数据库
- 应用间不能直接 HTTP 调用，必须通过 MCP 中转
- OAuth 是唯一鉴权方式，不支持密码登录
- 所有数据操作都有审计日志

## 演化路径

当前（2026-08）：多租户基座已成型，低代码资产待清理，MCP/运行时/WebAuthn 待建设。

下一步：
1. 清理低代码资产（拖拽设计器、工作流引擎等）
2. 建设 OAuth IdP（WebAuthn + 钉钉 OAuth）
3. 建设 MCP Server（基础数据 + 文件 + 审计）
4. 建设应用运行时（沙箱隔离 + 生命周期管理）
5. 发布 Skill/MCP 契约文档
