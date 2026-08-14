import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'class-assignment-query', port: 8096 })

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
  assignment_batches: [
    { name: 'academic_year', type: 'text' },
    { name: 'grade_level', type: 'text' },
    { name: 'release_date', type: 'date' },
    { name: 'status', type: 'text' },
    { name: 'title', type: 'text', nullable: true },
    { name: 'created_at', type: 'timestamp' },
    { name: 'updated_at', type: 'timestamp' }
  ],
  assignment_results: [
    { name: 'batch_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'id_number', type: 'text' },
    { name: 'classroom_id', type: 'integer' },
    { name: 'classroom_name', type: 'text' },
    { name: 'created_at', type: 'timestamp' }
  ],
  query_logs: [
    { name: 'batch_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'id_number', type: 'text' },
    { name: 'queried_at', type: 'timestamp' },
    { name: 'result', type: 'text' },
    { name: 'result_classroom', type: 'text', nullable: true },
    { name: 'ip_address', type: 'text', nullable: true }
  ]
}

// ─── 角色权限矩阵 ───
const ROLE_PERMISSIONS = {
  admin: {
    manage_batches: true,
    manage_results: true,
    view_logs: true,
    view_statistics: true,
    view_roster: true,
    bypass_embargo: true,
    view_full_data: true
  },
  teacher: {
    manage_batches: false,
    manage_results: false,
    view_logs: false,
    view_statistics: true,
    view_roster: true,
    bypass_embargo: true,
    view_full_data: true
  },
  parent: {
    manage_batches: false,
    manage_results: false,
    view_logs: false,
    view_statistics: false,
    view_roster: false,
    bypass_embargo: false,
    view_full_data: false
  }
}

// ─── 内存速率限制器 ───
const rateLimitMap = new Map()
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 小时
const RATE_LIMIT_MAX = 3 // 每个身份证号每小时最多 3 次查询

function checkRateLimit(idNumber) {
  const key = idNumber.toLowerCase()
  const now = Date.now()

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, [])
  }

  const timestamps = rateLimitMap.get(key).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  rateLimitMap.set(key, timestamps)

  if (timestamps.length >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - timestamps[0])) / 1000) }
  }

  timestamps.push(now)
  rateLimitMap.set(key, timestamps)
  return { allowed: true, remaining: RATE_LIMIT_MAX - timestamps.length }
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

/** 获取用户角色（简化版，从请求头或查询参数获取） */
function getUserRole(req) {
  return req.headers['x-user-role'] || req.query.role || 'parent'
}

/** 检查角色权限 */
function checkPermission(role, action) {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.parent
  return perms[action] || false
}

/** 获取客户端 IP */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || 'unknown'
}

/** 身份证号格式验证：18 位数字 */
function validateIdNumber(idNumber) {
  if (!idNumber) return { valid: false, message: '身份证号不能为空' }
  const str = String(idNumber).trim()
  if (!/^\d{17}[\dXx]$/.test(str)) {
    return { valid: false, message: '身份证号格式错误，必须为 18 位数字（最后一位可为 X）' }
  }
  // 基本校验码验证（ISO 7064:1983 MOD 11-2）
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += parseInt(str[i]) * weights[i]
  }
  const expectedCheck = checkCodes[sum % 11]
  if (str[17].toUpperCase() !== expectedCheck) {
    return { valid: false, message: '身份证号校验码错误' }
  }
  return { valid: true }
}

/** 学生姓名验证：2-20 个汉字 */
function validateStudentName(name) {
  if (!name) return { valid: false, message: '学生姓名不能为空' }
  const str = String(name).trim()
  if (!/^[一-龥]{2,20}$/.test(str)) {
    return { valid: false, message: '学生姓名必须为 2-20 个汉字' }
  }
  return { valid: true }
}

/** 脱敏身份证号：显示前 3 后 4 */
function maskIdNumber(idNumber) {
  if (!idNumber) return '***'
  const str = String(idNumber)
  if (str.length <= 7) return '***'
  return str.substring(0, 3) + '***********' + str.substring(str.length - 4)
}

/** 检查批次是否在禁运期内 */
function checkEmbargo(batch, role) {
  // admin/teacher 可以绕过禁运
  if (checkPermission(role, 'bypass_embargo')) {
    return { blocked: false }
  }

  if (!batch.release_date) {
    return { blocked: true, message: '分班结果尚未发布，请关注后续通知' }
  }

  const now = new Date()
  const releaseDate = new Date(batch.release_date)
  // 比较日期（忽略时间部分）
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const release = new Date(releaseDate.getFullYear(), releaseDate.getMonth(), releaseDate.getDate())

  if (today < release) {
    return { blocked: true, message: '分班结果尚未发布，请关注后续通知' }
  }

  if (batch.status !== 'released') {
    return { blocked: true, message: '分班结果尚未发布，请关注后续通知' }
  }

  return { blocked: false }
}

/** 脱敏处理结果数据（根据角色） */
function sanitizeResult(result, role) {
  if (checkPermission(role, 'view_full_data')) {
    return result
  }
  // parent 只能看到脱敏数据
  return {
    ...result,
    id_number: maskIdNumber(result.id_number)
  }
}

// ═══════════════════════════════════════
// 分班批次管理 API
// ═══════════════════════════════════════
app.get('/api/batches', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assignment_batches',
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/batches', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_batches')) {
      return res.status(403).json({ error: '您没有权限管理分班批次' })
    }

    const { academic_year, grade_level, release_date, status, title } = req.body

    // 必填字段验证
    if (!academic_year) return res.status(400).json({ error: '学年不能为空' })
    if (!grade_level) return res.status(400).json({ error: '年级不能为空' })
    if (!release_date) return res.status(400).json({ error: '发布日期不能为空' })
    if (!status) return res.status(400).json({ error: '状态不能为空' })

    const validStatuses = ['draft', 'released', 'archived']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `状态必须为 ${validStatuses.join('、')} 之一` })
    }

    const now = new Date().toISOString()
    const data = {
      academic_year,
      grade_level,
      release_date,
      status,
      title: title || `${academic_year}学年${grade_level}分班`,
      created_at: now,
      updated_at: now
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'assignment_batches', data
    })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/batches/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_batches')) {
      return res.status(403).json({ error: '您没有权限管理分班批次' })
    }

    const batchId = parseInt(req.params.id)

    // 验证批次存在
    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assignment_batches', where: { id: batchId }, limit: 1
    })
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: '分班批次不存在' })
    }

    // 状态验证
    if (req.body.status) {
      const validStatuses = ['draft', 'released', 'archived']
      if (!validStatuses.includes(req.body.status)) {
        return res.status(400).json({ error: `状态必须为 ${validStatuses.join('、')} 之一` })
      }
    }

    req.body.updated_at = new Date().toISOString()

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'assignment_batches',
      where: { id: batchId }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/batches/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (role !== 'admin') {
      return res.status(403).json({ error: '仅管理员可以删除分班批次' })
    }

    const batchId = parseInt(req.params.id)

    // 检查是否有关联的分班结果
    const results = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assignment_results', where: { batch_id: batchId }, limit: 1
    })
    if (results.rows && results.rows.length > 0) {
      return res.status(400).json({ error: '该批次下存在分班结果，无法删除。请先删除相关结果' })
    }

    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'assignment_batches', where: { id: batchId }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 分班结果管理 API
// ═══════════════════════════════════════
app.get('/api/results', async (req, res) => {
  try {
    const role = getUserRole(req)
    const where = {}

    // 按查询参数过滤
    if (req.query.batch_id) where.batch_id = parseInt(req.query.batch_id)
    if (req.query.classroom_id) where.classroom_id = parseInt(req.query.classroom_id)

    // 支持按学生姓名模糊搜索（需要拉取后过滤）
    const nameSearch = req.query.student_name

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assignment_results', where,
      orderBy: req.query.orderBy || 'classroom_name, student_name',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })

    // 模糊搜索过滤
    let rows = result.rows || []
    if (nameSearch) {
      rows = rows.filter(r => r.student_name && r.student_name.includes(nameSearch))
    }

    // 根据角色脱敏
    rows = rows.map(r => sanitizeResult(r, role))

    res.json({ rows, count: rows.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/results', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_results')) {
      return res.status(403).json({ error: '您没有权限管理分班结果' })
    }

    const { batch_id, student_name, id_number, classroom_id, classroom_name } = req.body

    // 必填字段验证
    if (!batch_id) return res.status(400).json({ error: '批次 ID 不能为空' })
    if (!student_name) return res.status(400).json({ error: '学生姓名不能为空' })
    if (!id_number) return res.status(400).json({ error: '身份证号不能为空' })
    if (!classroom_id) return res.status(400).json({ error: '班级 ID 不能为空' })
    if (!classroom_name) return res.status(400).json({ error: '班级名称不能为空' })

    // 身份证号格式验证
    const idValidation = validateIdNumber(id_number)
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.message })
    }

    // 学生姓名验证
    const nameValidation = validateStudentName(student_name)
    if (!nameValidation.valid) {
      return res.status(400).json({ error: nameValidation.message })
    }

    // 检查重复（同一批次中相同 student_name + id_number）
    const duplicates = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assignment_results',
      where: { batch_id: parseInt(batch_id), student_name, id_number: String(id_number).trim() },
      limit: 1
    })
    if (duplicates.rows && duplicates.rows.length > 0) {
      return res.status(400).json({ error: `该批次中已存在学生 "${student_name}" 的分班记录` })
    }

    const data = {
      batch_id: parseInt(batch_id),
      student_name,
      id_number: String(id_number).trim().toUpperCase(),
      classroom_id: parseInt(classroom_id),
      classroom_name,
      created_at: new Date().toISOString()
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'assignment_results', data
    })
    res.json({ id: result.id, ...sanitizeResult(data, role) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/results/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_results')) {
      return res.status(403).json({ error: '您没有权限管理分班结果' })
    }

    // 如果更新了身份证号，验证格式
    if (req.body.id_number) {
      const idValidation = validateIdNumber(req.body.id_number)
      if (!idValidation.valid) {
        return res.status(400).json({ error: idValidation.message })
      }
      req.body.id_number = String(req.body.id_number).trim().toUpperCase()
    }

    // 如果更新了学生姓名，验证格式
    if (req.body.student_name) {
      const nameValidation = validateStudentName(req.body.student_name)
      if (!nameValidation.valid) {
        return res.status(400).json({ error: nameValidation.message })
      }
    }

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'assignment_results',
      where: { id: parseInt(req.params.id) }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/results/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_results')) {
      return res.status(403).json({ error: '您没有权限管理分班结果' })
    }

    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'assignment_results', where: { id: parseInt(req.params.id) }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── 批量导入分班结果 ───
app.post('/api/results/batch', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'manage_results')) {
      return res.status(403).json({ error: '您没有权限管理分班结果' })
    }

    const { batch_id, results } = req.body
    if (!batch_id) return res.status(400).json({ error: '批次 ID 不能为空' })
    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: '导入数据不能为空' })
    }

    // 验证批次存在
    const batchResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assignment_batches', where: { id: parseInt(batch_id) }, limit: 1
    })
    if (!batchResult.rows || batchResult.rows.length === 0) {
      return res.status(404).json({ error: '分班批次不存在' })
    }

    // 获取该批次已有记录（用于去重）
    const existingResults = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assignment_results',
      where: { batch_id: parseInt(batch_id) },
      limit: 10000
    })
    const existingKeys = new Set(
      (existingResults.rows || []).map(r => `${r.student_name}::${r.id_number}`)
    )

    const insertedIds = []
    const errors = []
    const seenInBatch = new Set()

    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      const rowLabel = `第 ${i + 1} 行`

      // 必填字段验证
      if (!r.student_name) { errors.push(`${rowLabel}: 学生姓名不能为空`); continue }
      if (!r.id_number) { errors.push(`${rowLabel}: 身份证号不能为空`); continue }
      if (!r.classroom_id) { errors.push(`${rowLabel}: 班级 ID 不能为空`); continue }
      if (!r.classroom_name) { errors.push(`${rowLabel}: 班级名称不能为空`); continue }

      // 身份证号格式验证
      const idValidation = validateIdNumber(r.id_number)
      if (!idValidation.valid) { errors.push(`${rowLabel}: ${idValidation.message}`); continue }

      // 学生姓名验证
      const nameValidation = validateStudentName(r.student_name)
      if (!nameValidation.valid) { errors.push(`${rowLabel}: ${nameValidation.message}`); continue }

      const normalizedId = String(r.id_number).trim().toUpperCase()
      const key = `${r.student_name}::${normalizedId}`

      // 检查批次内重复
      if (existingKeys.has(key)) {
        errors.push(`${rowLabel}: 学生 "${r.student_name}" 在该批次中已存在记录`)
        continue
      }
      if (seenInBatch.has(key)) {
        errors.push(`${rowLabel}: 学生 "${r.student_name}" 在本次导入中重复`)
        continue
      }
      seenInBatch.add(key)

      try {
        const result = await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'assignment_results',
          data: {
            batch_id: parseInt(batch_id),
            student_name: r.student_name,
            id_number: normalizedId,
            classroom_id: parseInt(r.classroom_id),
            classroom_name: r.classroom_name,
            created_at: new Date().toISOString()
          }
        })
        insertedIds.push(result.id)
      } catch (insertErr) {
        errors.push(`${rowLabel}: 插入失败 - ${insertErr.message}`)
      }
    }

    res.json({
      success: errors.length === 0,
      total: results.length,
      inserted: insertedIds.length,
      failed: errors.length,
      ids: insertedIds,
      errors
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 公开查询端点（家长使用，双因子认证）
// ═══════════════════════════════════════
app.post('/api/query', async (req, res) => {
  try {
    const { batch_id, student_name, id_number } = req.body
    const ipAddress = getClientIp(req)

    // ── 基础参数验证 ──
    if (!batch_id) return res.status(400).json({ error: '批次 ID 不能为空' })

    const nameValidation = validateStudentName(student_name)
    if (!nameValidation.valid) {
      return res.status(400).json({ error: nameValidation.message })
    }

    const idValidation = validateIdNumber(id_number)
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.message })
    }

    const normalizedId = String(id_number).trim().toUpperCase()
    const batchIdInt = parseInt(batch_id)

    // ── 速率限制检查 ──
    const rateCheck = checkRateLimit(normalizedId)
    if (!rateCheck.allowed) {
      // 记录被限流的查询
      await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'query_logs',
        data: {
          batch_id: batchIdInt,
          student_name,
          id_number: maskIdNumber(normalizedId),
          queried_at: new Date().toISOString(),
          result: 'rate_limited',
          result_classroom: null,
          ip_address: ipAddress
        }
      }).catch(() => {}) // 日志写入失败不影响主流程

      return res.status(429).json({
        error: '查询过于频繁，请稍后再试',
        retry_after_seconds: rateCheck.retryAfter
      })
    }

    // ── 批次存在性检查 ──
    const batchResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assignment_batches', where: { id: batchIdInt }, limit: 1
    })
    if (!batchResult.rows || batchResult.rows.length === 0) {
      return res.status(404).json({ error: '分班批次不存在' })
    }
    const batch = batchResult.rows[0]

    // ── 禁运期检查（家长角色） ──
    const role = getUserRole(req)
    const embargoCheck = checkEmbargo(batch, role)
    if (embargoCheck.blocked) {
      // 记录被禁运的查询
      await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'query_logs',
        data: {
          batch_id: batchIdInt,
          student_name,
          id_number: maskIdNumber(normalizedId),
          queried_at: new Date().toISOString(),
          result: 'embargoed',
          result_classroom: null,
          ip_address: ipAddress
        }
      }).catch(() => {})

      return res.status(403).json({ error: embargoCheck.message })
    }

    // ── 查找匹配的分班结果 ──
    const allResults = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assignment_results',
      where: { batch_id: batchIdInt },
      limit: 10000
    })

    const match = (allResults.rows || []).find(r =>
      r.student_name === student_name && r.id_number === normalizedId
    )

    if (match) {
      // 记录成功查询
      await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'query_logs',
        data: {
          batch_id: batchIdInt,
          student_name,
          id_number: maskIdNumber(normalizedId),
          queried_at: new Date().toISOString(),
          result: 'success',
          result_classroom: match.classroom_name,
          ip_address: ipAddress
        }
      }).catch(() => {})

      // 家长只能看到脱敏数据
      const responseRole = role === 'parent' ? 'parent' : role
      res.json({
        success: true,
        student_name: match.student_name,
        id_number: checkPermission(responseRole, 'view_full_data') ? match.id_number : maskIdNumber(match.id_number),
        classroom_name: match.classroom_name,
        classroom_id: match.classroom_id,
        remaining_queries: rateCheck.remaining
      })
    } else {
      // 记录未找到的查询
      await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'query_logs',
        data: {
          batch_id: batchIdInt,
          student_name,
          id_number: maskIdNumber(normalizedId),
          queried_at: new Date().toISOString(),
          result: 'not_found',
          result_classroom: null,
          ip_address: ipAddress
        }
      }).catch(() => {})

      res.status(404).json({ error: '未找到匹配的分班信息，请核对姓名和身份证号' })
    }
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 查询日志 API
// ═══════════════════════════════════════
app.get('/api/query-logs', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_logs')) {
      return res.status(403).json({ error: '您没有权限查看查询日志' })
    }

    const where = {}
    if (req.query.batch_id) where.batch_id = parseInt(req.query.batch_id)
    if (req.query.result) where.result = req.query.result
    if (req.query.student_name) where.student_name = req.query.student_name

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'query_logs', where,
      orderBy: 'queried_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })

    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 班级花名册 API（仅管理员/教师）
// ═══════════════════════════════════════
app.get('/api/classrooms/:id/roster', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_roster')) {
      return res.status(403).json({ error: '您没有权限查看班级花名册' })
    }

    const classroomId = parseInt(req.params.id)
    const batchId = req.query.batch_id ? parseInt(req.query.batch_id) : null

    const where = { classroom_id: classroomId }
    if (batchId) where.batch_id = batchId

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assignment_results', where,
      orderBy: 'student_name',
      limit: parseInt(req.query.limit || '200'),
      offset: parseInt(req.query.offset || '0')
    })

    // 根据角色脱敏
    const rows = (result.rows || []).map(r => sanitizeResult(r, role))

    // 获取班级名称（从第一条记录）
    const classroomName = rows.length > 0 ? rows[0].classroom_name : null

    res.json({
      classroom_id: classroomId,
      classroom_name: classroomName,
      students: rows,
      count: rows.length
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 统计 API
// ═══════════════════════════════════════

// 查询统计
app.get('/api/statistics/query', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_statistics')) {
      return res.status(403).json({ error: '您没有权限查看统计数据' })
    }

    const batchId = req.query.batch_id ? parseInt(req.query.batch_id) : null

    // 获取查询日志
    const logWhere = {}
    if (batchId) logWhere.batch_id = batchId

    const logs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'query_logs', where: logWhere,
      orderBy: 'queried_at DESC',
      limit: 10000
    })
    const logRows = logs.rows || []

    // 总查询数
    const totalQueries = logRows.length

    // 成功查询数和成功率
    const successCount = logRows.filter(l => l.result === 'success').length
    const successRate = totalQueries > 0 ? Math.round((successCount / totalQueries) * 10000) / 100 : 0

    // 按结果类型统计
    const byResult = {}
    for (const log of logRows) {
      const key = log.result || 'unknown'
      byResult[key] = (byResult[key] || 0) + 1
    }

    // 按日期统计查询量
    const byDate = {}
    for (const log of logRows) {
      if (log.queried_at) {
        const date = log.queried_at.substring(0, 10) // YYYY-MM-DD
        byDate[date] = (byDate[date] || 0) + 1
      }
    }

    // 按小时统计查询量
    const byHour = {}
    for (const log of logRows) {
      if (log.queried_at) {
        const hour = log.queried_at.substring(11, 13) // HH
        byHour[`${hour}:00`] = (byHour[`${hour}:00`] || 0) + 1
      }
    }

    // 最常被查询的学生姓名 Top 10
    const nameCount = {}
    for (const log of logRows) {
      if (log.student_name) {
        nameCount[log.student_name] = (nameCount[log.student_name] || 0) + 1
      }
    }
    const topQueriedNames = Object.entries(nameCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ student_name: name, query_count: count }))

    // 按批次统计
    const byBatch = {}
    for (const log of logRows) {
      const key = log.batch_id ? `批次#${log.batch_id}` : '未知批次'
      byBatch[key] = (byBatch[key] || 0) + 1
    }

    res.json({
      totalQueries,
      successCount,
      successRate,
      byResult,
      byDate,
      byHour,
      topQueriedNames,
      byBatch
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 批次统计
app.get('/api/statistics/batch', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'view_statistics')) {
      return res.status(403).json({ error: '您没有权限查看统计数据' })
    }

    // 获取所有批次
    const batches = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assignment_batches',
      orderBy: 'created_at DESC',
      limit: 100
    })
    const batchRows = batches.rows || []

    // 获取所有分班结果
    const results = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assignment_results',
      limit: 10000
    })
    const resultRows = results.rows || []

    // 每个批次的学生数
    const studentCountPerBatch = {}
    for (const batch of batchRows) {
      studentCountPerBatch[batch.id] = 0
    }
    for (const r of resultRows) {
      if (studentCountPerBatch[r.batch_id] !== undefined) {
        studentCountPerBatch[r.batch_id]++
      }
    }

    // 班级分布（每个班级有多少学生）
    const classroomDistribution = {}
    for (const r of resultRows) {
      const key = r.classroom_name || `班级#${r.classroom_id}`
      classroomDistribution[key] = (classroomDistribution[key] || 0) + 1
    }

    // 每个批次的班级分布
    const batchClassroomDist = {}
    for (const r of resultRows) {
      if (!batchClassroomDist[r.batch_id]) batchClassroomDist[r.batch_id] = {}
      const classKey = r.classroom_name || `班级#${r.classroom_id}`
      batchClassroomDist[r.batch_id][classKey] = (batchClassroomDist[r.batch_id][classKey] || 0) + 1
    }

    // 组装批次详情
    const batchDetails = batchRows.map(batch => ({
      id: batch.id,
      academic_year: batch.academic_year,
      grade_level: batch.grade_level,
      title: batch.title,
      status: batch.status,
      release_date: batch.release_date,
      student_count: studentCountPerBatch[batch.id] || 0,
      classroom_count: Object.keys(batchClassroomDist[batch.id] || {}).length
    }))

    res.json({
      batches: batchDetails,
      totalBatches: batchRows.length,
      totalStudents: resultRows.length,
      classroomDistribution,
      batchClassroomDist
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
