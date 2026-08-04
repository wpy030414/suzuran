# Hello World 示例应用

> Suzuran Cloud 最简示例应用

## 文件结构

```
hello-world/
├── app.json       # 应用清单
├── server.js      # 应用代码
├── package.json   # 依赖声明
└── README.md      # 本文件
```

## 运行流程

1. 平台根据 `app.json` 创建 Docker 容器（node:18-alpine）
2. 注入环境变量：`APP_ID`、`ORG_ID`、`PORT`、`MCP_ENDPOINT`、`OAUTH_TOKEN`
3. 执行 `node server.js` 启动应用
4. 应用监听 8080 端口
5. 外部请求通过 `/apps/<appId>/api/*` 代理到容器

## API 端点

### `GET /api/health`

健康检查，返回应用状态。

```json
{ "status": "ok", "appId": "...", "orgId": 1 }
```

### `GET /api/hello`

通过 MCP 调用平台数据，返回问候语和成员数。

```json
{
  "message": "Hello from Suzuran Cloud!",
  "appId": "...",
  "orgId": 1,
  "memberCount": 3
}
```

## 本地开发

```bash
npm install
node server.js
# 访问 http://localhost:8080/api/health
```

> 本地开发时需要手动设置环境变量 `MCP_ENDPOINT` 和 `OAUTH_TOKEN`。
