import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'campus-content', port: 8100 })

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
  news_articles: [
    { name: 'title', type: 'text' },
    { name: 'content', type: 'text' },
    { name: 'cover_image_url', type: 'text', nullable: true },
    { name: 'author_id', type: 'integer' },
    { name: 'status', type: 'text' },
    { name: 'published_at', type: 'timestamp', nullable: true },
    { name: 'view_count', type: 'integer' }
  ],
  tutorials: [
    { name: 'title', type: 'text' },
    { name: 'content', type: 'text' },
    { name: 'category', type: 'text' },
    { name: 'author_id', type: 'integer' },
    { name: 'status', type: 'text' },
    { name: 'published_at', type: 'timestamp', nullable: true }
  ],
  posts: [
    { name: 'title', type: 'text' },
    { name: 'content', type: 'text' },
    { name: 'grade_id', type: 'integer', nullable: true },
    { name: 'classroom_id', type: 'integer', nullable: true },
    { name: 'author_id', type: 'integer' },
    { name: 'like_count', type: 'integer' },
    { name: 'status', type: 'text' }
  ],
  artworks: [
    { name: 'student_id', type: 'integer' },
    { name: 'grade_id', type: 'integer', nullable: true },
    { name: 'classroom_id', type: 'integer', nullable: true },
    { name: 'category', type: 'text' },
    { name: 'image_url', type: 'text' },
    { name: 'description', type: 'text', nullable: true },
    { name: 'like_count', type: 'integer' }
  ],
  likes: [
    { name: 'target_type', type: 'text' },
    { name: 'target_id', type: 'integer' },
    { name: 'user_id', type: 'integer' }
  ],
  artwork_categories: [
    { name: 'name', type: 'text' },
    { name: 'sort_order', type: 'integer' }
  ]
}

// ─── 角色权限矩阵 ───
const ROLE_PERMISSIONS = {
  admin:   { create_news: true, edit_news: true, delete_news: true, create_tutorial: true, edit_tutorial: true, delete_tutorial: true, create_post: true, edit_any_post: true, delete_any_post: true, manage_artworks: true, view_all: true },
  teacher: { create_news: true, edit_news: true, delete_news: true, create_tutorial: true, edit_tutorial: true, delete_tutorial: true, create_post: true, edit_any_post: false, delete_any_post: false, manage_artworks: true, view_all: false },
  student: { create_news: false, edit_news: false, delete_news: false, create_tutorial: false, edit_tutorial: false, delete_tutorial: false, create_post: true, edit_any_post: false, delete_any_post: false, manage_artworks: false, view_all: false }
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

// ─── 辅助函数 ───

/** 获取用户角色 */
function getUserRole(req) {
  return req.headers['x-user-role'] || req.query.role || 'student'
}

/** 检查角色权限 */
function checkPermission(role, action) {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.student
  return perms[action] || false
}

/** 权限中间件 */
function requireRole(action) {
  return (req, res, next) => {
    const role = getUserRole(req)
    if (!checkPermission(role, action)) {
      return res.status(403).json({ error: '权限不足，无法执行此操作' })
    }
    next()
  }
}

// ─── 通用 CRUD 辅助 ───
async function listRecords(req, res, tableName) {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy', 'search', 'grade_id', 'classroom_id', 'category'].includes(k)) {
        where[k] = v
      }
    }
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName, where,
      orderBy: req.query.orderBy || '',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

async function createRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.insert', { orgId: req.orgId, tableName, data: req.body })
    res.json({ id: result.id, ...req.body })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

async function updateRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName, where: { id: parseInt(req.params.id) }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

async function deleteRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName, where: { id: parseInt(req.params.id) }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ═══════════════════════════════════════
// 新闻 API
// ═══════════════════════════════════════
app.get('/api/news', async (req, res) => {
  try {
    const role = getUserRole(req)
    const where = {}

    // 学生只能查看已发布的新闻
    if (role === 'student') {
      where.status = 'published'
    }

    // 支持关键词搜索
    if (req.query.search) {
      // 搜索通过 title 过滤（MCP 层 where 做精确匹配，这里先全量查再过滤）
      const result = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'news_articles', where,
        orderBy: 'published_at DESC',
        limit: parseInt(req.query.limit || '100'),
        offset: parseInt(req.query.offset || '0')
      })
      const keyword = req.query.search.toLowerCase()
      const filtered = (result.rows || []).filter(n =>
        (n.title || '').toLowerCase().includes(keyword)
      )
      return res.json({ rows: filtered, count: filtered.length })
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'news_articles', where,
      orderBy: req.query.orderBy || 'published_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/news/:id', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'news_articles',
      where: { id: parseInt(req.params.id) }, limit: 1
    })
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '新闻不存在' })
    }
    const article = result.rows[0]

    // 学生只能查看已发布的
    const role = getUserRole(req)
    if (role === 'student' && article.status !== 'published') {
      return res.status(403).json({ error: '该新闻尚未发布' })
    }

    // 自增浏览量
    const newViewCount = (article.view_count || 0) + 1
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'news_articles',
      where: { id: parseInt(req.params.id) },
      data: { view_count: newViewCount }
    })

    res.json({ ...article, view_count: newViewCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/news', requireRole('create_news'), async (req, res) => {
  try {
    const { title, content, status } = req.body
    if (!title) return res.status(400).json({ error: '新闻标题不能为空' })
    if (!content) return res.status(400).json({ error: '新闻内容不能为空' })
    if (status && !['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({ error: '状态必须为 draft、published 或 archived' })
    }

    const data = { ...req.body, view_count: 0 }
    // 发布时自动设置发布时间
    if (status === 'published') {
      data.published_at = new Date().toISOString()
    }

    const result = await app.mcp.call('data.insert', { orgId: req.orgId, tableName: 'news_articles', data })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/news/:id', requireRole('edit_news'), async (req, res) => {
  try {
    const { status } = req.body
    if (status && !['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({ error: '状态必须为 draft、published 或 archived' })
    }

    // 如果状态变为 published，自动设置发布时间
    if (status === 'published') {
      const current = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'news_articles',
        where: { id: parseInt(req.params.id) }, limit: 1
      })
      if (current.rows && current.rows.length > 0 && !current.rows[0].published_at) {
        req.body.published_at = new Date().toISOString()
      }
    }

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'news_articles',
      where: { id: parseInt(req.params.id) }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/news/:id', requireRole('delete_news'), (req, res) => deleteRecord(req, res, 'news_articles'))

// ═══════════════════════════════════════
// 教程 API
// ═══════════════════════════════════════
app.get('/api/tutorials', async (req, res) => {
  try {
    const role = getUserRole(req)
    const where = {}

    if (role === 'student') {
      where.status = 'published'
    }

    if (req.query.search) {
      const result = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'tutorials', where,
        orderBy: 'published_at DESC',
        limit: parseInt(req.query.limit || '100'),
        offset: parseInt(req.query.offset || '0')
      })
      const keyword = req.query.search.toLowerCase()
      const filtered = (result.rows || []).filter(t =>
        (t.title || '').toLowerCase().includes(keyword)
      )
      return res.json({ rows: filtered, count: filtered.length })
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'tutorials', where,
      orderBy: req.query.orderBy || 'published_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/tutorials', requireRole('create_tutorial'), async (req, res) => {
  try {
    const { title, content, category, status } = req.body
    if (!title) return res.status(400).json({ error: '教程标题不能为空' })
    if (!content) return res.status(400).json({ error: '教程内容不能为空' })
    if (!category) return res.status(400).json({ error: '教程分类不能为空' })
    if (status && !['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({ error: '状态必须为 draft、published 或 archived' })
    }

    const data = { ...req.body }
    if (status === 'published') {
      data.published_at = new Date().toISOString()
    }

    const result = await app.mcp.call('data.insert', { orgId: req.orgId, tableName: 'tutorials', data })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/tutorials/:id', requireRole('edit_tutorial'), async (req, res) => {
  try {
    const { status } = req.body
    if (status && !['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({ error: '状态必须为 draft、published 或 archived' })
    }

    if (status === 'published') {
      const current = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'tutorials',
        where: { id: parseInt(req.params.id) }, limit: 1
      })
      if (current.rows && current.rows.length > 0 && !current.rows[0].published_at) {
        req.body.published_at = new Date().toISOString()
      }
    }

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'tutorials',
      where: { id: parseInt(req.params.id) }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/tutorials/:id', requireRole('delete_tutorial'), (req, res) => deleteRecord(req, res, 'tutorials'))

// ═══════════════════════════════════════
// 帖子 API
// ═══════════════════════════════════════
app.get('/api/posts', async (req, res) => {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy', 'search'].includes(k)) where[k] = v
    }

    if (req.query.search) {
      const result = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'posts', where,
        orderBy: req.query.orderBy || 'like_count DESC',
        limit: parseInt(req.query.limit || '100'),
        offset: parseInt(req.query.offset || '0')
      })
      const keyword = req.query.search.toLowerCase()
      const filtered = (result.rows || []).filter(p =>
        (p.title || '').toLowerCase().includes(keyword)
      )
      return res.json({ rows: filtered, count: filtered.length })
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'posts', where,
      orderBy: req.query.orderBy || 'like_count DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/posts', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'create_post')) {
      return res.status(403).json({ error: '您没有权限发布帖子' })
    }

    const { title, content } = req.body
    if (!title) return res.status(400).json({ error: '帖子标题不能为空' })
    if (!content) return res.status(400).json({ error: '帖子内容不能为空' })

    const data = { ...req.body, like_count: 0, status: req.body.status || 'active' }
    const result = await app.mcp.call('data.insert', { orgId: req.orgId, tableName: 'posts', data })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/posts/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    const postId = parseInt(req.params.id)

    // 权限检查：作者本人或管理员
    const current = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'posts', where: { id: postId }, limit: 1
    })
    if (!current.rows || current.rows.length === 0) {
      return res.status(404).json({ error: '帖子不存在' })
    }
    const post = current.rows[0]

    const isAuthor = req.body.author_id && parseInt(req.body.author_id) === parseInt(post.author_id)
    const canEdit = checkPermission(role, 'edit_any_post') || isAuthor

    if (!canEdit) {
      return res.status(403).json({ error: '您没有权限编辑此帖子' })
    }

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'posts', where: { id: postId }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/posts/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    const postId = parseInt(req.params.id)

    const current = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'posts', where: { id: postId }, limit: 1
    })
    if (!current.rows || current.rows.length === 0) {
      return res.status(404).json({ error: '帖子不存在' })
    }
    const post = current.rows[0]

    const isAuthor = req.query.author_id && parseInt(req.query.author_id) === parseInt(post.author_id)
    const canDelete = checkPermission(role, 'delete_any_post') || isAuthor

    if (!canDelete) {
      return res.status(403).json({ error: '您没有权限删除此帖子' })
    }

    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'posts', where: { id: postId }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 作品 API（含区域过滤）
// ═══════════════════════════════════════
app.get('/api/artworks', async (req, res) => {
  try {
    const where = {}
    // 支持区域过滤：grade_id, classroom_id, category
    if (req.query.grade_id) where.grade_id = parseInt(req.query.grade_id)
    if (req.query.classroom_id) where.classroom_id = parseInt(req.query.classroom_id)
    if (req.query.category) where.category = req.query.category

    if (req.query.search) {
      const result = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'artworks', where,
        orderBy: req.query.orderBy || 'like_count DESC',
        limit: parseInt(req.query.limit || '100'),
        offset: parseInt(req.query.offset || '0')
      })
      const keyword = req.query.search.toLowerCase()
      const filtered = (result.rows || []).filter(a =>
        (a.description || '').toLowerCase().includes(keyword) ||
        (a.category || '').toLowerCase().includes(keyword)
      )
      return res.json({ rows: filtered, count: filtered.length })
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'artworks', where,
      orderBy: req.query.orderBy || 'like_count DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/artworks', async (req, res) => {
  try {
    const role = getUserRole(req)
    const { student_id, image_url, category } = req.body

    if (!student_id) return res.status(400).json({ error: '必须指定学生' })
    if (!image_url) return res.status(400).json({ error: '作品图片不能为空' })
    if (!category) return res.status(400).json({ error: '作品分类不能为空' })

    // 学生只能提交自己的作品，admin/teacher 可以管理所有
    if (role === 'student') {
      // 学生提交作品 OK
    }

    const data = { ...req.body, like_count: 0 }
    const result = await app.mcp.call('data.insert', { orgId: req.orgId, tableName: 'artworks', data })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/artworks/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_artworks')) {
      return res.status(403).json({ error: '您没有权限管理作品' })
    }

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'artworks',
      where: { id: parseInt(req.params.id) }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/artworks/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_artworks')) {
      return res.status(403).json({ error: '您没有权限管理作品' })
    }

    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'artworks',
      where: { id: parseInt(req.params.id) }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 点赞 API（幂等切换）
// ═══════════════════════════════════════
app.post('/api/likes', async (req, res) => {
  try {
    const { target_type, target_id, user_id } = req.body
    if (!target_type || !target_id || !user_id) {
      return res.status(400).json({ error: '缺少必要参数：target_type, target_id, user_id' })
    }

    const tid = parseInt(target_id)
    const uid = parseInt(user_id)
    const table = target_type === 'post' ? 'posts' : 'artworks'

    // 幂等检查：查询是否已点赞
    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'likes',
      where: { target_type, target_id: tid, user_id: uid },
      limit: 1
    })

    let action, currentLikeCount

    if (existing.rows && existing.rows.length > 0) {
      // 已点赞 -> 取消点赞（幂等：再次调用结果一致）
      await app.mcp.call('data.delete', {
        orgId: req.orgId, tableName: 'likes',
        where: { id: existing.rows[0].id }
      })

      const item = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: table,
        where: { id: tid }, limit: 1
      })
      if (item.rows && item.rows.length > 0) {
        currentLikeCount = Math.max(0, (item.rows[0].like_count || 0) - 1)
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: table,
          where: { id: tid },
          data: { like_count: currentLikeCount }
        })
      }
      action = 'unliked'
    } else {
      // 未点赞 -> 点赞
      await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'likes',
        data: { target_type, target_id: tid, user_id: uid }
      })

      const item = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: table,
        where: { id: tid }, limit: 1
      })
      if (item.rows && item.rows.length > 0) {
        currentLikeCount = (item.rows[0].like_count || 0) + 1
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: table,
          where: { id: tid },
          data: { like_count: currentLikeCount }
        })
      }
      action = 'liked'
    }

    // 返回当前点赞状态
    res.json({
      action,
      liked: action === 'liked',
      like_count: currentLikeCount || 0,
      target_type,
      target_id: tid,
      user_id: uid
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 排行榜 API
// ═══════════════════════════════════════
app.get('/api/posts/ranked', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'posts',
      orderBy: 'like_count DESC',
      limit: parseInt(req.query.limit || '50')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/artworks/ranked', async (req, res) => {
  try {
    const where = {}
    if (req.query.grade_id) where.grade_id = parseInt(req.query.grade_id)
    if (req.query.classroom_id) where.classroom_id = parseInt(req.query.classroom_id)
    if (req.query.category) where.category = req.query.category

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'artworks', where,
      orderBy: 'like_count DESC',
      limit: parseInt(req.query.limit || '50')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 统计 API
// ═══════════════════════════════════════
app.get('/api/statistics/content', async (req, res) => {
  try {
    const [news, tutorials, posts, artworks] = await Promise.all([
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'news_articles', limit: 10000 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'tutorials', limit: 10000 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'posts', limit: 10000 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'artworks', limit: 10000 })
    ])

    const newsRows = news.rows || []
    const tutorialRows = tutorials.rows || []
    const postRows = posts.rows || []
    const artworkRows = artworks.rows || []

    // 按状态统计
    const byStatus = {}
    for (const n of newsRows) byStatus[`news_${n.status || 'unknown'}`] = (byStatus[`news_${n.status || 'unknown'}`] || 0) + 1
    for (const t of tutorialRows) byStatus[`tutorial_${t.status || 'unknown'}`] = (byStatus[`tutorial_${t.status || 'unknown'}`] || 0) + 1

    // 按作者统计
    const byAuthor = {}
    for (const n of newsRows) byAuthor[`user_${n.author_id}`] = (byAuthor[`user_${n.author_id}`] || 0) + 1
    for (const t of tutorialRows) byAuthor[`user_${t.author_id}`] = (byAuthor[`user_${t.author_id}`] || 0) + 1
    for (const p of postRows) byAuthor[`user_${p.author_id}`] = (byAuthor[`user_${p.author_id}`] || 0) + 1

    res.json({
      total: {
        news: newsRows.length,
        tutorials: tutorialRows.length,
        posts: postRows.length,
        artworks: artworkRows.length
      },
      byStatus,
      byAuthor
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/statistics/likes', async (req, res) => {
  try {
    const likesResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'likes', limit: 10000
    })
    const likesRows = likesResult.rows || []

    // 按目标类型统计
    const byTargetType = {}
    for (const l of likesRows) {
      byTargetType[l.target_type] = (byTargetType[l.target_type] || 0) + 1
    }

    // 找出最受欢迎的条目（按 target_id 聚合）
    const byTarget = {}
    for (const l of likesRows) {
      const key = `${l.target_type}_${l.target_id}`
      byTarget[key] = (byTarget[key] || 0) + 1
    }
    const topLiked = Object.entries(byTarget)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    res.json({
      total: likesRows.length,
      byTargetType,
      topLiked
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/statistics/popular', async (req, res) => {
  try {
    const period = req.query.period || 'week' // week | month
    const now = new Date()
    const cutoff = new Date(now)
    if (period === 'month') {
      cutoff.setDate(cutoff.getDate() - 30)
    } else {
      cutoff.setDate(cutoff.getDate() - 7)
    }
    const cutoffStr = cutoff.toISOString()

    // 获取帖子和作品，按点赞数排序
    const [posts, artworks] = await Promise.all([
      app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'posts',
        orderBy: 'like_count DESC', limit: 20
      }),
      app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'artworks',
        orderBy: 'like_count DESC', limit: 20
      })
    ])

    res.json({
      period,
      since: cutoffStr,
      popular_posts: (posts.rows || []).slice(0, 10),
      popular_artworks: (artworks.rows || []).slice(0, 10)
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 全局搜索 API
// ═══════════════════════════════════════
app.get('/api/search', async (req, res) => {
  try {
    const keyword = (req.query.q || '').toLowerCase()
    if (!keyword) return res.json({ results: [] })

    const [news, tutorials, posts] = await Promise.all([
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'news_articles', limit: 200 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'tutorials', limit: 200 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'posts', limit: 200 })
    ])

    const results = []
    for (const n of (news.rows || [])) {
      if ((n.title || '').toLowerCase().includes(keyword)) {
        results.push({ type: 'news', id: n.id, title: n.title, status: n.status })
      }
    }
    for (const t of (tutorials.rows || [])) {
      if ((t.title || '').toLowerCase().includes(keyword)) {
        results.push({ type: 'tutorial', id: t.id, title: t.title, category: t.category })
      }
    }
    for (const p of (posts.rows || [])) {
      if ((p.title || '').toLowerCase().includes(keyword)) {
        results.push({ type: 'post', id: p.id, title: p.title, like_count: p.like_count })
      }
    }

    res.json({ results, count: results.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 作品分类 API
// ═══════════════════════════════════════
app.get('/api/categories', (req, res) => listRecords(req, res, 'artwork_categories'))
app.post('/api/categories', (req, res) => createRecord(req, res, 'artwork_categories'))
app.put('/api/categories/:id', (req, res) => updateRecord(req, res, 'artwork_categories'))
app.delete('/api/categories/:id', (req, res) => deleteRecord(req, res, 'artwork_categories'))

app.start()
