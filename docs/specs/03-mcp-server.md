# Spec 03: MCP Server（数据共享层）

> 平台暴露严格的 MCP Server 契约，应用通过 MCP 读写共享数据

## 目标

实现完整的 MCP Server，提供数据访问工具（tools）、资源（resources）和提示模板（prompts）。应用通过 MCP 读写共享数据，这是唯一的数据访问通道。

## 技术选型

| 组件 | 选型 | 原因 |
|------|------|------|
| MCP SDK | `mark3labs/mcp-go` | Go 生态最成熟的 MCP 实现 |
| 传输层 | HTTP + SSE | 兼容性好，适合 Web 应用 |
| 权限校验 | OAuth token | 每个 tool 调用都检查 token |

## MCP Tools 清单

### 基础数据（org/user/department）

| Tool | 描述 | 权限 |
|------|------|------|
| `org.get` | 获取组织信息 | 需要 org_id scope |
| `org.list_users` | 获取组织内用户列表 | 需要 org_id scope |
| `org.create_user` | 创建用户 | 需要 org_admin scope |
| `org.update_user` | 更新用户信息 | 需要 org_admin scope |
| `org.delete_user` | 删除用户 | 需要 org_admin scope |
| `org.list_departments` | 获取部门列表 | 需要 org_id scope |
| `org.create_department` | 创建部门 | 需要 org_admin scope |
| `org.update_department` | 更新部门 | 需要 org_admin scope |
| `org.delete_department` | 删除部门 | 需要 org_admin scope |
| `org.get_user_departments` | 获取用户所属部门 | 需要 org_id scope |
| `org.add_user_to_department` | 添加用户到部门 | 需要 org_admin scope |
| `org.remove_user_from_department` | 从部门移除用户 | 需要 org_admin scope |

### 文件存储

| Tool | 描述 | 权限 |
|------|------|------|
| `file.upload` | 上传文件 | 需要 org_id scope |
| `file.download` | 下载文件 | 需要 org_id scope |
| `file.get_presigned_url` | 获取预签名 URL | 需要 org_id scope |
| `file.delete` | 删除文件 | 需要 org_admin scope |
| `file.list` | 列出文件 | 需要 org_id scope |

### 审计日志

| Tool | 描述 | 权限 |
|------|------|------|
| `audit.query` | 查询审计日志 | 需要 org_admin scope |
| `audit.log` | 记录审计日志 | 自动（所有 tool 调用都会记录） |

### 数据查询（跨应用共享数据）

| Tool | 描述 | 权限 |
|------|------|------|
| `data.query` | 执行查询（只读） | 需要对应数据的 scope |
| `data.mutate` | 执行变更（写） | 需要对应数据的 scope + org_admin |
| `data.subscribe` | 订阅数据变更 | 需要对应数据的 scope |

## 实现清单

### 后端

#### 1. MCP Server 核心

**`internal/mcp/server.go`**：
```go
type MCPServer struct {
    tools     map[string]MCPTool
    resources map[string]MCPResource
    prompts   map[string]MCPPrompt
    db        *gorm.DB
    redis     *redis.Client
    minio     *minio.Client
}

func (s *MCPServer) RegisterTool(name string, tool MCPTool)
func (s *MCPServer) HandleRequest(ctx context.Context, req *MCPRequest) (*MCPResponse, error)
func (s *MCPServer) StartHTTPServer(addr string) error
```

**`internal/mcp/tool.go`**：
```go
type MCPTool interface {
    Name() string
    Description() string
    InputSchema() json.RawMessage
    OutputSchema() json.RawMessage
    Execute(ctx context.Context, input map[string]interface{}) (map[string]interface{}, error)
}
```

#### 2. Tool 实现

**`internal/mcp/tools/org_tools.go`**：
- `OrgGetTool`、`OrgListUsersTool`、`OrgCreateUserTool` 等
- 每个 tool 内部调用 Service 层，不直接访问 Repository

**`internal/mcp/tools/file_tools.go`**：
- `FileUploadTool`、`FileDownloadTool`、`FileGetPresignedURLTool` 等

**`internal/mcp/tools/audit_tools.go`**：
- `AuditQueryTool`、`AuditLogTool`

**`internal/mcp/tools/data_tools.go`**：
- `DataQueryTool`、`DataMutateTool`、`DataSubscribeTool`

#### 3. 权限校验

**`internal/mcp/auth.go`**：
```go
func (s *MCPServer) ValidateToken(tokenString string) (*Claims, error)
func (s *MCPServer) CheckScope(claims *Claims, requiredScope string) error
func (s *MCPServer) CheckOrgAccess(claims *Claims, orgID int) error
```

每个 tool 执行前都调用这些函数做权限校验。

#### 4. 审计日志

**`internal/mcp/audit.go`**：
```go
func (s *MCPServer) LogToolCall(claims *Claims, toolName string, input map[string]interface{}, output map[string]interface{}, err error)
```

所有 tool 调用都记录审计日志（谁、什么时候、调了什么、结果如何）。

#### 5. Rate Limiting

**`internal/mcp/ratelimit.go`**：
```go
func (s *MCPServer) CheckRateLimit(claims *Claims, toolName string) error
```

基于 Redis 实现 rate limiting（每用户每分钟 100 次调用）。

#### 6. HTTP 端点

**`internal/handler/mcp_handler.go`**：
- `POST /mcp`：MCP 请求入口
- `GET /mcp/tools`：列出所有 tools
- `GET /mcp/resources`：列出所有 resources
- `GET /mcp/prompts`：列出所有 prompts

### MCP Resources

**`internal/mcp/resources/schema_resources.go`**：
- `schema://org`：组织数据模型 JSON Schema
- `schema://user`：用户数据模型 JSON Schema
- `schema://department`：部门数据模型 JSON Schema

应用可以读取这些 schema 了解数据结构。

### MCP Prompts

**`internal/mcp/prompts/data_query_prompts.go`**：
- `prompt://query-users`：如何查询用户列表
- `prompt://query-departments`：如何查询部门列表

帮助 Agent 理解如何调用 MCP tools。

## 完成标准

- [ ] MCP Server 能启动并响应请求
- [ ] 所有基础数据 tools 可用（org/user/department CRUD）
- [ ] 所有文件存储 tools 可用（upload/download/presigned URL）
- [ ] 所有审计日志 tools 可用（query/log）
- [ ] 数据查询 tools 可用（query/mutate/subscribe）
- [ ] 权限校验生效（无 token 不能调用，scope 不对不能调用）
- [ ] 审计日志记录所有 tool 调用
- [ ] Rate limiting 生效（超出限制返回 429）
- [ ] MCP tools 列表 API 可用（`GET /mcp/tools`）
- [ ] 单元测试覆盖所有 tools
- [ ] 集成测试覆盖完整流程（获取 token → 调用 tool → 验证结果）

## 安全注意事项

- 所有 tool 调用必须验证 OAuth token
- 所有 tool 调用必须检查 scope
- 文件存储按 org_id 隔离（MinIO bucket 路径）
- 数据查询必须检查数据权限（应用只能访问自己被授权的数据）
- Rate limiting 防止滥用

## 预计工作量

7-10 天（Agent 执行）
