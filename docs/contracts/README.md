# Suzuran Cloud 契约文档

> 版本：v1.1.0 | 更新日期：2026-08-13

本目录包含平台对外发布的严格契约文档，Agent 据此开发应用，契约一旦发布即稳定。

## 契约清单

| 文档 | 说明 |
|------|------|
| [MCP Tools](mcp-tools.json) | 所有 MCP 工具的输入/输出 JSON Schema |
| [OAuth 流程](oauth.md) | WebAuthn + 钉钉 OAuth 登录流程 |
| [应用 SDK](app-sdk.md) | 应用开发 SDK 用法 |
| [应用清单](app-manifest.json) | 应用清单（app.json）JSON Schema |
| [数据模型 - Org](schemas/org.json) | Organization JSON Schema |
| [数据模型 - User](schemas/user.json) | User JSON Schema |
| [数据模型 - Department](schemas/department.json) | Department JSON Schema |
| [数据模型 - Application](schemas/application.json) | Application JSON Schema |
| [数据模型 - WorkflowDefinition](schemas/workflow_definition.json) | 流程定义 JSON Schema |
| [数据模型 - WorkflowInstance](schemas/workflow_instance.json) | 流程实例 JSON Schema |
| [数据模型 - WorkflowTask](schemas/workflow_task.json) | 流程任务 JSON Schema |
| [示例应用](examples/hello-world/) | hello-world 示例应用 |

## 版本控制

契约采用语义化版本（SemVer）：

- **MAJOR**（1.0.0 → 2.0.0）：不兼容的变更（删除 tool、修改输入/输出格式）
- **MINOR**（1.0.0 → 1.1.0）：向后兼容的新增（新增 tool、新增字段）
- **PATCH**（1.0.0 → 1.0.1）：向后兼容的修复（文档修正、示例更新）

### v1.1.0 变更

- 新增 11 个 `workflow.*` MCP 工具（流程定义/实例/任务管理）
- 新增 3 个数据模型 schema：WorkflowDefinition / WorkflowInstance / WorkflowTask
- 见 [Spec 06](../specs/06-workflow-engine.md)

## 快速开始

1. 阅读 [OAuth 流程](oauth.md) 获取 access token
2. 阅读 [MCP Tools](mcp-tools.json) 了解可用的数据操作
3. 参考 [应用 SDK](app-sdk.md) 编写应用代码
4. 按 [应用清单](app-manifest.json) 编写 `app.json`
5. 参考 [hello-world 示例](examples/hello-world/) 完整流程
