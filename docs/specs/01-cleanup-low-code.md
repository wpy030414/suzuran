# Spec 01: 清理低代码资产

> 移除所有低代码相关代码，保留多租户基座

## 目标

删除拖拽设计器、工作流引擎、报表设计器、动态表单渲染等低代码资产，只保留多租户四件套（org/user/bond/dept）+ JWT + tenant 中间件 + MinIO/审计等通用设施。

## 保留清单

### 后端

- `model/org.go`、`user.go`、`org_user_bond.go`、`department.go`
- `model/audit_log.go`、`dingtalk_sync_log.go`
- `repository/org_repository.go`、`user_repository.go`、`org_user_bond_repository.go`、`department_repository.go`
- `repository/dingtalk_sync_log_repository.go`
- `service/auth_service.go`、`org_service.go`、`user_service.go`、`department_service.go`
- `service/dingtalk_sync_service.go`（补全实现）
- `handler/auth/`、`handler/provider/org_handler.go`、`handler/provider/org_member_handler.go`
- `handler/tenant/user_handler.go`、`handler/tenant/department_handler.go`
- `handler/common/org_mgmt_handler.go`
- `handler/file_handler.go`、`handler/system_handler.go`、`handler/log_handler.go`
- `middleware/auth.go`、`tenant.go`、`permission.go`、`audit.go`、`cors.go`
- `storage/minio.go`、`file_storage.go`
- `pkg/jwt/`、`pkg/redis/`、`pkg/password/`、`pkg/dingtalk/`

### 前端

- `views/Login.vue`、`Home.vue`、`Forbidden.vue`、`NotFound.vue`
- `views/provider/Dashboard.vue`、`Organizations.vue`、`OrgDetail.vue`
- `views/tenant/Dashboard.vue`、`UserManagement.vue`、`DepartmentManagement.vue`
- `views/user/Dashboard.vue`
- `stores/auth.ts`
- `api/client.ts`、`org.ts`、`user.ts`、`department.ts`
- `layouts/ProviderLayout.vue`、`TenantLayout.vue`、`UserLayout.vue`
- `components/org/`（DepartmentManager、MemberManager 等）
- `router/index.ts`

## 删除清单

### 后端

- ❌ `model/application.go`、`application_page.go`、`form_definition.go`、`form_submission.go`、`form_distribution.go`、`form_and_view.go`、`report_definition.go`、`widget_library.go`、`workflow_definition.go`、`workflow_instance.go`、`workflow_approval.go`
- ❌ `repository/application_repository.go`、`application_page_repository.go`、`form_definition_repository.go`、`form_submission_repository.go`、`form_distribution_repository.go`、`widget_library_repository.go`、`report_definition_repository.go`、`workflow_definition_repository.go`、`workflow_instance_repository.go`、`workflow_approval_repository.go`
- ❌ `service/form_service.go`、`application_service.go`、`application_page_service.go`、`report_service.go`、`workflow_engine.go`、`agent_skill_service.go`
- ❌ `handler/provider/application_handler.go`
- ❌ `handler/tenant/form_handler.go`
- ❌ `internal/crudgen/`（代码生成器）

### 前端

- ❌ `views/provider/FormDesigner.vue`、`Applications.vue`、`ApplicationDetail.vue`
- ❌ `views/user/FormSubmission.vue`
- ❌ `components/form-designer/`（整个目录）
- ❌ `components/application/DistributeDialog.vue`
- ❌ `components/view/ViewCreateDialog.vue`
- ❌ `stores/form.ts`、`application.ts`
- ❌ `api/form.ts`、`application.ts`、`view.ts`
- ❌ `types/form-schema.ts`、`view-config.ts`

### 数据库

- ❌ 表：`applications`、`application_pages`、`form_definitions`、`form_submissions`、`form_distributions`、`forms`、`views`、`report_definitions`、`widget_library`、`workflow_definitions`、`workflow_instances`、`workflow_approvals`

## 完成标准

- [ ] 所有低代码相关代码文件已删除
- [ ] `main.go` 中移除了所有低代码相关的依赖注入和路由注册
- [ ] `docs/sql/init.sql` 中移除了低代码相关的建表语句
- [ ] 后端能正常编译（`go build ./...`）
- [ ] 后端单元测试全部通过（`go test ./...`）
- [ ] 前端能正常构建（`npm run build`）
- [ ] 前端 E2E 测试通过（移除低代码相关的测试用例）

## 风险

- 删除代码可能导致编译错误，需要逐个修复依赖
- 前端路由需要更新，移除低代码相关路由
- 测试用例需要更新，移除低代码相关的测试

## 预计工作量

2-3 天（Agent 执行）
