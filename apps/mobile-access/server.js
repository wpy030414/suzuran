import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'mobile-access', port: 8101 })

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
  access_devices: [
    { name: 'name', type: 'text' },
    { name: 'ezcloud_device_id', type: 'text' },
    { name: 'location', type: 'text', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'device_type', type: 'text' },
    { name: 'protocol', type: 'text' },
    { name: 'ip_address', type: 'text', nullable: true },
    { name: 'port', type: 'integer', nullable: true },
    { name: 'is_online', type: 'boolean', default: true },
    { name: 'last_heartbeat', type: 'timestamp', nullable: true },
    { name: 'open_duration', type: 'integer', default: 5 },
    { name: 'unlock_count', type: 'integer', default: 0 },
    { name: 'last_unlock_at', type: 'timestamp', nullable: true },
    { name: 'description', type: 'text', nullable: true },
    { name: 'created_at', type: 'timestamp' },
    { name: 'updated_at', type: 'timestamp' }
  ],
  access_logs: [
    { name: 'device_id', type: 'integer' },
    { name: 'user_id', type: 'integer' },
    { name: 'device_name', type: 'text' },
    { name: 'user_name', type: 'text' },
    { name: 'action', type: 'text' },
    { name: 'result', type: 'text' },
    { name: 'method', type: 'text' },
    { name: 'error_message', type: 'text', nullable: true },
    { name: 'ip_address', type: 'text', nullable: true },
    { name: 'duration_ms', type: 'integer', nullable: true },
    { name: 'simulation_mode', type: 'boolean', default: false },
    { name: 'timestamp', type: 'timestamp' }
  ],
  access_permissions: [
    { name: 'user_id', type: 'integer' },
    { name: 'user_name', type: 'text' },
    { name: 'device_ids', type: 'jsonb' },
    { name: 'permission_type', type: 'text' },
    { name: 'schedule_config', type: 'jsonb', nullable: true },
    { name: 'valid_from', type: 'timestamp' },
    { name: 'valid_until', type: 'timestamp' },
    { name: 'is_active', type: 'boolean', default: true },
    { name: 'granted_by', type: 'integer', nullable: true },
    { name: 'created_at', type: 'timestamp' },
    { name: 'updated_at', type: 'timestamp' }
  ],
  ezcloud_credentials: [
    { name: 'name', type: 'text' },
    { name: 'app_key', type: 'text' },
    { name: 'app_secret', type: 'text' },
    { name: 'api_host', type: 'text' },
    { name: 'team_id', type: 'text', nullable: true },
    { name: 'token', type: 'text', nullable: true },
    { name: 'token_expires_at', type: 'timestamp', nullable: true },
    { name: 'is_active', type: 'boolean', default: true },
    { name: 'created_at', type: 'timestamp' },
    { name: 'updated_at', type: 'timestamp' }
  ]
}

// ═══════════════════════════════════════
// 角色权限矩阵
// ═══════════════════════════════════════
const ROLE_PERMISSIONS = {
  admin: {
    manage_devices: true,
    manage_permissions: true,
    manage_credentials: true,
    unlock_any: true,
    view_all_logs: true,
    view_statistics: true,
    view_dashboard: true,
    manage_users: true,
    bypass_schedule: true,
    delete_logs: false
  },
  authorized_user: {
    manage_devices: false,
    manage_permissions: false,
    manage_credentials: false,
    unlock_any: false,
    view_all_logs: false,
    view_statistics: true,
    view_dashboard: true,
    manage_users: false,
    bypass_schedule: false,
    delete_logs: false
  },
  viewer: {
    manage_devices: false,
    manage_permissions: false,
    manage_credentials: false,
    unlock_any: false,
    view_all_logs: false,
    view_statistics: false,
    view_dashboard: false,
    manage_users: false,
    bypass_schedule: false,
    delete_logs: false
  }
}

// ─── 合法枚举 ───
const VALID_DEVICE_TYPES = ['door', 'gate', 'barrier']
const VALID_PROTOCOLS = ['ezcloud', 'local']
const VALID_METHODS = ['app', 'card', 'face', 'remote']
const VALID_PERMISSION_TYPES = ['permanent', 'temporary', 'schedule']
const VALID_ACTIONS = ['unlock', 'lock', 'config', 'heartbeat']
const VALID_RESULTS = ['success', 'failed', 'timeout', 'denied']

// ─── 内存速率限制器（开门操作） ───
const unlockRateMap = new Map()
const UNLOCK_RATE_WINDOW_MS = 60 * 1000 // 1 分钟
const UNLOCK_RATE_MAX = 10 // 每分钟最多 10 次开门

// ═══════════════════════════════════════
// 核心辅助函数
// ═══════════════════════════════════════

/** 获取用户角色 */
function getUserRole(req) {
  return req.headers['x-user-role'] || req.query.role || 'viewer'
}

/** 检查角色权限 */
function checkPermission(role, action) {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer
  return perms[action] || false
}

/** 获取用户 ID */
function getUserId(req) {
  const id = req.headers['x-user-id'] || req.query.user_id
  return id ? parseInt(id) : null
}

/** 获取用户名 */
function getUserName(req) {
  return req.headers['x-user-name'] || req.query.user_name || `用户#${getUserId(req) || 0}`
}

/** 获取客户端 IP */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.ip
    || 'unknown'
}

/** 权限中间件（基于动作） */
function requirePermission(action) {
  return (req, res, next) => {
    const role = getUserRole(req)
    if (!checkPermission(role, action)) {
      return res.status(403).json({ error: `权限不足，需要 ${action} 权限` })
    }
    req.userRole = role
    req.userId = getUserId(req)
    req.userName = getUserName(req)
    next()
  }
}

// ─── 数据验证函数 ───

function validateDeviceName(name) {
  if (!name || !String(name).trim()) return { valid: false, message: '设备名称不能为空' }
  if (String(name).trim().length > 100) return { valid: false, message: '设备名称不能超过 100 个字符' }
  return { valid: true }
}

function validateEzcloudDeviceId(id) {
  if (!id || !String(id).trim()) return { valid: false, message: 'EZCloud 设备 ID 不能为空' }
  return { valid: true }
}

function validateDeviceType(type) {
  if (type && !VALID_DEVICE_TYPES.includes(type)) {
    return { valid: false, message: `设备类型无效，可选值：${VALID_DEVICE_TYPES.join('/')}` }
  }
  return { valid: true }
}

function validateProtocol(protocol) {
  if (protocol && !VALID_PROTOCOLS.includes(protocol)) {
    return { valid: false, message: `协议类型无效，可选值：${VALID_PROTOCOLS.join('/')}` }
  }
  return { valid: true }
}

function validateOpenDuration(duration) {
  if (duration !== undefined && duration !== null) {
    const num = parseInt(duration)
    if (isNaN(num) || num < 1 || num > 60) {
      return { valid: false, message: '开门持续时间必须在 1-60 秒之间' }
    }
  }
  return { valid: true }
}

function validatePort(port) {
  if (port !== undefined && port !== null) {
    const num = parseInt(port)
    if (isNaN(num) || num < 1 || num > 65535) {
      return { valid: false, message: '端口号必须在 1-65535 之间' }
    }
  }
  return { valid: true }
}

function validatePermissionType(type) {
  if (type && !VALID_PERMISSION_TYPES.includes(type)) {
    return { valid: false, message: `权限类型无效，可选值：${VALID_PERMISSION_TYPES.join('/')}` }
  }
  return { valid: true }
}

function validateDateRange(validFrom, validUntil) {
  if (validFrom && validUntil) {
    if (new Date(validFrom) >= new Date(validUntil)) {
      return { valid: false, message: '有效期开始时间必须早于结束时间' }
    }
  }
  return { valid: true }
}

function validateMethod(method) {
  if (method && !VALID_METHODS.includes(method)) {
    return { valid: false, message: `开门方式无效，可选值：${VALID_METHODS.join('/')}` }
  }
  return { valid: true }
}

function parseDeviceIds(deviceIds) {
  let parsed = deviceIds
  if (typeof deviceIds === 'string') {
    try { parsed = JSON.parse(deviceIds) } catch { parsed = [] }
  }
  if (!Array.isArray(parsed)) parsed = []
  return parsed.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0)
}

// ─── 速率限制 ───

function checkUnlockRate(userId) {
  const key = String(userId)
  const now = Date.now()

  if (!unlockRateMap.has(key)) {
    unlockRateMap.set(key, [])
  }

  const timestamps = unlockRateMap.get(key).filter(t => now - t < UNLOCK_RATE_WINDOW_MS)
  unlockRateMap.set(key, timestamps)

  if (timestamps.length >= UNLOCK_RATE_MAX) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((UNLOCK_RATE_WINDOW_MS - (now - timestamps[0])) / 1000)
    }
  }

  timestamps.push(now)
  unlockRateMap.set(key, timestamps)
  return { allowed: true, remaining: UNLOCK_RATE_MAX - timestamps.length }
}

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

// ═══════════════════════════════════════
// EZCloud API 集成
// ═══════════════════════════════════════

async function getEZCloudToken(orgId) {
  const creds = await app.mcp.call('data.query', {
    orgId, tableName: 'ezcloud_credentials',
    where: { is_active: true },
    limit: 1
  })
  if (!creds.rows || creds.rows.length === 0) {
    throw new Error('EZCloud 凭据未配置')
  }
  const cred = creds.rows[0]

  // 检查 token 是否仍然有效（提前 5 分钟刷新）
  if (cred.token && cred.token_expires_at) {
    const expiresAt = new Date(cred.token_expires_at)
    const bufferMs = 5 * 60 * 1000
    if (expiresAt.getTime() > Date.now() + bufferMs) {
      return { token: cred.token, apiHost: cred.api_host, teamId: cred.team_id }
    }
  }

  // 请求新 token
  const host = cred.api_host || 'https://ezcloud.uniview.com'
  const response = await fetch(`${host}/openapi/user/app/token/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: cred.app_key, secretKey: cred.app_secret })
  })

  if (!response.ok) {
    throw new Error(`EZCloud 认证失败: HTTP ${response.status}`)
  }

  const data = await response.json()
  const token = data.data?.accessToken || data.token
  const expiresIn = data.data?.expiresIn || data.expires_in || 7200

  if (!token) throw new Error('获取 EZCloud token 失败：响应中无 token')

  // 保存 token
  await app.mcp.call('data.update', {
    orgId, tableName: 'ezcloud_credentials',
    where: { id: cred.id },
    data: {
      token,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }
  })

  return { token, apiHost: host, teamId: cred.team_id }
}

async function sendUnlockCommand(device, token, apiHost, teamId) {
  const host = apiHost || 'https://ezcloud.uniview.com'
  const response = await fetch(`${host}/openAPI/acs/v1/device/door/control`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
    body: JSON.stringify({
      teamId: teamId || 'default',
      command: 1,
      deviceSerial: device.ezcloud_device_id
    })
  })

  if (!response.ok) {
    throw new Error(`EZCloud 开门指令失败: HTTP ${response.status}`)
  }

  const data = await response.json()
  if (data.code && data.code !== 200 && data.code !== '200') {
    throw new Error(data.msg || data.message || '开门指令被拒绝')
  }
  return data
}

// ═══════════════════════════════════════
// 权限检查辅助
// ═══════════════════════════════════════

async function checkUserPermission(orgId, userId, deviceId, role) {
  // 管理员可绕过权限检查
  if (checkPermission(role, 'unlock_any')) return { allowed: true, reason: '管理员权限' }

  const perms = await app.mcp.call('data.query', {
    orgId, tableName: 'access_permissions',
    where: { user_id: parseInt(userId), is_active: true },
    limit: 100
  })
  if (!perms.rows || perms.rows.length === 0) {
    return { allowed: false, reason: '未找到有效权限记录' }
  }

  const now = new Date()
  for (const perm of perms.rows) {
    // 检查有效期
    if (perm.valid_from && new Date(perm.valid_from) > now) continue
    if (perm.valid_until && new Date(perm.valid_until) < now) continue

    // 检查 schedule_config（如果是 schedule 类型权限）
    if (perm.permission_type === 'schedule' && perm.schedule_config) {
      let schedule = perm.schedule_config
      if (typeof schedule === 'string') {
        try { schedule = JSON.parse(schedule) } catch { schedule = null }
      }
      if (schedule && !checkScheduleAccess(schedule, now)) continue
    }

    // 检查设备列表
    let deviceIds = perm.device_ids
    if (typeof deviceIds === 'string') {
      try { deviceIds = JSON.parse(deviceIds) } catch { deviceIds = [] }
    }
    if (Array.isArray(deviceIds) && deviceIds.includes(parseInt(deviceId))) {
      return { allowed: true, reason: `权限匹配（${perm.permission_type}）` }
    }
  }

  return { allowed: false, reason: '当前时段或设备不在授权范围内' }
}

function checkScheduleAccess(schedule, now) {
  // schedule 格式: { days_of_week: [1,2,3,4,5], time_start: "08:00", time_end: "18:00" }
  if (!schedule) return true

  const dayOfWeek = now.getDay()
  if (schedule.days_of_week && Array.isArray(schedule.days_of_week)) {
    if (!schedule.days_of_week.includes(dayOfWeek)) return false
  }

  if (schedule.time_start && schedule.time_end) {
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const currentMinutes = hours * 60 + minutes

    const [startH, startM] = schedule.time_start.split(':').map(Number)
    const [endH, endM] = schedule.time_end.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (currentMinutes < startMinutes || currentMinutes > endMinutes) return false
  }

  return true
}

// ─── 日志写入辅助 ───
async function writeAccessLog(orgId, logData) {
  try {
    await app.mcp.call('data.insert', {
      orgId, tableName: 'access_logs',
      data: {
        device_id: logData.device_id,
        user_id: logData.user_id,
        device_name: logData.device_name || '',
        user_name: logData.user_name || `用户#${logData.user_id}`,
        action: logData.action || 'unlock',
        result: logData.result || 'failed',
        method: logData.method || 'app',
        error_message: logData.error_message || null,
        ip_address: logData.ip_address || null,
        duration_ms: logData.duration_ms || null,
        simulation_mode: logData.simulation_mode || false,
        timestamp: new Date().toISOString()
      }
    })
  } catch (e) {
    console.error(`[log] Failed to write access log: ${e.message}`)
  }
}

// ═══════════════════════════════════════
// 初始化
// ═══════════════════════════════════════
app.onStart(async () => {
  for (const [tableName, columns] of Object.entries(TABLES)) {
    try {
      await app.mcp.call('data.create_table', { orgId: app.orgId, tableName, columns })
      console.log(`[init] Table '${tableName}' ready`)
    } catch (e) {
      console.log(`[init] Table '${tableName}' already exists`)
    }
  }

  // 从环境变量初始化 EZCloud 凭据
  try {
    const existing = await app.mcp.call('data.query', {
      orgId: app.orgId, tableName: 'ezcloud_credentials', limit: 1
    })
    if (!existing.rows || existing.rows.length === 0) {
      const appKey = process.env.EZCLOUD_APP_KEY
      const appSecret = process.env.EZCLOUD_APP_SECRET
      const apiHost = process.env.EZCLOUD_API_HOST || 'https://ezcloud.uniview.com'
      const teamId = process.env.EZCLOUD_TEAM_ID || null
      if (appKey && appSecret) {
        const now = new Date().toISOString()
        await app.mcp.call('data.insert', {
          orgId: app.orgId, tableName: 'ezcloud_credentials',
          data: {
            name: 'default',
            app_key: appKey,
            app_secret: appSecret,
            api_host: apiHost,
            team_id: teamId,
            token: null,
            token_expires_at: null,
            is_active: true,
            created_at: now,
            updated_at: now
          }
        })
        console.log('[init] EZCloud credentials initialized from environment')
      } else {
        console.log('[init] EZCloud credentials not found in environment, running in simulation mode')
      }
    }
  } catch (e) {
    console.log(`[init] Credential init skipped: ${e.message}`)
  }
})

// ═══════════════════════════════════════
// 设备管理 API
// ═══════════════════════════════════════

app.get('/api/devices', async (req, res) => {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy', 'search'].includes(k)) where[k] = v
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_devices', where,
      orderBy: req.query.orderBy || 'id ASC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })

    let rows = result.rows || []

    // 支持关键词搜索
    if (req.query.search) {
      const keyword = req.query.search.toLowerCase()
      rows = rows.filter(d =>
        (d.name || '').toLowerCase().includes(keyword) ||
        (d.location || '').toLowerCase().includes(keyword) ||
        (d.ezcloud_device_id || '').toLowerCase().includes(keyword)
      )
    }

    res.json({ rows, count: rows.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/devices/:id', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_devices',
      where: { id: deviceId }, limit: 1
    })
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '设备不存在' })
    }
    res.json(result.rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/devices', requirePermission('manage_devices'), async (req, res) => {
  try {
    const { name, ezcloud_device_id, device_type, protocol, location,
            ip_address, port, open_duration, description } = req.body

    // 数据验证
    const nameCheck = validateDeviceName(name)
    if (!nameCheck.valid) return res.status(400).json({ error: nameCheck.message })

    const idCheck = validateEzcloudDeviceId(ezcloud_device_id)
    if (!idCheck.valid) return res.status(400).json({ error: idCheck.message })

    const typeCheck = validateDeviceType(device_type)
    if (!typeCheck.valid) return res.status(400).json({ error: typeCheck.message })

    const protoCheck = validateProtocol(protocol)
    if (!protoCheck.valid) return res.status(400).json({ error: protoCheck.message })

    const durationCheck = validateOpenDuration(open_duration)
    if (!durationCheck.valid) return res.status(400).json({ error: durationCheck.message })

    const portCheck = validatePort(port)
    if (!portCheck.valid) return res.status(400).json({ error: portCheck.message })

    // 检查设备 ID 唯一性
    const duplicate = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_devices',
      where: { ezcloud_device_id: String(ezcloud_device_id).trim() },
      limit: 1
    })
    if (duplicate.rows && duplicate.rows.length > 0) {
      return res.status(400).json({ error: `EZCloud 设备 ID "${ezcloud_device_id}" 已被注册` })
    }

    const now = new Date().toISOString()
    const data = {
      name: String(name).trim(),
      ezcloud_device_id: String(ezcloud_device_id).trim(),
      device_type: device_type || 'door',
      protocol: protocol || 'ezcloud',
      location: location || '',
      ip_address: ip_address || null,
      port: port ? parseInt(port) : null,
      open_duration: open_duration ? parseInt(open_duration) : 5,
      description: description || null,
      status: 'online',
      is_online: true,
      unlock_count: 0,
      last_heartbeat: now,
      last_unlock_at: null,
      created_at: now,
      updated_at: now
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'access_devices', data
    })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/devices/:id', requirePermission('manage_devices'), async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id)

    // 验证设备存在
    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_devices',
      where: { id: deviceId }, limit: 1
    })
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: '设备不存在' })
    }

    // 字段验证
    if (req.body.device_type) {
      const check = validateDeviceType(req.body.device_type)
      if (!check.valid) return res.status(400).json({ error: check.message })
    }
    if (req.body.protocol) {
      const check = validateProtocol(req.body.protocol)
      if (!check.valid) return res.status(400).json({ error: check.message })
    }
    if (req.body.open_duration !== undefined) {
      const check = validateOpenDuration(req.body.open_duration)
      if (!check.valid) return res.status(400).json({ error: check.message })
    }
    if (req.body.port !== undefined && req.body.port !== null) {
      const check = validatePort(req.body.port)
      if (!check.valid) return res.status(400).json({ error: check.message })
    }

    // 如果更新了 ezcloud_device_id，检查唯一性
    if (req.body.ezcloud_device_id) {
      const newId = String(req.body.ezcloud_device_id).trim()
      const oldId = existing.rows[0].ezcloud_device_id
      if (newId !== oldId) {
        const dup = await app.mcp.call('data.query', {
          orgId: req.orgId, tableName: 'access_devices',
          where: { ezcloud_device_id: newId }, limit: 1
        })
        if (dup.rows && dup.rows.length > 0) {
          return res.status(400).json({ error: `EZCloud 设备 ID "${newId}" 已被其他设备使用` })
        }
      }
    }

    req.body.updated_at = new Date().toISOString()

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'access_devices',
      where: { id: deviceId }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/devices/:id', requirePermission('manage_devices'), async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id)

    // 检查是否有关联的活跃权限
    const perms = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_permissions',
      where: { is_active: true }, limit: 1000
    })
    const relatedPerms = (perms.rows || []).filter(p => {
      let ids = p.device_ids
      if (typeof ids === 'string') { try { ids = JSON.parse(ids) } catch { ids = [] } }
      return Array.isArray(ids) && ids.includes(deviceId)
    })
    if (relatedPerms.length > 0) {
      return res.status(400).json({
        error: `该设备存在 ${relatedPerms.length} 条活跃权限记录，请先移除相关权限后再删除`
      })
    }

    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'access_devices',
      where: { id: deviceId }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 设备解锁（核心业务逻辑）
// ═══════════════════════════════════════

app.post('/api/devices/:id/unlock', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id)
    const role = getUserRole(req)
    const userId = getUserId(req)
    const userName = getUserName(req)
    const { user_id, user_name, method } = req.body

    // 使用请求体中的用户信息或请求头中的
    const effectiveUserId = user_id ? parseInt(user_id) : userId
    const effectiveUserName = user_name || userName

    if (!effectiveUserId) {
      return res.status(400).json({ error: '必须指定用户 ID（通过请求头 x-user-id 或请求体 user_id）' })
    }

    // 角色检查：至少需要 authorized_user 角色或有权限记录
    if (role === 'viewer') {
      return res.status(403).json({ error: '您没有权限执行开门操作' })
    }

    // 开门方式验证
    const methodCheck = validateMethod(method)
    if (!methodCheck.valid) return res.status(400).json({ error: methodCheck.message })

    // 速率限制检查
    const rateCheck = checkUnlockRate(effectiveUserId)
    if (!rateCheck.allowed) {
      await writeAccessLog(req.orgId, {
        device_id: deviceId,
        user_id: effectiveUserId,
        device_name: '',
        user_name: effectiveUserName,
        action: 'unlock',
        result: 'denied',
        method: method || 'app',
        error_message: `速率限制：${rateCheck.retryAfter}秒后重试`,
        ip_address: getClientIp(req)
      })
      return res.status(429).json({
        error: '开门操作过于频繁，请稍后再试',
        retry_after_seconds: rateCheck.retryAfter
      })
    }

    const startTime = Date.now()

    // 查询设备信息
    const deviceResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_devices',
      where: { id: deviceId }, limit: 1
    })
    if (!deviceResult.rows || deviceResult.rows.length === 0) {
      return res.status(404).json({ error: '设备不存在' })
    }
    const device = deviceResult.rows[0]

    // 检查设备在线状态
    if (device.is_online === false || device.status === 'offline') {
      await writeAccessLog(req.orgId, {
        device_id: deviceId,
        user_id: effectiveUserId,
        device_name: device.name,
        user_name: effectiveUserName,
        action: 'unlock',
        result: 'failed',
        method: method || 'app',
        error_message: '设备离线，无法开门',
        ip_address: getClientIp(req)
      })
      return res.status(503).json({ error: '设备当前离线，无法执行开门操作' })
    }

    // 检查用户权限
    const permCheck = await checkUserPermission(req.orgId, effectiveUserId, deviceId, role)
    if (!permCheck.allowed) {
      await writeAccessLog(req.orgId, {
        device_id: deviceId,
        user_id: effectiveUserId,
        device_name: device.name,
        user_name: effectiveUserName,
        action: 'unlock',
        result: 'denied',
        method: method || 'app',
        error_message: permCheck.reason,
        ip_address: getClientIp(req)
      })
      return res.status(403).json({ error: `您没有权限操作此设备：${permCheck.reason}` })
    }

    let unlockResult = 'success'
    let errorMessage = null
    let simulationMode = false

    try {
      // 尝试通过 EZCloud API 发送解锁命令
      const { token, apiHost, teamId } = await getEZCloudToken(req.orgId)
      await sendUnlockCommand(device, token, apiHost, teamId)
    } catch (ezError) {
      // EZCloud 未配置或调用失败，降级为模拟模式
      if (ezError.message.includes('未配置') || ezError.message.includes('fetch') ||
          ezError.message.includes('ECONNREFUSED') || ezError.message.includes('ENOTFOUND')) {
        simulationMode = true
        console.log(`[unlock] Simulation mode: ${ezError.message}`)
      } else {
        unlockResult = 'failed'
        errorMessage = ezError.message
      }
    }

    const durationMs = Date.now() - startTime

    // 更新设备统计
    if (unlockResult === 'success') {
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'access_devices',
        where: { id: deviceId },
        data: {
          unlock_count: (device.unlock_count || 0) + 1,
          last_unlock_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })
    }

    // 记录访问日志
    await writeAccessLog(req.orgId, {
      device_id: deviceId,
      user_id: effectiveUserId,
      device_name: device.name,
      user_name: effectiveUserName,
      action: 'unlock',
      result: unlockResult,
      method: method || 'app',
      error_message: errorMessage,
      ip_address: getClientIp(req),
      duration_ms: durationMs,
      simulation_mode: simulationMode
    })

    res.json({
      success: unlockResult === 'success',
      message: simulationMode
        ? '设备已解锁（模拟模式 — EZCloud 未配置）'
        : unlockResult === 'success' ? '设备已解锁' : '解锁失败',
      simulation_mode: simulationMode,
      device_name: device.name,
      device_location: device.location,
      open_duration: device.open_duration || 5,
      duration_ms: durationMs,
      remaining_unlocks: rateCheck.remaining
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 设备状态监控 API
// ═══════════════════════════════════════

app.get('/api/devices/status', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_devices',
      orderBy: 'id ASC', limit: 1000
    })
    const devices = (result.rows || []).map(d => ({
      id: d.id,
      name: d.name,
      location: d.location,
      device_type: d.device_type,
      is_online: d.is_online,
      status: d.status,
      last_heartbeat: d.last_heartbeat,
      unlock_count: d.unlock_count || 0,
      last_unlock_at: d.last_unlock_at
    }))

    const online = devices.filter(d => d.is_online).length
    res.json({
      devices,
      total: devices.length,
      online,
      offline: devices.length - online
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/devices/:id/status', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_devices',
      where: { id: deviceId }, limit: 1
    })
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '设备不存在' })
    }
    const d = result.rows[0]

    // 获取最近的日志
    const logs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_logs',
      where: { device_id: deviceId },
      orderBy: 'timestamp DESC', limit: 10
    })

    // 获取关联的活跃权限数
    const perms = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_permissions',
      where: { is_active: true }, limit: 1000
    })
    const activePermCount = (perms.rows || []).filter(p => {
      let ids = p.device_ids
      if (typeof ids === 'string') { try { ids = JSON.parse(ids) } catch { ids = [] } }
      return Array.isArray(ids) && ids.includes(deviceId)
    }).length

    res.json({
      id: d.id,
      name: d.name,
      location: d.location,
      device_type: d.device_type,
      protocol: d.protocol,
      ip_address: d.ip_address,
      port: d.port,
      is_online: d.is_online,
      last_heartbeat: d.last_heartbeat,
      open_duration: d.open_duration,
      status: d.status,
      unlock_count: d.unlock_count || 0,
      last_unlock_at: d.last_unlock_at,
      description: d.description,
      active_permission_count: activePermCount,
      recent_logs: logs.rows || []
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/devices/:id/heartbeat', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id)

    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_devices',
      where: { id: deviceId }, limit: 1
    })
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: '设备不存在' })
    }

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'access_devices',
      where: { id: deviceId },
      data: {
        last_heartbeat: new Date().toISOString(),
        is_online: true,
        status: 'online',
        updated_at: new Date().toISOString()
      }
    })
    res.json({ success: true, message: '心跳已更新' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 批量心跳检测 — 标记超时设备为离线
app.post('/api/devices/batch-heartbeat-check', requirePermission('manage_devices'), async (req, res) => {
  try {
    const timeoutMinutes = parseInt(req.query.timeout || '5')
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString()

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_devices', limit: 1000
    })
    const devices = result.rows || []

    let offlineCount = 0
    for (const d of devices) {
      if (d.is_online && d.last_heartbeat && new Date(d.last_heartbeat) < new Date(cutoff)) {
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'access_devices',
          where: { id: d.id },
          data: { is_online: false, status: 'offline', updated_at: new Date().toISOString() }
        })
        offlineCount++
      }
    }

    res.json({
      checked: devices.length,
      marked_offline: offlineCount,
      timeout_minutes: timeoutMinutes
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── 监控大盘 ───
app.get('/api/monitoring/dashboard', requirePermission('view_dashboard'), async (req, res) => {
  try {
    const devices = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_devices', limit: 1000
    })
    const allDevices = devices.rows || []

    const total = allDevices.length
    const online = allDevices.filter(d => d.is_online).length
    const offline = total - online

    // 最近 24 小时日志
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const logs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_logs', limit: 10000
    })
    const recentLogs = (logs.rows || []).filter(l => new Date(l.timestamp) >= new Date(oneDayAgo))
    const recentErrors = recentLogs.filter(l => l.result === 'failed' || l.result === 'denied').length
    const recentSuccess = recentLogs.filter(l => l.result === 'success').length

    // 按设备类型统计
    const byType = {}
    for (const d of allDevices) {
      const t = d.device_type || 'door'
      byType[t] = (byType[t] || 0) + 1
    }

    // 按位置统计
    const byLocation = {}
    for (const d of allDevices) {
      const loc = d.location || '未设置'
      byLocation[loc] = (byLocation[loc] || 0) + 1
    }

    // 今日开门次数 Top 5 设备
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayLogs = (logs.rows || []).filter(l =>
      l.result === 'success' && new Date(l.timestamp) >= todayStart
    )
    const deviceUnlockCounts = {}
    for (const l of todayLogs) {
      const key = l.device_name || `设备#${l.device_id}`
      deviceUnlockCounts[key] = (deviceUnlockCounts[key] || 0) + 1
    }
    const topDevices = Object.entries(deviceUnlockCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ device_name: name, unlock_count: count }))

    res.json({
      total,
      online,
      offline,
      recent_24h: {
        total_operations: recentLogs.length,
        success: recentSuccess,
        errors: recentErrors,
        error_rate: recentLogs.length > 0
          ? Math.round((recentErrors / recentLogs.length) * 10000) / 100
          : 0
      },
      by_type: byType,
      by_location: byLocation,
      today_top_devices: topDevices,
      devices: allDevices.map(d => ({
        id: d.id,
        name: d.name,
        location: d.location,
        device_type: d.device_type,
        is_online: d.is_online,
        last_heartbeat: d.last_heartbeat,
        unlock_count: d.unlock_count || 0
      }))
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 访问日志 API
// ═══════════════════════════════════════

app.get('/api/logs', async (req, res) => {
  try {
    const role = getUserRole(req)
    const userId = getUserId(req)
    const where = {}

    // 非管理员只能看自己的日志
    if (!checkPermission(role, 'view_all_logs') && userId) {
      where.user_id = userId
    }

    // 支持过滤
    if (req.query.device_id) where.device_id = parseInt(req.query.device_id)
    if (req.query.result) where.result = req.query.result
    if (req.query.action) where.action = req.query.action
    if (req.query.method) where.method = req.query.method

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_logs', where,
      orderBy: req.query.orderBy || 'timestamp DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })

    // 支持关键词搜索（用户名/设备名）
    let rows = result.rows || []
    if (req.query.search) {
      const keyword = req.query.search.toLowerCase()
      rows = rows.filter(l =>
        (l.user_name || '').toLowerCase().includes(keyword) ||
        (l.device_name || '').toLowerCase().includes(keyword)
      )
    }

    res.json({ rows, count: rows.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 日志不可变：不提供 POST/PUT/DELETE

// ═══════════════════════════════════════
// 权限管理 API
// ═══════════════════════════════════════

app.get('/api/permissions', async (req, res) => {
  try {
    const role = getUserRole(req)
    const userId = getUserId(req)
    const where = {}

    // 非管理员只能看自己的权限
    if (!checkPermission(role, 'manage_permissions') && userId) {
      where.user_id = userId
    }

    if (req.query.user_id) where.user_id = parseInt(req.query.user_id)
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true'
    if (req.query.permission_type) where.permission_type = req.query.permission_type

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_permissions', where,
      orderBy: req.query.orderBy || 'id ASC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/permissions/check', async (req, res) => {
  try {
    const { user_id, device_id } = req.query
    if (!user_id || !device_id) {
      return res.status(400).json({ error: '必须指定 user_id 和 device_id' })
    }

    const role = getUserRole(req)
    const result = await checkUserPermission(req.orgId, parseInt(user_id), parseInt(device_id), role)
    res.json({
      user_id: parseInt(user_id),
      device_id: parseInt(device_id),
      allowed: result.allowed,
      reason: result.reason
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/permissions', requirePermission('manage_permissions'), async (req, res) => {
  try {
    const { user_id, user_name, device_ids, permission_type,
            schedule_config, valid_from, valid_until } = req.body

    // 数据验证
    if (!user_id) return res.status(400).json({ error: '必须指定用户 ID' })

    const parsedDeviceIds = parseDeviceIds(device_ids)
    if (parsedDeviceIds.length === 0) {
      return res.status(400).json({ error: '设备列表不能为空' })
    }

    // 验证所有设备存在
    for (const did of parsedDeviceIds) {
      const device = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'access_devices',
        where: { id: did }, limit: 1
      })
      if (!device.rows || device.rows.length === 0) {
        return res.status(400).json({ error: `设备 ID ${did} 不存在` })
      }
    }

    const typeCheck = validatePermissionType(permission_type)
    if (!typeCheck.valid) return res.status(400).json({ error: typeCheck.message })

    const dateCheck = validateDateRange(valid_from, valid_until)
    if (!dateCheck.valid) return res.status(400).json({ error: dateCheck.message })

    // schedule 类型必须有 schedule_config
    if (permission_type === 'schedule' && !schedule_config) {
      return res.status(400).json({ error: '定时权限类型必须提供 schedule_config' })
    }

    const now = new Date().toISOString()
    const data = {
      user_id: parseInt(user_id),
      user_name: user_name || `用户#${user_id}`,
      device_ids: JSON.stringify(parsedDeviceIds),
      permission_type: permission_type || 'temporary',
      schedule_config: schedule_config ? JSON.stringify(schedule_config) : null,
      valid_from: valid_from || now,
      valid_until: valid_until || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      granted_by: getUserId(req),
      created_at: now,
      updated_at: now
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'access_permissions', data
    })
    res.json({ id: result.id, user_id: parseInt(user_id), device_ids: parsedDeviceIds, permission_type: permission_type || 'temporary' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/permissions/:id', requirePermission('manage_permissions'), async (req, res) => {
  try {
    const permId = parseInt(req.params.id)

    // 验证权限记录存在
    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_permissions',
      where: { id: permId }, limit: 1
    })
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: '权限记录不存在' })
    }

    if (req.body.device_ids) {
      const parsed = parseDeviceIds(req.body.device_ids)
      if (parsed.length === 0) {
        return res.status(400).json({ error: '设备列表不能为空' })
      }
      req.body.device_ids = JSON.stringify(parsed)
    }

    if (req.body.permission_type) {
      const check = validatePermissionType(req.body.permission_type)
      if (!check.valid) return res.status(400).json({ error: check.message })
    }

    if (req.body.schedule_config) {
      req.body.schedule_config = JSON.stringify(req.body.schedule_config)
    }

    if (req.body.valid_from || req.body.valid_until) {
      const from = req.body.valid_from || existing.rows[0].valid_from
      const until = req.body.valid_until || existing.rows[0].valid_until
      const check = validateDateRange(from, until)
      if (!check.valid) return res.status(400).json({ error: check.message })
    }

    req.body.updated_at = new Date().toISOString()

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'access_permissions',
      where: { id: permId }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/permissions/:id', requirePermission('manage_permissions'), async (req, res) => {
  try {
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'access_permissions',
      where: { id: parseInt(req.params.id) }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 批量停用权限
app.post('/api/permissions/batch-deactivate', requirePermission('manage_permissions'), async (req, res) => {
  try {
    const { user_id, device_id } = req.body
    if (!user_id && !device_id) {
      return res.status(400).json({ error: '必须指定 user_id 或 device_id' })
    }

    const allPerms = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_permissions',
      where: { is_active: true }, limit: 1000
    })

    let deactivated = 0
    for (const perm of (allPerms.rows || [])) {
      let match = true
      if (user_id && perm.user_id !== parseInt(user_id)) match = false
      if (device_id) {
        let ids = perm.device_ids
        if (typeof ids === 'string') { try { ids = JSON.parse(ids) } catch { ids = [] } }
        if (!Array.isArray(ids) || !ids.includes(parseInt(device_id))) match = false
      }

      if (match) {
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'access_permissions',
          where: { id: perm.id },
          data: { is_active: false, updated_at: new Date().toISOString() }
        })
        deactivated++
      }
    }

    res.json({ success: true, deactivated_count: deactivated })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 凭据管理 API（仅管理员）
// ═══════════════════════════════════════

app.get('/api/credentials', requirePermission('manage_credentials'), async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'ezcloud_credentials', limit: 10
    })
    // 永远不暴露密钥
    const safeRows = (result.rows || []).map(r => ({
      id: r.id,
      name: r.name,
      app_key: r.app_key ? r.app_key.substring(0, 4) + '****' : null,
      api_host: r.api_host,
      team_id: r.team_id ? r.team_id.substring(0, 4) + '****' : null,
      has_token: !!r.token,
      token_expires_at: r.token_expires_at,
      token_valid: r.token_expires_at ? new Date(r.token_expires_at) > new Date() : false,
      is_active: r.is_active,
      created_at: r.created_at
    }))
    res.json({ rows: safeRows, count: safeRows.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/credentials', requirePermission('manage_credentials'), async (req, res) => {
  try {
    const { name, app_key, app_secret, api_host, team_id } = req.body

    if (!app_key || !app_secret) {
      return res.status(400).json({ error: 'App Key 和 App Secret 不能为空' })
    }

    const now = new Date().toISOString()
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'ezcloud_credentials',
      data: {
        name: name || 'default',
        app_key,
        app_secret,
        api_host: api_host || 'https://ezcloud.uniview.com',
        team_id: team_id || null,
        token: null,
        token_expires_at: null,
        is_active: true,
        created_at: now,
        updated_at: now
      }
    })
    res.json({ id: result.id, name, app_key: app_key.substring(0, 4) + '****' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/credentials/:id', requirePermission('manage_credentials'), async (req, res) => {
  try {
    const credId = parseInt(req.params.id)

    // 不允许通过此接口修改 token（token 由系统自动管理）
    delete req.body.token
    delete req.body.token_expires_at

    req.body.updated_at = new Date().toISOString()

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'ezcloud_credentials',
      where: { id: credId }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 手动刷新 EZCloud token
app.post('/api/credentials/:id/refresh-token', requirePermission('manage_credentials'), async (req, res) => {
  try {
    // 先清除旧 token 强制重新获取
    const credId = parseInt(req.params.id)
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'ezcloud_credentials',
      where: { id: credId },
      data: { token: null, token_expires_at: null, updated_at: new Date().toISOString() }
    })

    // 尝试获取新 token
    const { token, apiHost } = await getEZCloudToken(req.orgId)
    res.json({
      success: true,
      message: 'Token 已刷新',
      api_host: apiHost,
      token_valid: true
    })
  } catch (e) {
    res.status(500).json({ error: `Token 刷新失败: ${e.message}` })
  }
})

// ═══════════════════════════════════════
// 统计 API
// ═══════════════════════════════════════

// 按日期统计开门次数
app.get('/api/statistics/access-count', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_statistics')) {
      return res.status(403).json({ error: '您没有权限查看统计数据' })
    }

    const { device_id, date_from, date_to } = req.query

    const where = {}
    if (device_id) where.device_id = parseInt(device_id)

    const logs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_logs', where, limit: 10000
    })

    let rows = logs.rows || []
    if (date_from) rows = rows.filter(l => new Date(l.timestamp) >= new Date(date_from))
    if (date_to) rows = rows.filter(l => new Date(l.timestamp) <= new Date(date_to))

    // 按日期分组
    const byDate = {}
    for (const l of rows) {
      const date = new Date(l.timestamp).toISOString().split('T')[0]
      byDate[date] = (byDate[date] || 0) + 1
    }

    // 按结果分组
    const byResult = {}
    for (const l of rows) {
      const key = l.result || 'unknown'
      byResult[key] = (byResult[key] || 0) + 1
    }

    res.json({
      total: rows.length,
      by_date: byDate,
      by_result: byResult,
      date_from: date_from || null,
      date_to: date_to || null
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 按设备统计
app.get('/api/statistics/by-device', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_statistics')) {
      return res.status(403).json({ error: '您没有权限查看统计数据' })
    }

    const { date_from, date_to } = req.query

    const logs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_logs', limit: 10000
    })

    let rows = logs.rows || []
    if (date_from) rows = rows.filter(l => new Date(l.timestamp) >= new Date(date_from))
    if (date_to) rows = rows.filter(l => new Date(l.timestamp) <= new Date(date_to))

    const byDevice = {}
    for (const l of rows) {
      const key = l.device_name || `设备#${l.device_id}`
      if (!byDevice[key]) {
        byDevice[key] = { device_id: l.device_id, device_name: key, count: 0, success: 0, failed: 0, denied: 0, avg_duration_ms: null }
      }
      byDevice[key].count++
      if (l.result === 'success') byDevice[key].success++
      else if (l.result === 'denied') byDevice[key].denied++
      else byDevice[key].failed++
    }

    // 计算平均耗时
    const durationSums = {}
    const durationCounts = {}
    for (const l of rows) {
      if (l.duration_ms) {
        const key = l.device_name || `设备#${l.device_id}`
        durationSums[key] = (durationSums[key] || 0) + l.duration_ms
        durationCounts[key] = (durationCounts[key] || 0) + 1
      }
    }
    for (const key of Object.keys(byDevice)) {
      if (durationCounts[key]) {
        byDevice[key].avg_duration_ms = Math.round(durationSums[key] / durationCounts[key])
      }
    }

    res.json({ statistics: Object.values(byDevice) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 按用户统计
app.get('/api/statistics/by-user', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_statistics')) {
      return res.status(403).json({ error: '您没有权限查看统计数据' })
    }

    const { date_from, date_to } = req.query

    const logs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_logs', limit: 10000
    })

    let rows = logs.rows || []
    if (date_from) rows = rows.filter(l => new Date(l.timestamp) >= new Date(date_from))
    if (date_to) rows = rows.filter(l => new Date(l.timestamp) <= new Date(date_to))

    const byUser = {}
    for (const l of rows) {
      const key = l.user_name || `用户#${l.user_id}`
      if (!byUser[key]) {
        byUser[key] = { user_id: l.user_id, user_name: key, count: 0, success: 0, failed: 0, denied: 0 }
      }
      byUser[key].count++
      if (l.result === 'success') byUser[key].success++
      else if (l.result === 'denied') byUser[key].denied++
      else byUser[key].failed++
    }

    res.json({ statistics: Object.values(byUser) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 错误率统计
app.get('/api/statistics/error-rate', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_statistics')) {
      return res.status(403).json({ error: '您没有权限查看统计数据' })
    }

    const { date_from, date_to } = req.query

    const logs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_logs', limit: 10000
    })

    let rows = logs.rows || []
    if (date_from) rows = rows.filter(l => new Date(l.timestamp) >= new Date(date_from))
    if (date_to) rows = rows.filter(l => new Date(l.timestamp) <= new Date(date_to))

    const byDevice = {}
    for (const l of rows) {
      const key = l.device_name || `设备#${l.device_id}`
      if (!byDevice[key]) {
        byDevice[key] = { device_id: l.device_id, device_name: key, total: 0, errors: 0, denied: 0 }
      }
      byDevice[key].total++
      if (l.result === 'failed') byDevice[key].errors++
      if (l.result === 'denied') byDevice[key].denied++
    }

    const stats = Object.values(byDevice).map(d => ({
      ...d,
      error_rate: d.total > 0 ? Math.round((d.errors / d.total) * 10000) / 100 : 0,
      deny_rate: d.total > 0 ? Math.round((d.denied / d.total) * 10000) / 100 : 0
    }))

    res.json({ statistics: stats })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 高峰时段统计
app.get('/api/statistics/peak-hours', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_statistics')) {
      return res.status(403).json({ error: '您没有权限查看统计数据' })
    }

    const { date_from, date_to } = req.query

    const logs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_logs', limit: 10000
    })

    let rows = logs.rows || []
    if (date_from) rows = rows.filter(l => new Date(l.timestamp) >= new Date(date_from))
    if (date_to) rows = rows.filter(l => new Date(l.timestamp) <= new Date(date_to))

    // 按小时统计
    const byHour = {}
    for (let h = 0; h < 24; h++) byHour[h] = 0
    for (const l of rows) {
      const hour = new Date(l.timestamp).getHours()
      byHour[hour]++
    }

    // 按星期统计
    const byDayOfWeek = {}
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    for (let d = 0; d < 7; d++) byDayOfWeek[d] = 0
    for (const l of rows) {
      const dow = new Date(l.timestamp).getDay()
      byDayOfWeek[dow]++
    }

    // 找出高峰时段（Top 3）
    const sortedHours = Object.entries(byHour)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))

    res.json({
      by_hour: byHour,
      by_day_of_week: Object.fromEntries(
        Object.entries(byDayOfWeek).map(([k, v]) => [dayNames[k], v])
      ),
      peak_hours: sortedHours,
      total: rows.length
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 综合统计概览
app.get('/api/statistics/overview', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_statistics')) {
      return res.status(403).json({ error: '您没有权限查看统计数据' })
    }

    const [devices, logs, perms] = await Promise.all([
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'access_devices', limit: 1000 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'access_logs', limit: 10000 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'access_permissions', where: { is_active: true }, limit: 1000 })
    ])

    const deviceRows = devices.rows || []
    const logRows = logs.rows || []
    const permRows = perms.rows || []

    // 今日统计
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayLogs = logRows.filter(l => new Date(l.timestamp) >= todayStart)
    const todaySuccess = todayLogs.filter(l => l.result === 'success').length
    const todayFailed = todayLogs.filter(l => l.result === 'failed').length

    // 本周统计
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekLogs = logRows.filter(l => new Date(l.timestamp) >= weekStart)

    // 本月统计
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)
    const monthLogs = logRows.filter(l => new Date(l.timestamp) >= monthStart)

    res.json({
      devices: {
        total: deviceRows.length,
        online: deviceRows.filter(d => d.is_online).length,
        offline: deviceRows.filter(d => !d.is_online).length,
        total_unlocks: deviceRows.reduce((sum, d) => sum + (d.unlock_count || 0), 0)
      },
      permissions: {
        active: permRows.length,
        permanent: permRows.filter(p => p.permission_type === 'permanent').length,
        temporary: permRows.filter(p => p.permission_type === 'temporary').length,
        schedule: permRows.filter(p => p.permission_type === 'schedule').length
      },
      logs: {
        total: logRows.length,
        today: { total: todayLogs.length, success: todaySuccess, failed: todayFailed },
        this_week: weekLogs.length,
        this_month: monthLogs.length
      }
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 用户权限查询 API
// ═══════════════════════════════════════

app.get('/api/users/:id/permissions', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id)
    const role = getUserRole(req)
    const requesterId = getUserId(req)

    // 非管理员只能查自己的权限
    if (!checkPermission(role, 'manage_permissions') && requesterId !== targetUserId) {
      return res.status(403).json({ error: '您没有权限查看其他用户的权限' })
    }

    const perms = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_permissions',
      where: { user_id: targetUserId },
      orderBy: 'created_at DESC',
      limit: 100
    })

    // 解析 device_ids 并附加设备名称
    const permDetails = []
    for (const p of (perms.rows || [])) {
      let deviceIds = p.device_ids
      if (typeof deviceIds === 'string') {
        try { deviceIds = JSON.parse(deviceIds) } catch { deviceIds = [] }
      }

      // 获取设备名称
      const deviceNames = []
      for (const did of (Array.isArray(deviceIds) ? deviceIds : [])) {
        const device = await app.mcp.call('data.query', {
          orgId: req.orgId, tableName: 'access_devices',
          where: { id: parseInt(did) }, limit: 1
        })
        if (device.rows && device.rows.length > 0) {
          deviceNames.push({ id: did, name: device.rows[0].name, location: device.rows[0].location })
        } else {
          deviceNames.push({ id: did, name: `设备#${did}`, location: null })
        }
      }

      const now = new Date()
      const isActive = p.is_active &&
        (!p.valid_from || new Date(p.valid_from) <= now) &&
        (!p.valid_until || new Date(p.valid_until) >= now)

      permDetails.push({
        id: p.id,
        permission_type: p.permission_type,
        is_active: p.is_active,
        is_effectively_active: isActive,
        valid_from: p.valid_from,
        valid_until: p.valid_until,
        schedule_config: p.schedule_config,
        devices: deviceNames,
        granted_by: p.granted_by,
        created_at: p.created_at
      })
    }

    res.json({
      user_id: targetUserId,
      permissions: permDetails,
      total: permDetails.length,
      active_count: permDetails.filter(p => p.is_effectively_active).length
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/users/:id/logs', async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id)
    const role = getUserRole(req)
    const requesterId = getUserId(req)

    // 非管理员只能查自己的日志
    if (!checkPermission(role, 'view_all_logs') && requesterId !== targetUserId) {
      return res.status(403).json({ error: '您没有权限查看其他用户的日志' })
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'access_logs',
      where: { user_id: targetUserId },
      orderBy: 'timestamp DESC',
      limit: parseInt(req.query.limit || '50'),
      offset: parseInt(req.query.offset || '0')
    })

    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
