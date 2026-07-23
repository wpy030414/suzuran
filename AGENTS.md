# Suzuran Cloud 开发规范

> 本文档定义代码风格、架构约定和最佳实践。

## 📐 代码风格

### Go 代码规范

1. **格式化**：使用 `gofmt`，缩进用 tab
2. **命名**：
   - 包名小写、单数（`service` 而非 `services`）
   - 导出标识符使用 CamelCase
   - 私有标识符使用 camelCase
3. **错误处理**：
   ```go
   if err != nil {
       return fmt.Errorf("failed to create org: %w", err)
   }
   ```
4. **Context 传递**：所有数据库/网络操作第一个参数必须是 `ctx context.Context`

### 目录结构约定

```
internal/
├── handler/      # HTTP 处理器（薄层，只做参数绑定）
├── service/      # 业务逻辑（核心，可测试）
├── repository/   # 数据访问层（GORM 操作）
├── model/        # GORM 模型定义
├── middleware/   # Gin 中间件
└── pkg/          # 工具包（jwt, redis, dingtalk）
```

**规则**：
- Handler 不得直接调用 Repository
- Service 不得直接访问 `*gin.Context`
- Model 只包含结构体定义，不含业务逻辑

## 🏛️ 架构原则

### 三层架构

```
Handler → Service → Repository → Database
```

| 层级 | 职责 | 示例 |
|------|------|------|
| Handler | 参数绑定、验证、HTTP 响应 | `auth_handler.go` |
| Service | 业务逻辑、事务管理 | `auth_service.go` |
| Repository | GORM CRUD 操作 | `org_repository.go` |

### 依赖注入

在 `main.go` 中显式构造：

```go
orgRepo := repository.NewOrgRepository(db)
orgService := service.NewOrgService(orgRepo, deptRepo, bondRepo)
orgHandler := provider.NewOrgHandler(orgService)
```

**禁止**使用全局变量或 init() 函数隐式初始化。

## 🔒 安全规范

### 租户隔离

所有查询必须包含 `org_id` 过滤：

```go
func (r *OrgUserBondRepository) GetByOrgID(ctx context.Context, orgID int) ([]*model.OrgUserBond, error) {
    var bonds []*model.OrgUserBond
    err := r.db.WithContext(ctx).Where("org_id = ?", orgID).Find(&bonds).Error
    return bonds, err
}
```

### SQL 注入防护

- **禁止**字符串拼接构建 SQL
- **必须**使用 GORM 参数化查询或 JSONB 操作

### JWT 验证

所有受保护路由必须经过 `middleware.Auth()`：

```go
protected := r.Group("/api")
protected.Use(middleware.Auth())
protected.Use(middleware.TenantContext())
```

## 🧪 测试规范

### 单元测试

- 文件命名：`{module}_test.go`
- 覆盖率目标：80%+
- 使用 `testify/assert` 和 `testify/require`

### 集成测试

- 文件位置：`backend/integration_test.go`
- 使用 SQLite in-memory 模拟 PostgreSQL
- 测试三端完整流程：登录 → 选择组织 → 执行业务操作


## 🚀 部署检查清单

- [ ] `.env` 中修改敏感配置（DB_PASSWORD、JWT_SECRET）
- [ ] 运行 `docker-compose up -d`
- [ ] 验证健康检查：`curl http://localhost:8888/health`
- [ ] 检查日志：`docker-compose logs -f backend`
