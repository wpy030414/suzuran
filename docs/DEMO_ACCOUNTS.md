# Suzuran Cloud 演示账户

> ⚠️ 平台已移除密码登录，改为 **WebAuthn (Passkey) + 钉钉 OAuth** 无感登录。
> 因此不再存在"演示账户 + 密码"的形式。本文档说明当前如何获取测试身份。

## 🔐 登录方式

平台现在只有两种登录途径，均通过自建 OAuth IdP：

| 方式 | 说明 | 适用场景 |
|------|------|----------|
| **Passkey (WebAuthn)** | 浏览器/设备本地凭据，无密码 | 主要登录方式，开发与生产均适用 |
| **钉钉 OAuth** | 钉钉扫码授权 | 已有钉钉组织的企业用户 |

新用户通过 `/register` 页面注册 Passkey 凭据；注册时系统会自动生成邮箱（`{random}@suzuran.local`）作为登录标识。详细流程见 `docs/contracts/oauth.md`。

## 🚀 快速开始（开发环境）

### 1. 启动基础设施 + 后端

```bash
docker compose up -d postgres redis minio
cd backend
go run cmd/api/main.go
```

### 2. 启动前端

```bash
cd frontend/app
npm install
npm run dev
```

### 3. 注册 Passkey 并登录

打开 `http://localhost:5173/register`，按浏览器提示完成 Passkey 注册（需支持 WebAuthn 的浏览器，如 Chrome/Edge）。
注册成功后会自动登录并跳转到对应门户。

### 4. 角色与组织

- 首个注册的用户默认成为 **服务商管理员（provider_admin）**
- 服务商可在 `/provider/orgs` 创建组织、添加成员，成员角色为 **租户管理员（org_admin）/ 部门管理员（dept_manager）**
- 普通用户由租户管理员通过 `user.create_member` 创建

## 🧪 测试场景

1. **多租户隔离**：创建两个组织，各添加成员，验证 MCP 工具调用受 `org_id` 隔离
2. **角色权限**：用不同角色登录，验证 `/api/system/*`、`/api/provider/*`、`/api/tenant/*` 的访问控制
3. **MCP 工具调用**：通过 SDK 或 MCP 客户端调用 `org.*`、`user.*`、`dept.*` 工具，验证审计日志与限流
