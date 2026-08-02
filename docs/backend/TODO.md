# Suzuran Cloud 后端待办清单

> 本文档记录 AI 原生应用平台的后端实施进度。

## ✅ 已完成

### 多租户基座（100%）
- [x] Go 项目骨架（cmd、internal、pkg 目录结构）
- [x] GORM 模型定义（Org、User、OrgUserBond、Department、AuditLog、DingTalkSyncLog）
- [x] Repository 层（org、user、bond、department、dingtalk_sync_log）
- [x] Service 层（auth、org、department、user、dingtalk_sync）
- [x] Middleware 层（auth、tenant context、CORS、permissions、audit）
- [x] Handler 层（auth、provider/org、provider/org_member、tenant/user、tenant/department）
- [x] Pkg 层（jwt、password、redis、dingtalk client/bot_client）
- [x] Main.go（依赖注入 + 路由配置）
- [x] JWT 认证中间件 + Redis token 存储
- [x] 租户上下文中间件
- [x] 文件存储（MinIO 集成）
- [x] 系统监控（内存/磁盘/DB 连接池指标）
- [x] 日志系统（内存环形缓冲 + 文件落盘）

### 数据库（100%）
- [x] 初始化脚本（docs/sql/init.sql）— 仅含多租户核心表
- [x] 演示数据种子（docs/sql/seed_demo_data.sql）
- [x] JSONB 类型兼容（PostgreSQL jsonb + SQLite text fallback）

### 测试（100%）
- [x] 所有 Service 单元测试
- [x] 所有 Repository 单元测试
- [x] Handler 层单元测试
- [x] Middleware 单元测试
- [x] E2E 集成测试（auth flow、org management、department management、multi-tenant isolation）

## ⏳ 待建设（按 Spec 编号）

### Spec 02: OAuth IdP（5-7 天）
- [ ] WebAuthn credential 数据模型
- [ ] OAuth client 数据模型
- [ ] OAuth token 数据模型
- [ ] WebAuthn 注册/登录 ceremony
- [ ] 钉钉 OAuth 完整实现（authorization_code 流程）
- [ ] OAuth2 端点（/oauth/authorize、/oauth/token、/oauth/revoke）
- [ ] Token 管理（RS256 JWT + refresh token）
- [ ] OAuth 中间件（替换现有 JWT 中间件）
- [ ] 移除密码登录（users 表删除 password_hash/salt）
- [ ] 前端登录页更新（WebAuthn + 钉钉按钮）

### Spec 03: MCP Server（7-10 天）
- [ ] MCP Server 核心（mark3labs/mcp-go）
- [ ] 基础数据 tools（org/user/department CRUD）
- [ ] 文件存储 tools（upload/download/presigned URL）
- [ ] 审计日志 tools（query/log）
- [ ] 数据查询 tools（query/mutate/subscribe）
- [ ] 权限校验（基于 OAuth token）
- [ ] Rate limiting（Redis）
- [ ] MCP HTTP 端点
- [ ] MCP resources（schema 文档）
- [ ] MCP prompts（Agent 调用指南）

### Spec 04: 应用运行时（10-14 天）
- [ ] Application 数据模型（新定义，非低代码的 application）
- [ ] ApplicationDeployment 数据模型
- [ ] RuntimeManager（Docker API 管理容器生命周期）
- [ ] Sandbox（容器隔离、网络隔离、卷管理）
- [ ] 资源配额（CPU/内存/数据库连接）
- [ ] 应用路由（外部请求 → 应用容器）
- [ ] 应用管理 API（create/deploy/start/stop/restart/delete/status/logs）
- [ ] 前端应用管理页面

### Spec 05: Skill/MCP 契约文档（3-5 天）
- [ ] MCP tools JSON Schema
- [ ] OAuth 流程文档
- [ ] 应用 SDK 文档
- [ ] 数据模型 Schema（org/user/department）
- [ ] 应用清单 Schema
- [ ] 示例应用（hello-world）

## ❌ 已移除（低代码资产）

- ~~FormDefinition、FormSubmission、FormDistribution~~
- ~~WorkflowDefinition、WorkflowInstance、WorkflowApproval~~
- ~~Application（低代码版）、ApplicationPage、WidgetLibrary~~
- ~~ReportDefinition~~
- ~~FormService、ApplicationService、WorkflowEngine、ReportService~~
- ~~ApplicationHandler、FormHandler~~
- ~~crudgen 代码生成器~~

## 📋 技术债务

- [ ] 统一密码哈希（当前 auth_service 用 SHA256，pkg/password 用 bcrypt，但 bcrypt 未被调用）
- [ ] JWT secret 配置化（当前硬编码在 pkg/jwt/jwt.go）
- [ ] Auth 中间件移除开发态 token fallback（`jwt_token_for_user_X_org_Y`）
- [ ] Permission 中间件挂载到路由（RequireOrgAdmin/RequireDeptManager 定义了但未用）
- [ ] 钉钉 Sync Service 完整实现（当前为骨架）
