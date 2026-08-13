# Spec 06: 流程引擎（Workflow Engine）

> 平台级流程/审批能力，应用通过 MCP 工具调用，定义与执行在平台侧

## 目标

为平台所有应用提供统一的流程/审批能力。6 个应用场景中 5 个需要审批流（行政审批、教师考核、学生关爱等），
若每个应用自建流程引擎会造成巨大重复劳动。本 spec 在平台层实现一个 JSON 定义 + MCP 驱动的程序化流程引擎
（**不是**可视化流程编辑器——PRD 已明确禁止），复用现有 MCP 工具管道、通知服务、审计日志。

## 设计决策

**流程引擎作为平台级能力（非应用自建）**，理由：
- 5/6 场景需要流程，自建成本高且不一致
- 平台已有 MCP 管道（鉴权/限流/审计）、NotificationService（含 `SendApprovalNotification` 桩）
- 与架构约束一致：流程状态存平台 DB，受 `org_id` 隔离
- 应用通过 SDK → MCP 工具定义/启动/审批流程，符合"应用只用 MCP 访问数据"的硬约束

**架构定位**：

```
App (via SDK) → MCP Tools (workflow.*) → WorkflowService → DB (workflow_*)
                                          ↓
                                   NotificationService（审批通知）
```

## 技术选型

| 组件 | 选型 | 原因 |
|------|------|------|
| 流程定义 | JSON（存储为 JSONB） | 可序列化、Agent 友好、无需 DSL 解析器 |
| 状态机 | 手写 Go 状态机 | 流程类型有限（start/approval/condition/end），不值得引入框架 |
| 条件评估 | 手写轻量表达式 | 仅比较运算，不引入外部表达式引擎 |
| 持久化 | PostgreSQL + GORM | 复用现有 DB，`org_id` 隔离 |
| 通知 | 复用 NotificationService | 已有 `SendApprovalNotification` 桩 |
| 审计/限流 | 复用 WrapToolHandler 管道 | 与其他 MCP 工具一致 |

## 流程定义格式

```json
{
  "name": "请假审批",
  "description": "员工请假多级审批流程",
  "variables": {
    "leaveDays": "number",
    "leaveType": "string"
  },
  "steps": [
    {
      "name": "submit",
      "type": "start",
      "next": "manager_approve"
    },
    {
      "name": "manager_approve",
      "type": "approval",
      "assignee": { "type": "role", "value": "dept_manager" },
      "on_approve": { "goto": "check_days" },
      "on_reject": { "goto": "end_rejected" }
    },
    {
      "name": "check_days",
      "type": "condition",
      "conditions": [
        { "when": "leaveDays > 3", "goto": "director_approve" },
        { "otherwise": "end_approved" }
      ]
    },
    {
      "name": "director_approve",
      "type": "approval",
      "assignee": { "type": "role", "value": "org_admin" },
      "on_approve": { "goto": "end_approved" },
      "on_reject": { "goto": "end_rejected" }
    },
    { "name": "end_approved", "type": "end", "result": "approved" },
    { "name": "end_rejected", "type": "end", "result": "rejected" }
  ]
}
```

### 步骤类型（v1）

| 类型 | 行为 |
|------|------|
| `start` | 流程起点，自动流转到 `next` |
| `approval` | 审批节点，等待人工 approve/reject，创建 task 并通知 |
| `condition` | 条件分支，基于变量值路由到命中的 `goto` |
| `end` | 终点，标记 `result`（approved/rejected/cancelled） |

### 指派方式（v1）

| 方式 | 语义 |
|------|------|
| `{ "type": "user", "value": 42 }` | 指定 user_id |
| `{ "type": "role", "value": "dept_manager" }` | 同 org 下所有匹配角色用户都收到任务 |

## 数据模型

### `workflow_definitions`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | int (PK) | 自增 |
| org_id | int (NOT NULL, INDEX) | 租户隔离 |
| name | string | 流程名 |
| description | string | 描述 |
| definition | JSONB | 流程定义 JSON |
| version | int | 版本号 |
| status | string | active / archived |
| created_by | int | 创建者 user_id |
| created_at, updated_at | timestamp | |

### `workflow_instances`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | int (PK) | 自增 |
| org_id | int (NOT NULL, INDEX) | 租户隔离 |
| definition_id | int (FK) | 关联定义 |
| status | string | running / approved / rejected / cancelled |
| current_step | string | 当前步骤名 |
| variables | JSONB | 流程变量（业务数据） |
| created_by | int | 发起人 |
| created_at, updated_at | timestamp | |
| completed_at | timestamp | 完成时间 |

### `workflow_tasks`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | int (PK) | 自增 |
| org_id | int (NOT NULL, INDEX) | 租户隔离 |
| instance_id | int (FK) | 关联实例 |
| step_name | string | 步骤名 |
| assignee_id | int | 被指派人 |
| status | string | pending / approved / rejected |
| comment | string | 审批意见 |
| created_at, acted_at | timestamp | |

## MCP 工具设计

| 工具 | 说明 | Scope |
|------|------|-------|
| `workflow.define` | 创建/更新流程定义 | `workflow.write` |
| `workflow.get_definition` | 获取定义详情 | `workflow.read` |
| `workflow.list_definitions` | 列出定义 | `workflow.read` |
| `workflow.archive` | 归档定义 | `workflow.write` |
| `workflow.start` | 启动实例 | `workflow.write` |
| `workflow.get_instance` | 获取实例（含任务历史） | `workflow.read` |
| `workflow.list_instances` | 列出实例（按状态过滤） | `workflow.read` |
| `workflow.cancel` | 取消运行中实例 | `workflow.write` |
| `workflow.list_tasks` | 列出待办/已办任务 | `workflow.read` |
| `workflow.approve` | 审批通过 | `workflow.write` |
| `workflow.reject` | 审批拒绝 | `workflow.write` |

## 状态机

```
定义: draft → active → archived
实例: running → approved / rejected / cancelled
任务: pending → approved / rejected
```

## 核心服务逻辑

`WorkflowService` 关键方法：

- `StartInstance(ctx, orgID, defID, variables, createdBy)` — 创建实例，从 `start` 自动推进到首个 approval/condition，为 approval 节点创建 task 并发通知
- `ApproveTask(ctx, orgID, taskID, userID, comment)` — 标记 task approved，推进到下一步（condition 自动评估，approval 创建新 task）
- `RejectTask(ctx, orgID, taskID, userID, comment)` — 标记 task rejected，跳到 reject 分支
- `advanceStep(ctx, instance, stepName)` — 内部方法，递归推进直到遇到 approval 或 end

### 条件评估

手写轻量评估器 `evaluateCondition(expr string, vars map[string]interface{}) (bool, error)`：
- 支持比较运算：`>`, `<`, `>=`, `<=`, `==`, `!=`
- 变量引用：`leaveDays`、`leaveType`
- 值类型：number、string

## 实现清单

### 后端

#### 1. Model 层 — `internal/model/workflow.go`
- `WorkflowDefinition`、`WorkflowInstance`、`WorkflowTask` 三个 GORM struct，均含 `OrgID`

#### 2. Repository 层 — `internal/repository/workflow_*.go`
- `WorkflowDefinitionRepository` — CRUD + `ListByOrgID` + `Archive`
- `WorkflowInstanceRepository` — CRUD + `ListByOrgID`（按状态过滤）
- `WorkflowTaskRepository` — `Create`、`GetByID`、`Update`、`ListPendingByAssignee`、`ListByInstance`

#### 3. Service 层 — `internal/service/workflow_service.go`
- 状态机 + 条件评估器 + 通知集成
- 依赖：三个 repository + `NotificationService` + `UserService`（按角色解析指派人）

#### 4. MCP Tools — `internal/mcp/tools/workflow_tools.go`
- 11 个工具，遵循现有 tool group 模式（struct + RegisterTools + handler methods）
- 接入 `WrapToolHandler`（鉴权/限流/审计自动生效）

#### 5. 注册接入
- `tools/register.go` — `RegisterAllTools` 增加 `workflowService` 参数
- `cmd/api/main.go` — 初始化 workflow 依赖链 + AutoMigrate 三张表

#### 6. 测试
- `workflow_service_test.go` — 状态机全路径（线性审批、条件分支、拒绝、取消）
- 表驱动测试 + SQLite in-memory（复用 `setupTestDB`，需 AutoMigrate workflow 表）

### 契约

- `docs/contracts/schemas/workflow_definition.json`、`workflow_instance.json`、`workflow_task.json`
- `docs/contracts/mcp-tools.json` 增加 11 个 workflow 工具
- 契约版本 v1.0.0 → v1.1.0（向后兼容新增）

## 安全注意

- 所有表含 `org_id`，所有查询带 `WHERE org_id = ?`
- `workflow.approve/reject` 必须校验 `assignee_id == 调用者 user_id`
- `workflow.cancel` 仅发起人或 org_admin 可执行
- 定义 JSON 在保存前做结构校验（步骤名唯一、start 唯一、goto 目标存在、end 节点有 result）

## 完成标准

- [ ] 三张表 + AutoMigrate
- [ ] WorkflowService 全路径单元测试通过
- [ ] 11 个 MCP 工具注册并可调用
- [ ] 通过 MCP 完整走一遍"请假审批"流程（define → start → list_tasks → approve → get_instance）
- [ ] 所有 workflow 操作产生审计记录
- [ ] 契约 schema + mcp-tools.json 更新，版本升至 v1.1.0

## 预估工作量

- Model + Repository：0.5 天
- Service + 条件评估：1.5 天
- MCP Tools + 接入：1 天
- 测试 + 契约：1 天
