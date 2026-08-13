# Suzuran Cloud 前端 API 集成指南

> ⚠️ 本文档已更新以反映 OAuth IdP（WebAuthn + 钉钉）改造后的现状。
> 旧的密码登录、`/api/auth/login`、表单设计器等内容均已移除。

## 🔧 开发环境准备

### 1. 启动后端服务

```bash
# 启动基础设施
docker compose up -d postgres redis minio

# 启动后端（端口 8888）
cd backend
go run cmd/api/main.go
```

### 2. 启动前端开发服务器

```bash
cd frontend/app
npm install
npm run dev   # 端口 5173
```

## 📡 API 配置

### 环境变量

`frontend/app/.env.development`：

```env
VITE_API_BASE_URL=http://localhost:8888
```

### API 模块

| 模块 | 职责 |
|------|------|
| `src/api/client.ts` | Axios 实例 + access_token 自动刷新（httpOnly cookie / refresh token） |
| `src/api/oauth.ts` | WebAuthn 注册/登录 ceremony、钉钉 OAuth 跳转、session token 交换 |
| `src/api/org.ts` | 组织 CRUD（provider 门户） |
| `src/api/user.ts` | 成员管理（tenant 门户） |
| `src/api/department.ts` | 部门树与管理 |
| `src/api/application.ts` | 应用管理 + 部署/生命周期 |
| `src/api/mcp.ts` | MCP 工具浏览、MCP 调用日志查看 |

## 🔐 认证流程

平台使用自建 OAuth IdP，access_token（JWT, 15min, RS256）+ refresh_token（30d, 可吊销）。
前端通过 httpOnly cookie 持有 refresh_token，access_token 由前端管理。

### 1. WebAuthn 注册

```typescript
// /register 页面调用 oauth.beginRegistration / oauth.finishRegistration
// 浏览器原生 Passkey 注册，注册成功自动生成邮箱并登录
```

### 2. WebAuthn 登录

```typescript
// /login 页面调用 oauth.beginLogin / oauth.finishLogin
// 无密码，凭设备本地 Passkey 完成断言
```

### 3. 钉钉 OAuth 登录

```typescript
// /login 页面点击"钉钉登录"跳转到钉钉授权页
// 回调到 /callback，后端完成 code → token 交换
```

### 4. Session Token 交换

WebAuthn/钉钉登录成功后，前端用会话换取 JWT：

```
POST /oauth/session/token  →  { access_token, refresh_token, user, orgs }
```

### 5. Token 刷新

access_token 过期时，`client.ts` 的拦截器自动用 refresh_token 调 `POST /oauth/token`（grant_type=refresh_token）换取新令牌。

## 🚀 路由守卫

| 路由 | 要求角色 |
|------|----------|
| `/login`、`/register`、`/callback` | 仅未登录可访问 |
| `/provider/*` | `provider_admin` |
| `/tenant/*` | `org_admin` 或 `dept_manager` |
| `/user/*` | 任意已登录用户 |
| `/forbidden` | 403 兜底页 |

## 🧪 测试

- **E2E**：`npm run test:e2e`（Playwright，覆盖登录、仪表盘、组织管理、路由守卫）
- **单元测试**：vitest（待补，见 `docs/frontend/TODO.md`）
