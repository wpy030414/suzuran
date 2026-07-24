# Suzuran Cloud 后端待办清单

> 本文档记录后端实现的完整进度，基于初始构思的 AGENT_PLAN.md 进行核对。

## ✅ 已完成部分

### Phase 1: 基础架构（100%）
- [x] Go 项目骨架（cmd、internal、pkg 目录结构）
- [x] GORM 模型定义（Org、User、OrgUserBond、Department 等 15 个模型）
- [x] Repository 层（14 个文件，完整 CRUD + 特殊查询）
- [x] Service 层（13 个服务：auth、org、department、form、workflow、report、notification、audit、app_page、agent_skill、dingtalk_sync）
- [x] Middleware 层（auth、tenant context、CORS、permissions、audit）
- [x] Handler 层（7 个 handler 文件，覆盖三端路由）
- [x] Pkg 层（jwt、password、redis、dingtalk client/bot_client）
- [x] Main.go（完整依赖注入 + 路由配置）
- [x] JWT 认证中间件 + Redis token 存储
- [x] 租户上下文中间件

### Phase 2: 核心业务模块（90%）
- [x] 服务商端 API（组织管理：CRUD + 表单管理）
- [x] 租户管理端 API（用户管理、部门管理、钉钉同步、文件上传）
- [x] 用户端 API（表单提交）
- [ ] 文件上传功能（MinIO 集成已存在，但未在 main.go 中完全接线）

### Phase 3: 低代码表单设计器（80%）
- [x] 表单定义 CRUD API
- [x] 表单 schema 存储（JSONB）
- [x] 动态表单提交 API
- [x] FormDistribution 分发机制
- [ ] 表单设计器 CLI 工具（生成 JSON schema）
- [ ] 表单渲染引擎（服务端渲染 HTML）

### Phase 4: 工作流引擎（70%）
- [x] 工作流定义 CRUD API
- [x] 流程实例管理
- [x] 节点状态机实现（WorkflowEngine.StartWorkflow/Approve）
- [ ] 审批流转逻辑（占位实现，approver 硬编码为 userID=1）
- [ ] 工作流定义导出工具（JSON/YAML）

### Phase 5: 报表与代码生成（60%）
- [x] 报表定义 CRUD API
- [x] 动态查询执行引擎（ReportService.ExecuteQuery）
- [x] Application Page Service（Vue template 支持）
- [x] Agent Skill Service（报表/表单模板生成）
- [ ] CRUD 代码生成器 CLI（`internal/crudgen/` 存在但未集成）
- [ ] 报表导出引擎（PDF/Excel 服务端生成）

## ❌ 缺失部分

### 基础设施
- [ ] **Docker Compose 配置**（PostgreSQL + Redis + MinIO + Backend）
- [ ] **数据库初始化脚本**（docs/sql/init.sql 建表语句 + 索引 + 示例数据）
- [ ] `.env.example` 环境变量模板
- [ ] `backend/Dockerfile` 后端容器化配置

### 钉钉集成
- [x] DingTalk Client（OAuth getuserinfo、department/list、user/simplelist）
- [x] DingTalk BotClient（Webhook markdown 通知）
- [ ] DingTalk Sync Service 完整实现（当前为骨架，需接入真实钉钉 API）

### 测试增强
- [ ] Handler 层高级测试（边界条件、并发场景）
- [ ] 性能基准测试（Benchmark）
- [ ] 压力测试（Load testing）

### 其他
- [ ] Scheduler 任务调度器（gocron v2 定时任务：清理过期数据、健康检查）
- [ ] PageExecutionEngine 四种动作完整实现（submit_form、start_workflow、approve、query_data）
- [ ] 审计日志完整链路（AuditMiddleware → AuditService → audit_logs 表）
- [ ] API 文档生成（Swagger/OpenAPI）
- [ ] 版本管理与 Changelog 自动化

## 🎯 下一步优先级

1. **补 Docker Compose + 数据库初始化 SQL** ← 当前正在做
2. **修复 main.go 中未接线的服务**（MinIO、Scheduler、PageExecutionEngine）
3. **完善 DingTalk Sync Service 真实实现**
4. **补充 Handler 层高级测试** ← 提升测试质量
5. **编写根目录 README.md** ← 接下来做
6. **编写 AGENTS.md 设计规范** ← 接下来做
7. **API 文档生成（Swagger/OpenAPI）** ← 文档化
