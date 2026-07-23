# Suzuran Cloud ☁️

> 一个基于 Go + Gin + PostgreSQL + Redis + MinIO 的多租户低代码平台

## 🎯 项目简介

Suzuran Cloud 是一个企业级多租户 SaaS 平台，支持服务商、租户管理员、普通用户三端隔离访问。核心能力包括：

- **多租户架构**：共享数据库 + org_id 字段隔离，租户间数据完全独立
- **低代码表单**：拖拽式设计器，JSONB schema 存储，动态提交与查询
- **工作流引擎**：可视化流程编排，状态机驱动的审批流转
- **报表设计器**：完整 Vue template，支持数据展示、表单写入、流程发起
- **钉钉集成**：OAuth 认证、组织架构同步、Bot 消息通知
- **文件存储**：MinIO S3 兼容，支持大文件上传/下载/预签名 URL
- **审计日志**：自动记录所有操作，支持异步写入与查询

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Go 1.26 + Gin + GORM + go-redis + minio-go |
| **数据库** | PostgreSQL 15 (JSONB + GIN 索引) |
| **缓存** | Redis 7 (JWT token 存储) |
| **对象存储** | MinIO (S3 兼容) |
| **前端** | Vue 3 + Vite + Vuetify + Pinia（三端独立应用） |
| **容器化** | Docker Compose AIO |

## 📦 快速开始

### 前置条件

- Docker & Docker Compose v2+
- Go 1.26+（可选，用于本地开发）

### 启动服务

```bash
# 克隆仓库
git clone https://github.com/xrl/suzuran-cloud.git
cd suzuran-cloud

# 复制环境变量
cp .env.example .env

# 启动所有服务
docker-compose up -d
```

### 访问端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Backend API | `8888` | Go + Gin RESTful API |
| PostgreSQL | `5432` | 主数据库 |
| Redis | `6379` | Token 缓存 |
| MinIO Console | `9001` | 对象存储管理界面 |
| Provider Portal | `3001` | 服务商端（待实现） |
| Tenant Admin | `3002` | 租户管理端（待实现） |
| User Portal | `3003` | 用户端（待实现） |

## 📚 API 文档

### 认证流程

```
POST /api/auth/login → 获取预登录 token 和组织列表
POST /api/auth/select-org → 选择组织并获取 JWT
```

### 三端路由

| 前缀 | 角色 | 权限 |
|------|------|------|
| `/api/provider/*` | 服务商 | 管理所有租户、创建/分发应用 |
| `/api/tenant/*` | 租户管理员 | 管理本组织用户、部门、查看报表 |
| `/api/user/*` | 普通用户 | 提交表单、查看个人数据 |

完整 API 文档见 [docs/api/README.md](docs/api/README.md)

## 🗂️ 项目结构

```
suzuran-cloud/
├── backend/                    # Go 后端
│   ├── cmd/api/main.go        # 入口文件（DI + 路由）
│   ├── internal/
│   │   ├── handler/           # HTTP 处理器
│   │   ├── service/           # 业务逻辑
│   │   ├── repository/        # 数据访问层
│   │   ├── model/             # GORM 模型
│   │   ├── middleware/        # 中间件
│   │   ├── pkg/               # 工具包（jwt, redis, dingtalk）
│   │   └── storage/           # MinIO 封装
│   └── go.mod
├── docs/
│   ├── sql/init.sql           # 数据库初始化脚本
│   └── backend/TODO.md        # 后端待办清单
├── frontend/                   # 前端三端（待实现）
│   ├── provider-portal/
│   ├── tenant-admin-portal/
│   └── user-portal/
├── docker-compose.yml          # AIO 编排
└── README.md                   # 本文档
```

## 🔐 安全特性

- **JWT 认证**：HS256 签名，24h TTL，Redis 黑名单
- **租户隔离**：中间件强制注入 org_id，Repository 层统一过滤
- **密码加密**：bcrypt 哈希，加盐存储
- **审计日志**：所有写操作自动记录到 audit_logs 表
- **CORS 配置**：默认允许所有来源，生产环境需限制

## 🧪 测试

```bash
cd backend
go test ./... -v -race
```
