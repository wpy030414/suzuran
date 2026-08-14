import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'report-portal', port: 8103 })

const frontendDist = join(__dirname, 'frontend', 'dist')

// ─── 静态文件服务 ───
app.get('/', (req, res) => {
  const indexPath = join(frontendDist, 'index.html')
  if (existsSync(indexPath)) {
    res.header('Content-Type', 'text/html')
    res.send(readFileSync(indexPath, 'utf-8'))
  } else {
    res.status(404).send('Frontend not built')
  }
})

app.get('/assets/:file', (req, res) => {
  const filePath = join(frontendDist, 'assets', req.params.file)
  if (existsSync(filePath)) {
    const ext = req.params.file.split('.').pop()
    const mimeTypes = { js: 'application/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', woff2: 'font/woff2' }
    res.header('Content-Type', mimeTypes[ext] || 'application/octet-stream')
    res.send(readFileSync(filePath))
  } else {
    res.status(404).send('Not found')
  }
})

app.get('/:path', (req, res) => {
  if (req.params.path.startsWith('api/')) return
  const indexPath = join(frontendDist, 'index.html')
  if (existsSync(indexPath)) {
    res.header('Content-Type', 'text/html')
    res.send(readFileSync(indexPath, 'utf-8'))
  } else {
    res.status(404).send('Not found')
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', appId: req.appId, orgId: req.orgId })
})

// ─── 数据表定义 ───
const TABLES = {
  registered_pages: [
    { name: 'icon_url', type: 'text', nullable: true },
    { name: 'app_name', type: 'text' },
    { name: 'description', type: 'text', nullable: true },
    { name: 'report_url', type: 'text' },
    { name: 'weight', type: 'integer' },
    { name: 'category_id', type: 'integer', nullable: true },
    { name: 'is_active', type: 'boolean' },
    { name: 'registered_by', type: 'integer', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'created_at', type: 'timestamp' },
    { name: 'updated_at', type: 'timestamp' }
  ],
  page_categories: [
    { name: 'name', type: 'text' },
    { name: 'icon', type: 'text', nullable: true },
    { name: 'description', type: 'text', nullable: true },
    { name: 'sort_order', type: 'integer' },
    { name: 'is_active', type: 'boolean' }
  ],
  page_access_logs: [
    { name: 'page_id', type: 'integer' },
    { name: 'user_id', type: 'integer' },
    { name: 'accessed_at', type: 'timestamp' }
  ],
  page_favorites: [
    { name: 'user_id', type: 'integer' },
    { name: 'page_id', type: 'integer' }
  ],
  page_dashboards: [
    { name: 'name', type: 'text' },
    { name: 'description', type: 'text', nullable: true },
    { name: 'page_ids', type: 'jsonb', nullable: true },
    { name: 'created_by', type: 'integer', nullable: true },
    { name: 'created_at', type: 'timestamp' },
    { name: 'updated_at', type: 'timestamp' }
  ]
}

// ─── 角色权限矩阵 ───
const ROLE_PERMISSIONS = {
  admin:   { manage_pages: true, manage_categories: true, view_pending: true, view_portal: true, suggest_page: true, manage_dashboards: true },
  teacher: { manage_pages: false, manage_categories: false, view_pending: false, view_portal: true, suggest_page: true, manage_dashboards: false }
}

// ─── 初始化 ───
app.onStart(async () => {
  for (const [tableName, columns] of Object.entries(TABLES)) {
    try {
      await app.mcp.call('data.create_table', { orgId: app.orgId, tableName, columns })
      console.log(`[init] Table '${tableName}' ready`)
    } catch (e) {
      console.log(`[init] Table '${tableName}' already exists`)
    }
  }
})

// ─── 业务辅助函数 ───

/** 获取用户角色 */
function getUserRole(req) {
  return req.headers['x-user-role'] || req.query.role || 'teacher'
}

/** 检查角色权限 */
function checkPermission(role, action) {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.teacher
  return perms[action] || false
}

/** URL 格式校验：必须以 http:// 或 https:// 或 / 开头 */
function isValidUrl(url) {
  if (!url) return false
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')
}

/** 整数校验 */
function isInteger(val) {
  return Number.isInteger(Number(val)) && !isNaN(Number(val))
}

// ═══════════════════════════════════════
// 页面分类 API
// ═══════════════════════════════════════

app.get('/api/categories', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'page_categories',
      where: { is_active: true },
      orderBy: 'sort_order ASC',
      limit: 200
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/categories', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_categories')) {
      return res.status(403).json({ error: '仅管理员可以管理分类' })
    }

    const { name, icon, description, sort_order } = req.body
    if (!name) return res.status(400).json({ error: '分类名称不能为空' })
    if (sort_order !== undefined && !isInteger(sort_order)) {
      return res.status(400).json({ error: '排序值必须为整数' })
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'page_categories',
      data: { name, icon: icon || null, description: description || null, sort_order: sort_order || 0, is_active: true }
    })
    res.json({ id: result.id, name, icon, description, sort_order: sort_order || 0, is_active: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/categories/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_categories')) {
      return res.status(403).json({ error: '仅管理员可以管理分类' })
    }

    if (req.body.sort_order !== undefined && !isInteger(req.body.sort_order)) {
      return res.status(400).json({ error: '排序值必须为整数' })
    }

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'page_categories',
      where: { id: parseInt(req.params.id) }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_categories')) {
      return res.status(403).json({ error: '仅管理员可以管理分类' })
    }

    const categoryId = parseInt(req.params.id)

    // 检查是否有页面引用此分类
    const pages = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'registered_pages',
      where: { category_id: categoryId }, limit: 1
    })
    if (pages.rows && pages.rows.length > 0) {
      return res.status(400).json({ error: '该分类下仍有页面引用，无法删除' })
    }

    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'page_categories', where: { id: categoryId }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 页面注册 API
// ═══════════════════════════════════════

app.get('/api/pages', async (req, res) => {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy', 'status', 'category_id', 'is_active'].includes(k)) where[k] = v
    }
    if (req.query.status) where.status = req.query.status
    if (req.query.category_id) where.category_id = parseInt(req.query.category_id)
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true'

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'registered_pages', where,
      orderBy: req.query.orderBy || 'weight DESC, created_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/pages', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_pages')) {
      return res.status(403).json({ error: '仅管理员可以注册页面' })
    }

    const { app_name, report_url, icon_url, description, weight, category_id, registered_by } = req.body

    // 必填字段验证
    if (!app_name) return res.status(400).json({ error: '应用名称不能为空' })
    if (!report_url) return res.status(400).json({ error: '报表链接不能为空' })
    if (!isValidUrl(report_url)) return res.status(400).json({ error: '报表链接格式不合法，必须以 http:// 或 https:// 或 / 开头' })
    if (weight !== undefined && !isInteger(weight)) {
      return res.status(400).json({ error: '权重必须为整数' })
    }

    // 唯一性校验
    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'registered_pages',
      where: { app_name }, limit: 1
    })
    if (existing.rows && existing.rows.length > 0) {
      return res.status(400).json({ error: '应用名称已存在' })
    }

    const now = new Date().toISOString()
    const pageData = {
      app_name,
      report_url,
      icon_url: icon_url || null,
      description: description || null,
      weight: weight || 0,
      category_id: category_id ? parseInt(category_id) : null,
      is_active: true,
      registered_by: registered_by ? parseInt(registered_by) : null,
      status: 'active',
      created_at: now,
      updated_at: now
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'registered_pages', data: pageData
    })
    res.json({ id: result.id, ...pageData })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/pages/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_pages')) {
      return res.status(403).json({ error: '仅管理员可以修改页面' })
    }

    const pageId = parseInt(req.params.id)

    // 验证页面存在
    const current = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'registered_pages', where: { id: pageId }, limit: 1
    })
    if (!current.rows || current.rows.length === 0) {
      return res.status(404).json({ error: '页面不存在' })
    }

    // 字段校验
    if (req.body.report_url && !isValidUrl(req.body.report_url)) {
      return res.status(400).json({ error: '报表链接格式不合法' })
    }
    if (req.body.weight !== undefined && !isInteger(req.body.weight)) {
      return res.status(400).json({ error: '权重必须为整数' })
    }

    // 如果修改 app_name，检查唯一性
    if (req.body.app_name && req.body.app_name !== current.rows[0].app_name) {
      const dup = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'registered_pages',
        where: { app_name: req.body.app_name }, limit: 1
      })
      if (dup.rows && dup.rows.length > 0) {
        return res.status(400).json({ error: '应用名称已存在' })
      }
    }

    req.body.updated_at = new Date().toISOString()

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'registered_pages',
      where: { id: pageId }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/pages/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_pages')) {
      return res.status(403).json({ error: '仅管理员可以注销页面' })
    }

    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'registered_pages', where: { id: parseInt(req.params.id) }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 页面建议（教师）
// ═══════════════════════════════════════

app.post('/api/pages/suggest', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'suggest_page')) {
      return res.status(403).json({ error: '您没有权限建议页面' })
    }

    const { app_name, report_url, icon_url, description, weight, registered_by } = req.body

    if (!app_name) return res.status(400).json({ error: '应用名称不能为空' })
    if (!report_url) return res.status(400).json({ error: '报表链接不能为空' })
    if (!isValidUrl(report_url)) return res.status(400).json({ error: '报表链接格式不合法' })

    // 唯一性校验（包括 pending 状态的）
    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'registered_pages',
      where: { app_name }, limit: 1
    })
    if (existing.rows && existing.rows.length > 0) {
      return res.status(400).json({ error: '应用名称已存在' })
    }

    const now = new Date().toISOString()
    const pageData = {
      app_name,
      report_url,
      icon_url: icon_url || null,
      description: description || null,
      weight: weight || 0,
      category_id: null,
      is_active: false,
      registered_by: registered_by ? parseInt(registered_by) : null,
      status: 'pending',
      created_at: now,
      updated_at: now
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'registered_pages', data: pageData
    })
    res.json({ id: result.id, ...pageData, message: '页面建议已提交，等待管理员审核' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/pages/pending', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_pending')) {
      return res.status(403).json({ error: '仅管理员可以查看待审核建议' })
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'registered_pages',
      where: { status: 'pending' },
      orderBy: 'created_at DESC',
      limit: 100
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// Portal 页面 API
// ═══════════════════════════════════════

app.get('/api/portal', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'registered_pages',
      where: { is_active: true, status: 'active' },
      orderBy: 'weight DESC, created_at DESC',
      limit: 500
    })

    const pages = result.rows || []

    // 获取分类信息
    const catResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'page_categories',
      where: { is_active: true },
      orderBy: 'sort_order ASC',
      limit: 200
    })
    const categories = catResult.rows || []
    const catMap = {}
    for (const c of categories) { catMap[c.id] = c }

    // 按分类分组
    const grouped = {}
    const ungrouped = []
    for (const p of pages) {
      if (p.category_id && catMap[p.category_id]) {
        const catName = catMap[p.category_id].name
        if (!grouped[catName]) grouped[catName] = { category: catMap[p.category_id], pages: [] }
        grouped[catName].pages.push(p)
      } else {
        ungrouped.push(p)
      }
    }

    res.json({
      pages,
      grouped,
      ungrouped,
      categories,
      total: pages.length
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/portal/search', async (req, res) => {
  try {
    const q = req.query.q
    if (!q) return res.status(400).json({ error: '搜索关键词不能为空' })

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'registered_pages',
      where: { is_active: true, status: 'active' },
      orderBy: 'weight DESC',
      limit: 500
    })

    const keyword = q.toLowerCase()
    const matched = (result.rows || []).filter(p =>
      (p.app_name && p.app_name.toLowerCase().includes(keyword)) ||
      (p.description && p.description.toLowerCase().includes(keyword))
    )

    res.json({ rows: matched, count: matched.length, keyword: q })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 访问追踪 API
// ═══════════════════════════════════════

app.post('/api/pages/:id/access', async (req, res) => {
  try {
    const pageId = parseInt(req.params.id)
    const { user_id } = req.body

    // 验证页面存在
    const page = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'registered_pages', where: { id: pageId }, limit: 1
    })
    if (!page.rows || page.rows.length === 0) {
      return res.status(404).json({ error: '页面不存在' })
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'page_access_logs',
      data: { page_id: pageId, user_id: user_id ? parseInt(user_id) : null, accessed_at: new Date().toISOString() }
    })
    res.json({ id: result.id, message: '访问已记录' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/pages/:id/access-count', async (req, res) => {
  try {
    const pageId = parseInt(req.params.id)

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'page_access_logs',
      where: { page_id: pageId },
      limit: 10000
    })

    const logs = result.rows || []
    res.json({ page_id: pageId, access_count: logs.length, recent_logs: logs.slice(-10) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 收藏 API
// ═══════════════════════════════════════

app.get('/api/favorites', async (req, res) => {
  try {
    const { user_id } = req.query
    if (!user_id) return res.status(400).json({ error: '必须指定用户' })

    // 查询收藏记录
    const favs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'page_favorites',
      where: { user_id: parseInt(user_id) },
      limit: 200
    })

    const favPageIds = (favs.rows || []).map(f => f.page_id)
    if (favPageIds.length === 0) {
      return res.json({ rows: [], count: 0 })
    }

    // 查询对应页面详情
    const pages = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'registered_pages',
      limit: 500
    })
    const favPages = (pages.rows || []).filter(p => favPageIds.includes(p.id))

    res.json({ rows: favPages, count: favPages.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/favorites/:page_id', async (req, res) => {
  try {
    const pageId = parseInt(req.params.page_id)
    const { user_id } = req.body
    if (!user_id) return res.status(400).json({ error: '必须指定用户' })

    // 验证页面存在
    const page = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'registered_pages', where: { id: pageId }, limit: 1
    })
    if (!page.rows || page.rows.length === 0) {
      return res.status(404).json({ error: '页面不存在' })
    }

    // 检查是否已收藏
    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'page_favorites',
      where: { user_id: parseInt(user_id), page_id: pageId }, limit: 1
    })
    if (existing.rows && existing.rows.length > 0) {
      return res.status(400).json({ error: '该页面已在收藏中' })
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'page_favorites',
      data: { user_id: parseInt(user_id), page_id: pageId }
    })
    res.json({ id: result.id, message: '已添加到收藏' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/favorites/:page_id', async (req, res) => {
  try {
    const pageId = parseInt(req.params.page_id)
    const { user_id } = req.query
    if (!user_id) return res.status(400).json({ error: '必须指定用户' })

    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'page_favorites',
      where: { user_id: parseInt(user_id), page_id: pageId }
    })
    res.json({ success: true, count: result.count, message: '已从收藏中移除' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 仪表盘（页面集合）API
// ═══════════════════════════════════════

app.get('/api/dashboards', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'page_dashboards',
      orderBy: 'created_at DESC',
      limit: 100
    })

    // 解析 page_ids JSON
    const dashboards = (result.rows || []).map(d => ({
      ...d,
      page_ids: typeof d.page_ids === 'string' ? JSON.parse(d.page_ids || '[]') : (d.page_ids || [])
    }))

    res.json({ rows: dashboards, count: dashboards.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/dashboards', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_dashboards')) {
      return res.status(403).json({ error: '仅管理员可以管理仪表盘' })
    }

    const { name, description, page_ids, created_by } = req.body
    if (!name) return res.status(400).json({ error: '仪表盘名称不能为空' })
    if (!page_ids || !Array.isArray(page_ids) || page_ids.length === 0) {
      return res.status(400).json({ error: '仪表盘至少包含一个页面' })
    }

    const now = new Date().toISOString()
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'page_dashboards',
      data: {
        name, description: description || null,
        page_ids: JSON.stringify(page_ids),
        created_by: created_by ? parseInt(created_by) : null,
        created_at: now, updated_at: now
      }
    })
    res.json({ id: result.id, name, description, page_ids, created_at: now })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/dashboards/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_dashboards')) {
      return res.status(403).json({ error: '仅管理员可以管理仪表盘' })
    }

    if (req.body.page_ids) {
      if (!Array.isArray(req.body.page_ids)) {
        return res.status(400).json({ error: 'page_ids 必须为数组' })
      }
      req.body.page_ids = JSON.stringify(req.body.page_ids)
    }
    req.body.updated_at = new Date().toISOString()

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'page_dashboards',
      where: { id: parseInt(req.params.id) }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/dashboards/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_dashboards')) {
      return res.status(403).json({ error: '仅管理员可以管理仪表盘' })
    }

    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'page_dashboards', where: { id: parseInt(req.params.id) }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 统计 API
// ═══════════════════════════════════════

app.get('/api/statistics/pages', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'registered_pages',
      limit: 10000
    })
    const pages = result.rows || []

    // 按分类统计
    const byCategory = {}
    for (const p of pages) {
      const key = p.category_id ? `分类#${p.category_id}` : '未分类'
      byCategory[key] = (byCategory[key] || 0) + 1
    }

    // 按权重区间统计
    const byWeightRange = { '高权重(>=10)': 0, '中权重(1-9)': 0, '默认(0)': 0, '负权重(<0)': 0 }
    for (const p of pages) {
      const w = p.weight || 0
      if (w >= 10) byWeightRange['高权重(>=10)']++
      else if (w >= 1) byWeightRange['中权重(1-9)']++
      else if (w === 0) byWeightRange['默认(0)']++
      else byWeightRange['负权重(<0)']++
    }

    // 最近注册的页面（按 created_at 降序取前 10）
    const sorted = [...pages].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    const recentPages = sorted.slice(0, 10).map(p => ({
      id: p.id, app_name: p.app_name, created_at: p.created_at, weight: p.weight
    }))

    // 状态统计
    const byStatus = {}
    for (const p of pages) {
      byStatus[p.status || 'unknown'] = (byStatus[p.status || 'unknown'] || 0) + 1
    }

    const activeCount = pages.filter(p => p.is_active).length

    res.json({
      total: pages.length,
      activeCount,
      byCategory,
      byWeightRange,
      byStatus,
      recentPages
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/statistics/access', async (req, res) => {
  try {
    const logsResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'page_access_logs',
      orderBy: 'accessed_at DESC',
      limit: 10000
    })
    const logs = logsResult.rows || []

    // 按页面统计访问量
    const byPage = {}
    for (const l of logs) {
      const key = l.page_id
      byPage[key] = (byPage[key] || 0) + 1
    }

    // 排序取 Top 10
    const topPages = Object.entries(byPage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pageId, count]) => ({ page_id: parseInt(pageId), count }))

    // 最近访问日志
    const recentLogs = logs.slice(0, 20)

    // 按用户统计
    const byUser = {}
    for (const l of logs) {
      if (l.user_id) {
        const key = `用户#${l.user_id}`
        byUser[key] = (byUser[key] || 0) + 1
      }
    }

    res.json({
      total_accesses: logs.length,
      topPages,
      recentLogs,
      byUser
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
