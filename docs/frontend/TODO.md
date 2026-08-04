# Suzuran Cloud 前端待办清单

> 本文档记录 AI 原生应用平台的前端实施进度。

## 🎯 项目结构

```
frontend/app/                 # 统一单页应用（三端共用）
├── src/
│   ├── views/                # 页面组件
│   │   ├── Home.vue          # 首页
│   │   ├── Login.vue         # 登录页
│   │   ├── Forbidden.vue     # 403 禁止访问
│   │   ├── NotFound.vue      # 404 不存在
│   │   ├── provider/         # 服务商端视图
│   │   ├── tenant/           # 租户管理端视图
│   │   └── user/             # 用户端视图
│   ├── layouts/              # 布局组件
│   │   ├── ProviderLayout.vue
│   │   ├── TenantLayout.vue
│   │   └── UserLayout.vue
│   ├── components/           # 共享组件
│   │   └── org/              # 组织相关组件（DepartmentManager、MemberManager）
│   ├── stores/               # Pinia 状态管理
│   │   └── auth.ts           # 认证 Store
│   ├── api/                  # API 客户端
│   │   ├── client.ts         # Axios 实例
│   │   ├── auth.ts           # 认证 API
│   │   ├── org.ts            # 组织 API
│   │   ├── user.ts           # 用户 API
│   │   └── department.ts     # 部门 API
│   ├── router/               # Vue Router 配置
│   │   └── index.ts          # 路由 + 守卫
│   └── main.ts               # 应用入口
└── package.json
```

## ✅ 已完成

### 基础设施（100%）
- [x] **技术栈选型**
  - [x] Vue 3.5 + Vite 8 + TypeScript 6
  - [x] UI 框架：Vuetify 4（Material Design 3）
  - [x] 状态管理：Pinia 4
  - [x] 路由：Vue Router 4（带路由守卫）
  - [x] HTTP 客户端：Axios 1.18

- [x] **项目脚手架**
  - [x] `frontend/app/` 统一单页应用
  - [x] Vuetify 配置（主题色、图标、组件）
  - [x] Pinia Store 初始化
  - [x] Vue Router 配置（角色路由守卫）

- [x] **核心功能**
  - [x] 认证 Store（JWT token 管理、localStorage 持久化）
  - [x] 路由守卫（基于用户角色：provider / tenant_admin / user）
  - [x] 三种布局组件（ProviderLayout / TenantLayout / UserLayout）
  - [x] 首页（Home.vue）展示三个入口
  - [x] 登录页（Login.vue）手机号 + 密码

### 三端门户（100%）
- [x] **服务商端**（`/provider/*`，role=`provider`）
  - [x] Dashboard.vue — 仪表盘（内存/磁盘/DB 监控卡片）
  - [x] Organizations.vue — 组织列表
  - [x] OrgDetail.vue — 组织详情（部门管理 + 成员管理）

- [x] **租户管理端**（`/tenant/*`，role=`tenant_admin`）
  - [x] Dashboard.vue — 仪表盘
  - [x] UserManagement.vue — 用户管理
  - [x] DepartmentManagement.vue — 部门管理

- [x] **用户端**（`/user/*`，role=`user`）
  - [x] Dashboard.vue — 仪表盘

### 共享组件（100%）
- [x] `components/org/DepartmentManager.vue` — 部门管理
- [x] `components/org/DepartmentTreeNode.vue` — 部门树节点
- [x] `components/org/MemberManager.vue` — 成员管理

### 测试（100%）
- [x] Playwright E2E 测试框架
- [x] 登录测试（login.spec.ts）
- [x] 仪表盘测试（dashboard.spec.ts）
- [x] 组织管理测试（organizations.spec.ts、org-detail.spec.ts、org-settings*.spec.ts）
- [x] 路由守卫测试（remove-self-protection.spec.ts）

## ⏳ 待建设（按 Spec 编号）

### Spec 02: OAuth IdP 前端（✅ 已完成）
- [x] 重写 Login.vue — 移除密码登录，添加 WebAuthn + 钉钉 OAuth 按钮
- [x] 新增 Register.vue — WebAuthn 注册页面（`navigator.credentials.create()`）
- [x] 新增 `api/oauth.ts` — OAuth API 客户端
  - [x] `beginWebAuthnLogin()`、`finishWebAuthnLogin()`
  - [x] `beginWebAuthnRegister()`、`finishWebAuthnRegister()`
  - [x] `getDingTalkAuthorizeURL()`
  - [x] `exchangeLoginSession()`（会话令牌交换）
- [x] 更新 `stores/auth.ts` — 适配 OAuth 流程（authorization_code + token 刷新）
- [x] 新增 `views/Callback.vue` — 钉钉 OAuth 回调处理页
- [x] 更新路由守卫 — 处理 OAuth 回调

### Spec 03: MCP 相关前端（✅ 已完成）
- [x] 新增 MCP Tools 浏览页面（服务商端，展示可用 tools 和 schema）
- [x] 新增 MCP 调用日志页面（审计日志可视化）

### Spec 04: 应用管理前端（✅ 已完成）
- [x] 新增 `api/application.ts` — 应用管理 API 客户端（通用 + provider 管理）
- [x] 新增 `stores/application.ts` — 应用状态管理（OA 启动台）
- [x] 新增 `views/Apps.vue` — 应用启动台（OA start page，三端共用）
  - [x] 运行中/未运行分组卡片展示
  - [x] 状态指示条 + 运行时图标
  - [x] 点击进入应用（代理路由 `/apps/:appId/`）
- [x] 新增 `components/AppCard.vue` — 应用卡片组件
- [x] 更新 ProviderLayout — 添加"应用启动台"导航项
- [x] 更新 TenantLayout — 添加"应用启动台"导航项
- [x] 更新 UserLayout — 添加导航抽屉 + "应用启动台"导航项
- [x] 更新路由 — 三端各自注册 `apps` 子路由
- [x] 后端新增 `GET /api/apps` 通用端点（返回当前 org 应用，非 provider 隐藏 containerId）
- [x] 应用详情页（AppDetail.vue）— 已完成（应用信息、状态、生命周期控制、环境变量、日志）

## ❌ 已移除（低代码资产）

- ~~FormDesigner.vue — 拖拽式表单设计器~~
- ~~Applications.vue — 低代码应用管理~~
- ~~ApplicationDetail.vue — 低代码应用详情~~
- ~~FormSubmission.vue — 动态表单提交~~
- ~~components/form-designer/ — 拖拽设计器组件（5 个）~~
- ~~components/application/ — 应用分发对话框~~
- ~~components/view/ — 视图创建对话框~~
- ~~stores/form.ts、application.ts~~
- ~~api/form.ts、application.ts、view.ts~~
- ~~types/form-schema.ts、view-config.ts~~
- ~~E2E 测试：form-designer.spec.ts、applications.spec.ts~~

## 📋 技术债务

- [x] ~~修复 `stores/auth.ts` — `initFromStorage()` 未被调用~~（main.ts:40 已调用，TODO 过期）
- [x] ~~改进 `api/client.ts` — 401/403 应该走 router 而非 `window.location.href`~~（已实现 token 刷新 + `auth:logout` 自定义事件，TODO 过期）
- [x] ~~添加 Token 刷新机制~~（client.ts 已实现 refresh_token 流程）
- [x] ~~移除登录页硬编码演示账号~~（Login.vue 已重写为 WebAuthn，无密码引用；E2E 改用虚拟认证器全真流程）
- [x] ~~配置 `playwright.config.ts`~~（已配置 baseURL/webServer/trace，workers=1 串行避免 credential 竞态）
- [ ] 添加前端单元测试（vitest）
- [ ] 工程化加固：路径别名、env 多环境、bundle 分析、lint

## 📦 SDK（@suzuran/sdk）

- [x] **v1.0.0 实现**（`packages/sdk/`）
  - [x] TypeScript 编写，零外部依赖（Node.js 原生 http 模块）
  - [x] `createApp()` 工厂函数 + SuzuranApp 类
  - [x] MCPClient：JSON-RPC 2.0 客户端（自动携带 OAuth token）
  - [x] Router：轻量 HTTP 路由（支持路径参数、查询参数、请求体解析）
  - [x] 生命周期钩子（onStart / onStop + SIGTERM 优雅关闭）
  - [x] 自动读取环境变量（APP_ID, ORG_ID, PORT, MCP_ENDPOINT, OAUTH_TOKEN）
