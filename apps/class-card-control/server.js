import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'class-card-control', port: 8102 })

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
  clients: [
    { name: 'name', type: 'text' },
    { name: 'device_id', type: 'text' },
    { name: 'classroom_id', type: 'integer', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'last_seen', type: 'timestamp', nullable: true },
    { name: 'owner_id', type: 'integer', nullable: true },
    { name: 'config_version', type: 'integer' }
  ],
  playlists: [
    { name: 'name', type: 'text' },
    { name: 'client_ids', type: 'jsonb' },
    { name: 'images', type: 'jsonb' },
    { name: 'loop_mode', type: 'text' },
    { name: 'status', type: 'text' },
    { name: 'owner_id', type: 'integer', nullable: true },
    { name: 'created_at', type: 'timestamp' }
  ],
  playback_logs: [
    { name: 'client_id', type: 'integer' },
    { name: 'playlist_id', type: 'integer' },
    { name: 'material_id', type: 'integer', nullable: true },
    { name: 'started_at', type: 'timestamp' },
    { name: 'ended_at', type: 'timestamp', nullable: true },
    { name: 'duration_seconds', type: 'integer', nullable: true }
  ],
  client_configs: [
    { name: 'client_id', type: 'integer' },
    { name: 'brightness', type: 'integer' },
    { name: 'volume', type: 'integer' },
    { name: 'schedule', type: 'jsonb', nullable: true },
    { name: 'refresh_interval', type: 'integer' },
    { name: 'fullscreen', type: 'boolean' },
    { name: 'playlist_id', type: 'integer', nullable: true },
    { name: 'config_version', type: 'integer' },
    { name: 'updated_at', type: 'timestamp' }
  ],
  materials: [
    { name: 'uuid', type: 'text' },
    { name: 'title', type: 'text' },
    { name: 'image_url', type: 'text' },
    { name: 'category', type: 'text', nullable: true },
    { name: 'uploaded_by', type: 'integer', nullable: true },
    { name: 'created_at', type: 'timestamp' }
  ],
  material_categories: [
    { name: 'name', type: 'text' },
    { name: 'sort_order', type: 'integer' }
  ]
}

// ─── 角色权限矩阵 ───
const ROLE_PERMISSIONS = {
  admin: {
    manage_clients: true,
    register_client: true,
    manage_all_playlists: true,
    manage_own_playlists: true,
    manage_all_configs: true,
    manage_own_configs: true,
    upload_materials: true,
    manage_categories: true,
    view_all_clients: true,
    view_statistics: true,
    batch_config: true
  },
  teacher: {
    manage_clients: false,
    register_client: false,
    manage_all_playlists: false,
    manage_own_playlists: true,
    manage_all_configs: false,
    manage_own_configs: true,
    upload_materials: true,
    manage_categories: false,
    view_all_clients: false,
    view_statistics: false,
    batch_config: false
  }
}

// ─── 默认素材分类 ───
const DEFAULT_CATEGORIES = [
  { name: '校园风光', sort_order: 1 },
  { name: '通知公告', sort_order: 2 },
  { name: '课程表', sort_order: 3 },
  { name: '荣誉展示', sort_order: 4 }
]

// ─── 离线判定阈值：5 分钟无心跳 ───
const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000

// ─── 初始化 ───
app.onStart(async () => {
  // 创建数据表
  for (const [tableName, columns] of Object.entries(TABLES)) {
    try {
      await app.mcp.call('data.create_table', { orgId: app.orgId, tableName, columns })
      console.log(`[init] Table '${tableName}' ready`)
    } catch (e) {
      console.log(`[init] Table '${tableName}' already exists`)
    }
  }

  // 预置默认素材分类
  try {
    const existing = await app.mcp.call('data.query', {
      orgId: app.orgId, tableName: 'material_categories', limit: 1
    })
    if (!existing.rows || existing.rows.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await app.mcp.call('data.insert', {
          orgId: app.orgId, tableName: 'material_categories', data: cat
        })
      }
      console.log('[init] Default material categories seeded')
    }
  } catch (e) {
    console.log(`[init] Category seed skipped: ${e.message}`)
  }
})

// ─── 通用 CRUD 辅助 ───
async function listRecords(req, res, tableName) {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy'].includes(k)) where[k] = v
    }
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName, where,
      orderBy: req.query.orderBy || 'created_at DESC',
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

/** 验证亮度/音量范围 */
function validateRange(value, min, max, fieldName) {
  const num = parseInt(value)
  if (isNaN(num) || num < min || num > max) {
    return `${fieldName} 必须在 ${min}-${max} 之间`
  }
  return null
}

/** 解析播放列表中的素材为实际 URL */
async function resolvePlaylist(orgId, playlistId) {
  if (!playlistId) return null

  const playlistResult = await app.mcp.call('data.query', {
    orgId, tableName: 'playlists', where: { id: playlistId }, limit: 1
  })
  if (!playlistResult.rows || playlistResult.rows.length === 0) return null

  const playlist = playlistResult.rows[0]
  let imageIds = playlist.images
  if (typeof imageIds === 'string') {
    try { imageIds = JSON.parse(imageIds) } catch { imageIds = [] }
  }
  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return { ...playlist, resolved_images: [] }
  }

  // 批量查询素材
  const resolvedImages = []
  for (const imgId of imageIds) {
    try {
      const matResult = await app.mcp.call('data.query', {
        orgId, tableName: 'materials', where: { id: parseInt(imgId) }, limit: 1
      })
      if (matResult.rows && matResult.rows.length > 0) {
        resolvedImages.push({
          id: matResult.rows[0].id,
          uuid: matResult.rows[0].uuid,
          title: matResult.rows[0].title,
          image_url: matResult.rows[0].image_url,
          category: matResult.rows[0].category
        })
      }
    } catch { /* skip missing materials */ }
  }

  return { ...playlist, resolved_images: resolvedImages }
}

/** 获取客户端完整配置（含播放列表解析） */
async function getFullConfig(orgId, clientId) {
  // 获取客户端信息
  const clientResult = await app.mcp.call('data.query', {
    orgId, tableName: 'clients', where: { id: clientId }, limit: 1
  })
  if (!clientResult.rows || clientResult.rows.length === 0) return null
  const client = clientResult.rows[0]

  // 获取配置
  const configResult = await app.mcp.call('data.query', {
    orgId, tableName: 'client_configs', where: { client_id: clientId }, limit: 1
  })

  let config = {
    brightness: 100,
    volume: 50,
    schedule: null,
    refresh_interval: 30,
    fullscreen: true,
    playlist_id: null,
    config_version: 0
  }
  if (configResult.rows && configResult.rows.length > 0) {
    const row = configResult.rows[0]
    config = {
      brightness: row.brightness ?? 100,
      volume: row.volume ?? 50,
      schedule: row.schedule,
      refresh_interval: row.refresh_interval ?? 30,
      fullscreen: row.fullscreen !== false,
      playlist_id: row.playlist_id,
      config_version: row.config_version ?? 0
    }
  }

  // 解析播放列表
  let playlist = null
  if (config.playlist_id) {
    playlist = await resolvePlaylist(orgId, config.playlist_id)
  }

  return {
    client_id: clientId,
    client_name: client.name,
    device_id: client.device_id,
    classroom_id: client.classroom_id,
    ...config,
    playlist
  }
}

/** 递增客户端配置版本号 */
async function bumpConfigVersion(orgId, clientId) {
  // 先读取当前版本
  const configResult = await app.mcp.call('data.query', {
    orgId, tableName: 'client_configs', where: { client_id: clientId }, limit: 1
  })
  let newVersion = 1
  if (configResult.rows && configResult.rows.length > 0) {
    newVersion = (configResult.rows[0].config_version || 0) + 1
  }

  await app.mcp.call('data.update', {
    orgId, tableName: 'client_configs',
    where: { client_id: clientId },
    data: { config_version: newVersion, updated_at: new Date().toISOString() }
  })

  // 同步更新 clients 表的 config_version
  await app.mcp.call('data.update', {
    orgId, tableName: 'clients',
    where: { id: clientId },
    data: { config_version: newVersion }
  })

  return newVersion
}

/** 检查教师是否拥有该客户端的配置权限 */
async function checkClientOwnership(orgId, clientId, userId) {
  if (!userId) return false
  const result = await app.mcp.call('data.query', {
    orgId, tableName: 'clients', where: { id: clientId }, limit: 1
  })
  if (!result.rows || result.rows.length === 0) return false
  return result.rows[0].owner_id === userId
}

// ═══════════════════════════════════════
// 素材分类 API
// ═══════════════════════════════════════
app.get('/api/material-categories', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'material_categories',
      orderBy: 'sort_order ASC', limit: 100
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/material-categories', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_categories')) {
      return res.status(403).json({ error: '仅管理员可以管理素材分类' })
    }

    const { name, sort_order } = req.body
    if (!name) return res.status(400).json({ error: '分类名称不能为空' })

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'material_categories',
      data: { name, sort_order: sort_order || 0 }
    })
    res.json({ id: result.id, name, sort_order: sort_order || 0 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/material-categories/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_categories')) {
      return res.status(403).json({ error: '仅管理员可以管理素材分类' })
    }
    await updateRecord(req, res, 'material_categories')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/material-categories/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_categories')) {
      return res.status(403).json({ error: '仅管理员可以管理素材分类' })
    }
    await deleteRecord(req, res, 'material_categories')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 素材库管理 API
// ═══════════════════════════════════════
app.get('/api/materials', async (req, res) => {
  try {
    const where = {}
    // 支持按分类过滤
    if (req.query.category) where.category = req.query.category

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'materials', where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/materials', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'upload_materials')) {
      return res.status(403).json({ error: '您没有权限上传素材' })
    }

    const { title, image_url, category, uploaded_by } = req.body
    if (!title) return res.status(400).json({ error: '素材标题不能为空' })
    if (!image_url) return res.status(400).json({ error: '素材图片地址不能为空' })

    const uuid = randomUUID()
    const now = new Date().toISOString()

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'materials',
      data: {
        uuid,
        title,
        image_url,
        category: category || null,
        uploaded_by: uploaded_by ? parseInt(uploaded_by) : null,
        created_at: now
      }
    })
    res.json({ id: result.id, uuid, title, image_url, category, created_at: now })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/materials/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'upload_materials')) {
      return res.status(403).json({ error: '您没有权限修改素材' })
    }
    await updateRecord(req, res, 'materials')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/materials/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'upload_materials')) {
      return res.status(403).json({ error: '您没有权限删除素材' })
    }
    await deleteRecord(req, res, 'materials')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 客户端管理 API
// ═══════════════════════════════════════
app.get('/api/clients', async (req, res) => {
  try {
    const role = getUserRole(req)
    const userId = req.headers['x-user-id'] || req.query.user_id

    const where = {}
    // 教师只能看到自己负责的客户端
    if (role === 'teacher' && !checkPermission(role, 'view_all_clients')) {
      if (userId) where.owner_id = parseInt(userId)
    }
    // 支持按教室过滤
    if (req.query.classroom_id) where.classroom_id = parseInt(req.query.classroom_id)
    if (req.query.status) where.status = req.query.status

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'clients', where,
      orderBy: req.query.orderBy || 'name ASC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })

    // 自动标记离线客户端
    const now = Date.now()
    const rows = (result.rows || []).map(client => {
      if (client.last_seen && (now - new Date(client.last_seen).getTime()) > OFFLINE_THRESHOLD_MS) {
        return { ...client, status: 'offline' }
      }
      return client
    })

    res.json({ ...result, rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/clients', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'register_client')) {
      return res.status(403).json({ error: '仅管理员可以注册客户端' })
    }

    const { name, device_id, classroom_id, owner_id } = req.body
    if (!name) return res.status(400).json({ error: '客户端名称不能为空' })
    if (!device_id) return res.status(400).json({ error: '设备 ID 不能为空' })

    // 检查 device_id 唯一性
    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'clients', where: { device_id }, limit: 1
    })
    if (existing.rows && existing.rows.length > 0) {
      return res.status(400).json({ error: '设备 ID 已存在，请勿重复注册' })
    }

    const now = new Date().toISOString()
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'clients',
      data: {
        name,
        device_id,
        classroom_id: classroom_id ? parseInt(classroom_id) : null,
        status: 'offline',
        last_seen: now,
        owner_id: owner_id ? parseInt(owner_id) : null,
        config_version: 0
      }
    })
    res.json({ id: result.id, name, device_id, status: 'offline', config_version: 0 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/clients/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_clients')) {
      return res.status(403).json({ error: '仅管理员可以修改客户端信息' })
    }

    // 如果修改了 device_id，检查唯一性
    if (req.body.device_id) {
      const existing = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'clients',
        where: { device_id: req.body.device_id }, limit: 1
      })
      if (existing.rows && existing.rows.length > 0 && existing.rows[0].id !== parseInt(req.params.id)) {
        return res.status(400).json({ error: '设备 ID 已存在' })
      }
    }

    await updateRecord(req, res, 'clients')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_clients')) {
      return res.status(403).json({ error: '仅管理员可以删除客户端' })
    }
    await deleteRecord(req, res, 'clients')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 客户端配置 API
// ═══════════════════════════════════════
app.get('/api/clients/:id/config', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id)
    const fullConfig = await getFullConfig(req.orgId, clientId)
    if (!fullConfig) {
      return res.status(404).json({ error: '客户端不存在' })
    }
    res.json(fullConfig)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/clients/:id/config', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id)
    const role = getUserRole(req)
    const userId = req.headers['x-user-id'] || req.query.user_id

    // 权限检查：管理员可配置所有客户端，教师只能配置自己负责的
    if (role === 'admin') {
      // admin has full access
    } else if (role === 'teacher') {
      if (!checkPermission(role, 'manage_own_configs')) {
        return res.status(403).json({ error: '您没有权限修改客户端配置' })
      }
      const isOwner = await checkClientOwnership(req.orgId, clientId, parseInt(userId))
      if (!isOwner) {
        return res.status(403).json({ error: '您只能修改自己负责的客户端配置' })
      }
    } else {
      return res.status(403).json({ error: '您没有权限修改客户端配置' })
    }

    // 验证客户端存在
    const clientResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'clients', where: { id: clientId }, limit: 1
    })
    if (!clientResult.rows || clientResult.rows.length === 0) {
      return res.status(404).json({ error: '客户端不存在' })
    }

    // 数据验证
    const { brightness, volume, schedule, refresh_interval, fullscreen, playlist_id } = req.body
    if (brightness !== undefined) {
      const err = validateRange(brightness, 0, 100, '亮度')
      if (err) return res.status(400).json({ error: err })
    }
    if (volume !== undefined) {
      const err = validateRange(volume, 0, 100, '音量')
      if (err) return res.status(400).json({ error: err })
    }

    const now = new Date().toISOString()

    // 检查是否已有配置
    const existingConfig = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'client_configs', where: { client_id: clientId }, limit: 1
    })

    if (existingConfig.rows && existingConfig.rows.length > 0) {
      // 更新配置
      const currentVersion = existingConfig.rows[0].config_version || 0
      const newVersion = currentVersion + 1

      const updateData = { updated_at: now, config_version: newVersion }
      if (brightness !== undefined) updateData.brightness = parseInt(brightness)
      if (volume !== undefined) updateData.volume = parseInt(volume)
      if (schedule !== undefined) updateData.schedule = JSON.stringify(schedule)
      if (refresh_interval !== undefined) updateData.refresh_interval = parseInt(refresh_interval)
      if (fullscreen !== undefined) updateData.fullscreen = !!fullscreen
      if (playlist_id !== undefined) updateData.playlist_id = playlist_id ? parseInt(playlist_id) : null

      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'client_configs',
        where: { client_id: clientId }, data: updateData
      })

      // 同步 clients 表的 config_version
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'clients',
        where: { id: clientId }, data: { config_version: newVersion }
      })

      res.json({ success: true, config_version: newVersion })
    } else {
      // 创建配置
      const result = await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'client_configs',
        data: {
          client_id: clientId,
          brightness: brightness !== undefined ? parseInt(brightness) : 100,
          volume: volume !== undefined ? parseInt(volume) : 50,
          schedule: schedule ? JSON.stringify(schedule) : null,
          refresh_interval: refresh_interval !== undefined ? parseInt(refresh_interval) : 30,
          fullscreen: fullscreen !== undefined ? !!fullscreen : true,
          playlist_id: playlist_id ? parseInt(playlist_id) : null,
          config_version: 1,
          updated_at: now
        }
      })

      // 同步 clients 表的 config_version
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'clients',
        where: { id: clientId }, data: { config_version: 1 }
      })

      res.json({ id: result.id, config_version: 1 })
    }
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 客户端轮询 API（轻量心跳端点）
// ═══════════════════════════════════════
app.get('/api/clients/:id/poll', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id)
    const cachedVersion = parseInt(req.query.config_version || '0')

    // 更新心跳时间
    const now = new Date().toISOString()
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'clients',
      where: { id: clientId },
      data: { last_seen: now, status: 'online' }
    })

    // 获取当前配置版本
    const clientResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'clients', where: { id: clientId }, limit: 1
    })

    let currentVersion = 0
    if (clientResult.rows && clientResult.rows.length > 0) {
      currentVersion = clientResult.rows[0].config_version || 0
    }

    res.json({
      has_update: currentVersion > cachedVersion,
      config_version: currentVersion,
      timestamp: now
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 全量配置拉取（客户端检测到更新后调用）
app.get('/api/clients/:id/full-config', async (req, res) => {
  try {
    const clientId = parseInt(req.params.id)

    // 更新心跳
    const now = new Date().toISOString()
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'clients',
      where: { id: clientId },
      data: { last_seen: now, status: 'online' }
    })

    const fullConfig = await getFullConfig(req.orgId, clientId)
    if (!fullConfig) {
      return res.status(404).json({ error: '客户端不存在' })
    }
    res.json(fullConfig)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 批量配置 API
// ═══════════════════════════════════════
app.post('/api/configs/batch', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'batch_config')) {
      return res.status(403).json({ error: '仅管理员可以批量配置' })
    }

    const { client_ids, brightness, volume, schedule, refresh_interval, fullscreen, playlist_id } = req.body
    if (!client_ids || !Array.isArray(client_ids) || client_ids.length === 0) {
      return res.status(400).json({ error: '必须指定客户端 ID 列表' })
    }

    // 数据验证
    if (brightness !== undefined) {
      const err = validateRange(brightness, 0, 100, '亮度')
      if (err) return res.status(400).json({ error: err })
    }
    if (volume !== undefined) {
      const err = validateRange(volume, 0, 100, '音量')
      if (err) return res.status(400).json({ error: err })
    }

    const now = new Date().toISOString()
    const results = []

    for (const clientId of client_ids) {
      try {
        const cid = parseInt(clientId)

        // 检查是否已有配置
        const existingConfig = await app.mcp.call('data.query', {
          orgId: req.orgId, tableName: 'client_configs', where: { client_id: cid }, limit: 1
        })

        if (existingConfig.rows && existingConfig.rows.length > 0) {
          const currentVersion = existingConfig.rows[0].config_version || 0
          const newVersion = currentVersion + 1

          const updateData = { updated_at: now, config_version: newVersion }
          if (brightness !== undefined) updateData.brightness = parseInt(brightness)
          if (volume !== undefined) updateData.volume = parseInt(volume)
          if (schedule !== undefined) updateData.schedule = JSON.stringify(schedule)
          if (refresh_interval !== undefined) updateData.refresh_interval = parseInt(refresh_interval)
          if (fullscreen !== undefined) updateData.fullscreen = !!fullscreen
          if (playlist_id !== undefined) updateData.playlist_id = playlist_id ? parseInt(playlist_id) : null

          await app.mcp.call('data.update', {
            orgId: req.orgId, tableName: 'client_configs',
            where: { client_id: cid }, data: updateData
          })
          await app.mcp.call('data.update', {
            orgId: req.orgId, tableName: 'clients',
            where: { id: cid }, data: { config_version: newVersion }
          })
          results.push({ client_id: cid, success: true, config_version: newVersion })
        } else {
          const insertResult = await app.mcp.call('data.insert', {
            orgId: req.orgId, tableName: 'client_configs',
            data: {
              client_id: cid,
              brightness: brightness !== undefined ? parseInt(brightness) : 100,
              volume: volume !== undefined ? parseInt(volume) : 50,
              schedule: schedule ? JSON.stringify(schedule) : null,
              refresh_interval: refresh_interval !== undefined ? parseInt(refresh_interval) : 30,
              fullscreen: fullscreen !== undefined ? !!fullscreen : true,
              playlist_id: playlist_id ? parseInt(playlist_id) : null,
              config_version: 1,
              updated_at: now
            }
          })
          await app.mcp.call('data.update', {
            orgId: req.orgId, tableName: 'clients',
            where: { id: cid }, data: { config_version: 1 }
          })
          results.push({ client_id: cid, success: true, id: insertResult.id, config_version: 1 })
        }
      } catch (err) {
        results.push({ client_id: clientId, success: false, error: err.message })
      }
    }

    res.json({ success: true, results, total: results.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 播放列表 API
// ═══════════════════════════════════════
app.get('/api/playlists', async (req, res) => {
  try {
    const role = getUserRole(req)
    const userId = req.headers['x-user-id'] || req.query.user_id
    const where = {}

    // 教师只能看到自己的播放列表
    if (role === 'teacher' && !checkPermission(role, 'manage_all_playlists')) {
      if (userId) where.owner_id = parseInt(userId)
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'playlists', where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/playlists', async (req, res) => {
  try {
    const role = getUserRole(req)
    const userId = req.headers['x-user-id'] || req.query.user_id

    if (role === 'teacher' && !checkPermission(role, 'manage_own_playlists')) {
      return res.status(403).json({ error: '您没有权限创建播放列表' })
    }

    const { name, client_ids, images, loop_mode } = req.body
    if (!name) return res.status(400).json({ error: '播放列表名称不能为空' })
    if (client_ids !== undefined && !Array.isArray(client_ids)) {
      return res.status(400).json({ error: 'client_ids 必须是数组' })
    }
    if (images !== undefined && !Array.isArray(images)) {
      return res.status(400).json({ error: 'images 必须是数组' })
    }

    // 验证 loop_mode
    const validLoopModes = ['sequence', 'random', 'single']
    if (loop_mode && !validLoopModes.includes(loop_mode)) {
      return res.status(400).json({ error: `loop_mode 必须为 ${validLoopModes.join('、')} 之一` })
    }

    const now = new Date().toISOString()
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'playlists',
      data: {
        name,
        client_ids: JSON.stringify(client_ids || []),
        images: JSON.stringify(images || []),
        loop_mode: loop_mode || 'sequence',
        status: 'active',
        owner_id: userId ? parseInt(userId) : null,
        created_at: now
      }
    })
    res.json({ id: result.id, name, loop_mode: loop_mode || 'sequence', created_at: now })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/playlists/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    const userId = req.headers['x-user-id'] || req.query.user_id

    // 教师只能修改自己的播放列表
    if (role === 'teacher' && !checkPermission(role, 'manage_all_playlists')) {
      const existing = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'playlists',
        where: { id: parseInt(req.params.id) }, limit: 1
      })
      if (!existing.rows || existing.rows.length === 0) {
        return res.status(404).json({ error: '播放列表不存在' })
      }
      if (existing.rows[0].owner_id !== parseInt(userId)) {
        return res.status(403).json({ error: '您只能修改自己的播放列表' })
      }
    }

    // 验证 loop_mode
    if (req.body.loop_mode) {
      const validLoopModes = ['sequence', 'random', 'single']
      if (!validLoopModes.includes(req.body.loop_mode)) {
        return res.status(400).json({ error: `loop_mode 必须为 ${validLoopModes.join('、')} 之一` })
      }
    }

    // 验证数组字段
    if (req.body.client_ids !== undefined && !Array.isArray(req.body.client_ids)) {
      return res.status(400).json({ error: 'client_ids 必须是数组' })
    }
    if (req.body.images !== undefined && !Array.isArray(req.body.images)) {
      return res.status(400).json({ error: 'images 必须是数组' })
    }

    // JSON 字段序列化
    if (req.body.client_ids) req.body.client_ids = JSON.stringify(req.body.client_ids)
    if (req.body.images) req.body.images = JSON.stringify(req.body.images)

    await updateRecord(req, res, 'playlists')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/playlists/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    const userId = req.headers['x-user-id'] || req.query.user_id

    if (role === 'teacher' && !checkPermission(role, 'manage_all_playlists')) {
      const existing = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'playlists',
        where: { id: parseInt(req.params.id) }, limit: 1
      })
      if (!existing.rows || existing.rows.length === 0) {
        return res.status(404).json({ error: '播放列表不存在' })
      }
      if (existing.rows[0].owner_id !== parseInt(userId)) {
        return res.status(403).json({ error: '您只能删除自己的播放列表' })
      }
    }

    await deleteRecord(req, res, 'playlists')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 播放日志 API
// ═══════════════════════════════════════
app.get('/api/playback-logs', (req, res) => listRecords(req, res, 'playback_logs'))

app.post('/api/playback-logs', async (req, res) => {
  try {
    const { client_id, playlist_id, material_id, started_at, ended_at, duration_seconds } = req.body
    if (!client_id) return res.status(400).json({ error: '必须指定客户端' })
    if (!playlist_id) return res.status(400).json({ error: '必须指定播放列表' })

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'playback_logs',
      data: {
        client_id: parseInt(client_id),
        playlist_id: parseInt(playlist_id),
        material_id: material_id ? parseInt(material_id) : null,
        started_at: started_at || new Date().toISOString(),
        ended_at: ended_at || null,
        duration_seconds: duration_seconds || null
      }
    })
    res.json({ id: result.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 客户端配置 CRUD（管理端）
// ═══════════════════════════════════════
app.get('/api/configs', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_all_clients')) {
      return res.status(403).json({ error: '您没有权限查看所有配置' })
    }
    await listRecords(req, res, 'client_configs')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/configs', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_all_configs')) {
      return res.status(403).json({ error: '仅管理员可以创建配置' })
    }

    // 数据验证
    if (req.body.brightness !== undefined) {
      const err = validateRange(req.body.brightness, 0, 100, '亮度')
      if (err) return res.status(400).json({ error: err })
    }
    if (req.body.volume !== undefined) {
      const err = validateRange(req.body.volume, 0, 100, '音量')
      if (err) return res.status(400).json({ error: err })
    }

    const now = new Date().toISOString()
    req.body.config_version = 1
    req.body.updated_at = now

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'client_configs', data: req.body
    })

    // 同步 clients 表
    if (req.body.client_id) {
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'clients',
        where: { id: parseInt(req.body.client_id) },
        data: { config_version: 1 }
      })
    }

    res.json({ id: result.id, config_version: 1 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/configs/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_all_configs')) {
      return res.status(403).json({ error: '仅管理员可以修改配置' })
    }

    // 数据验证
    if (req.body.brightness !== undefined) {
      const err = validateRange(req.body.brightness, 0, 100, '亮度')
      if (err) return res.status(400).json({ error: err })
    }
    if (req.body.volume !== undefined) {
      const err = validateRange(req.body.volume, 0, 100, '音量')
      if (err) return res.status(400).json({ error: err })
    }

    // 递增配置版本
    const configId = parseInt(req.params.id)
    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'client_configs', where: { id: configId }, limit: 1
    })
    if (existing.rows && existing.rows.length > 0) {
      const newVersion = (existing.rows[0].config_version || 0) + 1
      req.body.config_version = newVersion
      req.body.updated_at = new Date().toISOString()

      // 同步 clients 表
      const clientId = existing.rows[0].client_id
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'clients',
        where: { id: clientId }, data: { config_version: newVersion }
      })
    }

    await updateRecord(req, res, 'client_configs')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/configs/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_all_configs')) {
      return res.status(403).json({ error: '仅管理员可以删除配置' })
    }
    await deleteRecord(req, res, 'client_configs')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 统计 API
// ═══════════════════════════════════════

// 客户端统计
app.get('/api/statistics/clients', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_statistics')) {
      return res.status(403).json({ error: '您没有权限查看统计数据' })
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'clients', limit: 10000
    })
    const rows = result.rows || []
    const now = Date.now()

    // 统计在线/离线
    let onlineCount = 0
    let offlineCount = 0
    for (const client of rows) {
      if (client.last_seen && (now - new Date(client.last_seen).getTime()) <= OFFLINE_THRESHOLD_MS) {
        onlineCount++
      } else {
        offlineCount++
      }
    }

    // 按教室分布统计
    const byClassroom = {}
    for (const client of rows) {
      const key = client.classroom_id ? `教室#${client.classroom_id}` : '未分配教室'
      byClassroom[key] = (byClassroom[key] || 0) + 1
    }

    res.json({
      total: rows.length,
      online: onlineCount,
      offline: offlineCount,
      byClassroom
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 播放统计
app.get('/api/statistics/playback', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_statistics')) {
      return res.status(403).json({ error: '您没有权限查看播放统计' })
    }

    const logsResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'playback_logs', limit: 10000
    })
    const logs = logsResult.rows || []

    // 最常播放的素材
    const materialPlayCounts = {}
    for (const log of logs) {
      if (log.material_id) {
        const key = `素材#${log.material_id}`
        materialPlayCounts[key] = (materialPlayCounts[key] || 0) + 1
      }
    }

    // 按播放次数排序
    const mostPlayed = Object.entries(materialPlayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    // 平均播放时长
    const logsWithDuration = logs.filter(l => l.duration_seconds && l.duration_seconds > 0)
    const avgDuration = logsWithDuration.length > 0
      ? Math.round(logsWithDuration.reduce((sum, l) => sum + l.duration_seconds, 0) / logsWithDuration.length)
      : 0

    // 客户端在线时长统计
    const clientsResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'clients', limit: 10000
    })
    const clients = clientsResult.rows || []
    const now = Date.now()

    const clientUptime = {}
    for (const client of clients) {
      if (client.last_seen) {
        const lastSeenMs = new Date(client.last_seen).getTime()
        const uptimeMs = now - lastSeenMs
        // 只统计 24 小时内的活跃时长
        const uptimeMinutes = Math.min(Math.round(uptimeMs / 60000), 1440)
        clientUptime[`客户端#${client.id}`] = uptimeMinutes
      }
    }

    res.json({
      totalLogs: logs.length,
      mostPlayed,
      avgDurationSeconds: avgDuration,
      clientUptime
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
