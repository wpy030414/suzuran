# 智能课表

课程管理系统的核心应用，实现课表的全生命周期管理。

## 功能

- **基础数据管理**：校区、班级、节次、科目、教师池
- **课表定义**：周课表录入（学期范围 × 七天 × 节次）
- **快照生成**：批量将课表展开为日粒度授课记录
- **课表查询**：按班级或教师维度查询周课表
- **调代课**：调课/代课申请与审批，自动更新快照
- **巡课**：按校区/年级/节次/日期查询当节课程

## 开发

```bash
# 安装依赖
cd frontend
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 部署

```bash
# 构建前端
cd frontend && npm run build

# 构建 Docker 镜像
cd ..
docker build -t course-schedule-smart .

# 运行容器
docker run -p 8080:8080 \
  -e APP_ID=your-app-id \
  -e ORG_ID=your-org-id \
  -e MCP_ENDPOINT=http://backend:8888/mcp \
  -e OAUTH_TOKEN=your-token \
  course-schedule-smart
```

## API

- `GET /api/health` - 健康检查
- `GET/POST/PUT/DELETE /api/campuses` - 校区管理
- `GET/POST/PUT/DELETE /api/classrooms` - 班级管理
- `GET/POST/PUT/DELETE /api/subjects` - 科目管理
- `GET/POST/PUT/DELETE /api/time-slots` - 节次管理
- `GET/POST/PUT/DELETE /api/teachers` - 教师池管理
- `GET/POST/PUT/DELETE /api/schedules` - 课表管理
- `GET /api/snapshots` - 快照查询
- `POST /api/snapshots/incubate` - 批量生成快照
- `POST /api/snapshots/clean` - 清理快照
- `GET/POST /api/substitutions` - 调代课管理
- `POST /api/substitutions/:id/approve` - 审批调代课
- `POST /api/inspections` - 巡课查询
