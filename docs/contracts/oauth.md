# OAuth 流程

> 版本：v1.0.0

Suzuran Cloud 平台使用自建 OAuth IdP，只支持 WebAuthn（Passkey）和钉钉 OAuth 登录，不支持密码登录。

## OAuth 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/oauth/webauthn/register/begin` | POST | 开始 WebAuthn 注册 |
| `/oauth/webauthn/register/finish` | POST | 完成 WebAuthn 注册 |
| `/oauth/webauthn/login/begin` | POST | 开始 WebAuthn 登录 |
| `/oauth/webauthn/login/finish` | POST | 完成 WebAuthn 登录 |
| `/oauth/dingtalk/authorize` | GET | 钉钉授权跳转 |
| `/oauth/dingtalk/callback` | GET | 钉钉回调 |
| `/oauth/session/token` | POST | 会话令牌交换（登录→token 桥梁） |
| `/oauth/authorize` | GET | OAuth2 授权端点 |
| `/oauth/token` | POST | OAuth2 token 端点 |
| `/oauth/revoke` | POST | 撤销 token |
| `/.well-known/openid-configuration` | GET | OAuth2 发现文档 |

## 获取 Token

### 方式一：WebAuthn 登录

```
1. POST /oauth/webauthn/login/begin
   Body: { "identifier": "admin@example.com" }
   Response: { "sessionId": "...", "options": {...} }

2. 浏览器调用 navigator.credentials.get({ publicKey: options })

3. POST /oauth/webauthn/login/finish
   Body: { "sessionId": "...", "response": <serialized assertion> }
   Response: { "sessionId": "...", "userId": 1, "availableOrgs": [{...}] }

4. POST /oauth/session/token
   Body: { "sessionId": "...", "orgId": 1 }
   Response: {
     "access_token": "eyJ...",
     "token_type": "Bearer",
     "expires_in": 900,
     "refresh_token": "...",
     "scope": "openid org.read org.write"
   }
```

### 方式二：钉钉 OAuth 登录

```
1. GET /oauth/dingtalk/authorize?redirect_uri=https://your-app/callback
   Response: { "authorizeUrl": "https://login.dingtalk.com/..." }

2. 重定向用户到 authorizeUrl，钉钉授权后回调到 redirect_uri

3. 回调页调用后端:
   GET /oauth/dingtalk/callback?code=...&state=...
   Response: { "sessionId": "...", "userId": 2, "availableOrgs": [{...}] }

4. POST /oauth/session/token
   Body: { "sessionId": "...", "orgId": 2 }
   Response: { "access_token": "...", "refresh_token": "..." }
```

## 刷新 Token

access_token 有效期 15 分钟，过期后用 refresh_token 刷新：

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=<refresh_token>&client_id=suzuran-spa
```

响应：

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "<new_refresh_token>",
  "scope": "openid org.read org.write"
}
```

> refresh_token 每次刷新都会轮换（旧 token 失效），有效期 30 天。

## 撤销 Token

```
POST /oauth/revoke
Content-Type: application/json

{ "token": "<refresh_token>" }
```

## Token 格式

- **access_token**：RS256 签名的 JWT，payload 包含 `userId`、`orgId`、`role`、`scopes`
- **refresh_token**：随机字符串，SHA-256 哈希存储在服务端

## 支持的 Scopes

| Scope | 说明 |
|-------|------|
| `openid` | 基础认证 |
| `org.read` | 读取组织/用户/部门数据 |
| `org.write` | 写入组织/用户/部门数据 |
| `file.read` | 读取文件 |
| `file.write` | 上传/删除文件 |
| `audit.read` | 查询审计日志 |
| `audit.write` | 记录审计日志 |

## 使用 Token 调用 MCP

```bash
curl -X POST http://localhost:8888/mcp \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "org.get",
      "arguments": { "orgId": 1 }
    }
  }'
```
