# Suzuran Cloud 前端 API 集成指南

## 🔧 开发环境准备

### 1. 后端服务启动

```bash
# 确保 PostgreSQL 和 Redis 已启动

# 启动后端服务器（端口 8888）
cd backend
go run cmd/api/main.go
```

### 2. 前端开发服务器

```bash
# 进入前端目录
cd frontend/app

# 安装依赖
npm install

# 启动开发服务器（端口 5173）
npm run dev
```

## 📡 API 配置

### 环境变量

创建 `frontend/app/.env.development`：

```env
VITE_API_BASE_URL=http://localhost:8888
```

### API 模块

- `src/api/auth.ts` - 认证相关 API
- `src/api/client.ts` - Axios 客户端配置

## 🔐 认证流程

### 1. 登录

```typescript
// 调用 /api/auth/login
const response = await authStore.login(phone, password)

// 返回数据
{
  pre_token: "pre_xxx",
  user: { id: 1, name: "Test", phone: "13800138000" },
  orgs: [{ org_id: 1, org_name: "Test Org", is_admin: true }]
}
```

### 2. 选择组织

```typescript
// 调用 /api/auth/select-org
await authStore.selectOrganization(orgId)

// 返回数据
{
  token: "jwt_token_here",
  user: { id: 1, name: "Test", role: "provider", org_id: 1 }
}
```

## 🚀 路由守卫

- `/login` - 仅未登录用户可访问
- `/provider/*` - 需要 `provider` 角色
- `/tenant/*` - 需要 `tenant_admin` 角色
- `/user/*` - 需要 `user` 角色
- `/forbidden` - 403 禁止访问页面

## 🧪 测试账号

使用后端测试数据：

| 手机号 | 密码 | 角色 |
|--------|------|------|
| 13800138000 | password123 | provider |

## 📝 待完成功能

- [ ] 表单设计器 API 对接
- [ ] 部门管理 API 对接
- [ ] 用户管理 API 对接
- [ ] 文件上传 API 对接
- [ ] 钉钉 OAuth 登录集成
