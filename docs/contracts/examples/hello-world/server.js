import { createApp } from '@suzuran/sdk'

const app = createApp({
  name: 'hello-world',
  port: 8080,
})

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', appId: req.appId, orgId: req.orgId })
})

// 通过 MCP 调用平台数据
app.get('/api/hello', async (req, res) => {
  const members = await app.mcp.call('user.list_members', { orgId: req.orgId })
  res.json({
    message: 'Hello from Suzuran Cloud!',
    appId: req.appId,
    orgId: req.orgId,
    memberCount: members.length,
  })
})

app.start()
