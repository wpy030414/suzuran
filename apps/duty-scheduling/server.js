import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'duty-scheduling', port: 8092 })

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

// ═══════════════════════════════════════════════════════════════
// 数据表定义
// ═══════════════════════════════════════════════════════════════
const TABLES = {
  duty_campuses: [
    { name: 'name', type: 'text' },
    { name: 'address', type: 'text', nullable: true }
  ],
  duty_shifts: [
    { name: 'campus_id', type: 'integer' },
    { name: 'name', type: 'text' },
    { name: 'start_time', type: 'text' },
    { name: 'end_time', type: 'text' }
  ],
  duty_locations: [
    { name: 'campus_id', type: 'integer' },
    { name: 'name', type: 'text' },
    { name: 'description', type: 'text', nullable: true }
  ],
  duty_schedules: [
    { name: 'campus_id', type: 'integer' },
    { name: 'shift_id', type: 'integer' },
    { name: 'week_start', type: 'date' },
    { name: 'week_end', type: 'date' }
  ],
  // 核心表：值班快照（一条 = 某人某日在某校区某档期某地点的值班任务）
  duty_snapshots: [
    { name: 'schedule_id', type: 'integer' },
    { name: 'user_id', type: 'integer' },
    { name: 'user_name', type: 'text', nullable: true },
    { name: 'date', type: 'date' },
    { name: 'shift_id', type: 'integer' },
    { name: 'location_id', type: 'integer' },
    { name: 'status', type: 'text' },
    // PRD 冗余描述字段，格式 "姓名：校区-档期-地点"，代换班追加 "->顶替人"
    { name: 'description', type: 'text', nullable: true },
    // 系统保护标记，系统生成的快照为 "SystemProtected"
    { name: 'configuration', type: 'text', nullable: true },
    { name: 'notes', type: 'text', nullable: true }
  ],
  substitution_requests_duty: [
    { name: 'original_snapshot_id', type: 'integer' },
    { name: 'requester_id', type: 'integer' },
    { name: 'substitute_user_id', type: 'integer' },
    { name: 'type', type: 'text' },
    { name: 'target_snapshot_id', type: 'integer', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'workflow_instance_id', type: 'integer', nullable: true },
    { name: 'reason', type: 'text', nullable: true },
    { name: 'created_at', type: 'timestamp' }
  ],
  inspection_records_duty: [
    { name: 'snapshot_id', type: 'integer' },
    { name: 'inspector_id', type: 'integer' },
    { name: 'result', type: 'text' },
    { name: 'evidence_url', type: 'text', nullable: true },
    { name: 'notes', type: 'text', nullable: true },
    { name: 'created_at', type: 'timestamp' }
  ],
  weekly_plans: [
    { name: 'campus_id', type: 'integer' },
    { name: 'shift_ids', type: 'text', nullable: true },
    { name: 'week_start', type: 'date' },
    { name: 'week_end', type: 'date' },
    { name: 'submitted_by', type: 'integer' },
    { name: 'plan_data', type: 'jsonb' },
    { name: 'status', type: 'text' },
    { name: 'snapshots_count', type: 'integer', nullable: true },
    { name: 'created_at', type: 'timestamp' }
  ]
}

// ═══════════════════════════════════════════════════════════════
// 角色权限矩阵（PRD 4.5.6）
// ═══════════════════════════════════════════════════════════════
const ROLE_PERMISSIONS = {
  admin: {
    manage_campuses: true, manage_shifts: true, manage_locations: true,
    manage_schedules: true, manage_snapshots: true, manage_weekly_plans: true,
    manage_substitutions: true, approve_substitutions: true,
    create_inspections: true, view_all: true,
    view_statistics: true, delete_records: true
  },
  duty_officer: {
    // 值班领导：可查看全局、排班、查岗、审批代换班
    manage_campuses: false, manage_shifts: false, manage_locations: false,
    manage_schedules: true, manage_snapshots: true, manage_weekly_plans: true,
    manage_substitutions: false, approve_substitutions: true,
    create_inspections: true, view_all: true,
    view_statistics: true, delete_records: false
  },
  inspector: {
    // 查岗人员：仅可创建查岗记录、查看自己的数据
    manage_campuses: false, manage_shifts: false, manage_locations: false,
    manage_schedules: false, manage_snapshots: false, manage_weekly_plans: false,
    manage_substitutions: false, approve_substitutions: false,
    create_inspections: true, view_all: false,
    view_statistics: false, delete_records: false
  },
  teacher: {
    // 教师：仅可查看自己的值班、发起代换班
    manage_campuses: false, manage_shifts: false, manage_locations: false,
    manage_schedules: false, manage_snapshots: false, manage_weekly_plans: false,
    manage_substitutions: false, approve_substitutions: false,
    create_inspections: false, view_all: false,
    view_statistics: false, delete_records: false
  }
}

// ─── 合法枚举值 ───
const VALID_SNAPSHOT_STATUSES = ['scheduled', 'confirmed', 'cancelled', 'substituted']
const VALID_INSPECTION_RESULTS = ['present', 'absent', 'late']
const VALID_SUBSTITUTION_TYPES = ['swap', 'cover']
const VALID_SUBSTITUTION_STATUSES = ['pending', 'approved', 'rejected']
const DAYS_OF_WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

// ═══════════════════════════════════════════════════════════════
// 初始化
// ═══════════════════════════════════════════════════════════════
app.onStart(async () => {
  for (const [tableName, columns] of Object.entries(TABLES)) {
    try {
      await app.mcp.call('data.create_table', { orgId: app.orgId, tableName, columns })
      console.log(`[init] Table '${tableName}' ready`)
    } catch (e) {
      console.log(`[init] Table '${tableName}' already exists`)
    }
  }

  // 初始化值班代换审批工作流定义
  try {
    const existingDefs = await app.mcp.call('workflow.list_definitions', { orgId: app.orgId })
    const defs = existingDefs.definitions || []
    const hasDutyWorkflow = defs.some(d => d.name === 'duty_substitution')

    if (!hasDutyWorkflow) {
      const def = await app.mcp.call('workflow.define', {
        orgId: app.orgId,
        name: 'duty_substitution',
        description: '值班代换审批流程：申请 → 对方确认 → 审批 → 执行快照改写',
        definition: {
          variables: ['substitution_id', 'original_snapshot_id', 'target_snapshot_id', 'requester_id', 'substitute_user_id', 'type'],
          steps: [
            { name: 'start', type: 'start', next: 'confirm' },
            {
              name: 'confirm', type: 'approval',
              assignee: '{{substitute_user_id}}',
              on_approve: 'review', on_reject: 'rejected'
            },
            {
              name: 'review', type: 'approval',
              assignee: '{{approver_id}}',
              on_approve: 'execute', on_reject: 'rejected'
            },
            { name: 'execute', type: 'end' },
            { name: 'rejected', type: 'end' }
          ]
        }
      })
      console.log(`[init] Duty substitution workflow defined: id=${def.id}`)
    }
  } catch (e) {
    console.log(`[init] Workflow setup skipped: ${e.message}`)
  }
})

// ═══════════════════════════════════════════════════════════════
// 通用辅助函数
// ═══════════════════════════════════════════════════════════════

/** 获取用户角色 */
function getUserRole(req) {
  return req.headers['x-user-role'] || req.query.role || 'teacher'
}

/** 检查角色权限 */
function checkPermission(role, action) {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.teacher
  return perms[action] || false
}

/** 权限中间件：返回 true 表示无权限（已发送 403） */
function denyIfNoPermission(res, role, action, message) {
  if (!checkPermission(role, action)) {
    res.status(403).json({ error: message })
    return true
  }
  return false
}

/** 查询单条记录 */
async function findOne(tableName, where) {
  const result = await app.mcp.call('data.query', {
    orgId: app.orgId, tableName, where, limit: 1
  })
  return (result.rows && result.rows.length > 0) ? result.rows[0] : null
}

/** 查询全部记录（分页） */
async function findAll(tableName, where = {}, orderBy = '', limit = 100, offset = 0) {
  const result = await app.mcp.call('data.query', {
    orgId: app.orgId, tableName, where, orderBy, limit, offset
  })
  return result.rows || []
}

/** 通用 CRUD: list */
async function listRecords(req, res, tableName) {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy'].includes(k)) where[k] = v
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

/** 通用 CRUD: create */
async function createRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.insert', { orgId: req.orgId, tableName, data: req.body })
    res.json({ id: result.id, ...req.body })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

/** 通用 CRUD: update */
async function updateRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName, where: { id: parseInt(req.params.id) }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

/** 通用 CRUD: delete */
async function deleteRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName, where: { id: parseInt(req.params.id) }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ─── 日期工具 ───

/** 获取一周 7 天的日期数组（周一到周日） */
function getWeekDays(weekStart) {
  const start = new Date(weekStart)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

/** 获取工作日 5 天的日期数组（周一到周五） */
function getWeekdays(weekStart) {
  return getWeekDays(weekStart).slice(0, 5)
}

/** 计算 week_end = week_start + 6 天（完整周） */
function calcWeekEnd(weekStart) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  return d.toISOString().split('T')[0]
}

/** 计算工作日结束 = week_start + 4 天 */
function calcWorkWeekEnd(weekStart) {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 4)
  return d.toISOString().split('T')[0]
}

/** 验证日期是否为周一 */
function isMonday(dateStr) {
  const d = new Date(dateStr)
  return d.getDay() === 1
}

/** 获取当前自然周的周一日期 */
function getCurrentWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}

// ─── 数据验证函数 ───

function validateRequired(body, fields) {
  const missing = []
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      missing.push(f)
    }
  }
  return missing.length > 0 ? `以下字段不能为空：${missing.join(', ')}` : null
}

function validateEnum(value, validValues, fieldName) {
  if (!validValues.includes(value)) {
    return `${fieldName} 无效，可选值：${validValues.join(', ')}`
  }
  return null
}

function validatePositiveInt(value, fieldName) {
  const n = parseInt(value)
  if (isNaN(n) || n <= 0) {
    return `${fieldName} 必须为正整数`
  }
  return null
}

// ─── 描述生成（PRD BR-ZB-01 格式） ───

/** 生成快照描述："姓名：校区-档期-地点" */
function buildSnapshotDescription(userName, campusName, shiftName, locationName) {
  return `${userName}：${campusName}-${shiftName}-${locationName}`
}

/** 在描述中追加代换标记 "->新值班人" */
function appendHandoverMark(description, newUserName) {
  return `${description}->${newUserName}`
}

// ═══════════════════════════════════════════════════
// 校区管理 API
// ═══════════════════════════════════════════════════
app.get('/api/campuses', (req, res) => listRecords(req, res, 'duty_campuses'))

app.post('/api/campuses', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_campuses', '您没有权限管理校区')) return
    const err = validateRequired(req.body, ['name'])
    if (err) return res.status(400).json({ error: err })
    await createRecord(req, res, 'duty_campuses')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/campuses/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_campuses', '您没有权限管理校区')) return
    await updateRecord(req, res, 'duty_campuses')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/campuses/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'delete_records', '您没有权限删除校区')) return
    // 检查是否有关联地点
    const locations = await findAll('duty_locations', { campus_id: parseInt(req.params.id) })
    if (locations.length > 0) {
      return res.status(409).json({ error: `该校区下有 ${locations.length} 个值班地点，请先删除地点` })
    }
    await deleteRecord(req, res, 'duty_campuses')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════
// 班次管理 API
// ═══════════════════════════════════════════════════
app.get('/api/shifts', (req, res) => listRecords(req, res, 'duty_shifts'))

app.post('/api/shifts', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_shifts', '您没有权限管理班次')) return
    const err = validateRequired(req.body, ['campus_id', 'name', 'start_time', 'end_time'])
    if (err) return res.status(400).json({ error: err })
    await createRecord(req, res, 'duty_shifts')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/shifts/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_shifts', '您没有权限管理班次')) return
    await updateRecord(req, res, 'duty_shifts')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/shifts/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'delete_records', '您没有权限删除班次')) return
    await deleteRecord(req, res, 'duty_shifts')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════
// 值班地点管理 API
// ═══════════════════════════════════════════════════
app.get('/api/locations', (req, res) => listRecords(req, res, 'duty_locations'))

app.get('/api/locations/by-campus/:campusId', async (req, res) => {
  try {
    const campusId = parseInt(req.params.campusId)
    const locations = await findAll('duty_locations', { campus_id: campusId }, 'name ASC', 500)
    res.json({ rows: locations, count: locations.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/locations', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_locations', '您没有权限管理值班地点')) return
    const err = validateRequired(req.body, ['campus_id', 'name'])
    if (err) return res.status(400).json({ error: err })
    await createRecord(req, res, 'duty_locations')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/locations/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_locations', '您没有权限管理值班地点')) return
    await updateRecord(req, res, 'duty_locations')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/locations/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'delete_records', '您没有权限删除值班地点')) return
    await deleteRecord(req, res, 'duty_locations')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════
// 排班计划 API
// ═══════════════════════════════════════════════════
app.get('/api/schedules', (req, res) => listRecords(req, res, 'duty_schedules'))

app.post('/api/schedules', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_schedules', '您没有权限管理排班计划')) return
    const err = validateRequired(req.body, ['campus_id', 'shift_id', 'week_start', 'week_end'])
    if (err) return res.status(400).json({ error: err })
    await createRecord(req, res, 'duty_schedules')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/schedules/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_schedules', '您没有权限管理排班计划')) return
    await updateRecord(req, res, 'duty_schedules')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/schedules/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'delete_records', '您没有权限删除排班计划')) return
    await deleteRecord(req, res, 'duty_schedules')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════
// 值班快照 API
// ═══════════════════════════════════════════════════
app.get('/api/snapshots', async (req, res) => {
  try {
    const where = {}
    const allowedFilters = ['user_id', 'date', 'shift_id', 'location_id', 'schedule_id', 'status', 'campus_id', 'date_from', 'date_to']
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy', ...allowedFilters].includes(k)) continue
    }
    if (req.query.user_id) where.user_id = parseInt(req.query.user_id)
    if (req.query.shift_id) where.shift_id = parseInt(req.query.shift_id)
    if (req.query.location_id) where.location_id = parseInt(req.query.location_id)
    if (req.query.schedule_id) where.schedule_id = parseInt(req.query.schedule_id)
    if (req.query.status) where.status = req.query.status
    if (req.query.date) where.date = req.query.date

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'duty_snapshots', where,
      orderBy: req.query.orderBy || 'date ASC, shift_id ASC, location_id ASC',
      limit: parseInt(req.query.limit || '500'),
      offset: parseInt(req.query.offset || '0')
    })

    let rows = result.rows || []

    // 按日期范围过滤
    if (req.query.date_from) {
      const from = new Date(req.query.date_from)
      rows = rows.filter(r => new Date(r.date) >= from)
    }
    if (req.query.date_to) {
      const to = new Date(req.query.date_to)
      rows = rows.filter(r => new Date(r.date) <= to)
    }

    // 按校区过滤（通过 schedule -> campus_id）
    if (req.query.campus_id) {
      const campusId = parseInt(req.query.campus_id)
      const schedules = await findAll('duty_schedules', { campus_id: campusId }, '', 1000)
      const scheduleIds = new Set(schedules.map(s => s.id))
      rows = rows.filter(r => scheduleIds.has(r.schedule_id))
    }

    res.json({ rows, count: rows.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 我的值班快照（教师专用，只看自己的） */
app.get('/api/snapshots/my/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId)
    const { date_from, date_to } = req.query

    const where = { user_id: userId }
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'duty_snapshots', where,
      orderBy: 'date ASC',
      limit: 500
    })

    let rows = result.rows || []
    if (date_from) rows = rows.filter(r => new Date(r.date) >= new Date(date_from))
    if (date_to) rows = rows.filter(r => new Date(r.date) <= new Date(date_to))

    res.json({ rows, count: rows.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/snapshots', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_snapshots', '您没有权限管理值班快照')) return

    const { schedule_id, user_id, user_name, date, shift_id, location_id, notes } = req.body
    const err = validateRequired(req.body, ['schedule_id', 'user_id', 'date', 'shift_id', 'location_id'])
    if (err) return res.status(400).json({ error: err })

    // 冲突检测：同一用户同一时间段不能重复排班
    const conflict = await findOne('duty_snapshots', {
      user_id: parseInt(user_id), date, shift_id: parseInt(shift_id)
    })
    if (conflict) {
      return res.status(409).json({ error: '该用户在该日期该班次已有值班安排，存在冲突' })
    }

    // 获取关联信息以构建描述
    const [schedule, shift, location] = await Promise.all([
      findOne('duty_schedules', { id: parseInt(schedule_id) }),
      findOne('duty_shifts', { id: parseInt(shift_id) }),
      findOne('duty_locations', { id: parseInt(location_id) })
    ])

    let campusName = '', shiftName = '', locationName = ''
    if (schedule) {
      const campus = await findOne('duty_campuses', { id: schedule.campus_id })
      campusName = campus ? campus.name : ''
    }
    if (shift) shiftName = shift.name
    if (location) locationName = location.name

    const description = buildSnapshotDescription(
      user_name || `用户${user_id}`, campusName, shiftName, locationName
    )

    const data = {
      schedule_id: parseInt(schedule_id),
      user_id: parseInt(user_id),
      user_name: user_name || null,
      date,
      shift_id: parseInt(shift_id),
      location_id: parseInt(location_id),
      status: req.body.status || 'scheduled',
      description,
      configuration: 'SystemProtected',
      notes: notes || null
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'duty_snapshots', data
    })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/snapshots/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_snapshots', '您没有权限管理值班快照')) return
    if (req.body.status) {
      const err = validateEnum(req.body.status, VALID_SNAPSHOT_STATUSES, '值班状态')
      if (err) return res.status(400).json({ error: err })
    }
    await updateRecord(req, res, 'duty_snapshots')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/snapshots/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'delete_records', '您没有权限删除值班快照')) return
    await deleteRecord(req, res, 'duty_snapshots')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════
// 值班周看板 API（PRD BR-ZB-03）
// 返回 地点 x 7天 的网格数据
// ═══════════════════════════════════════════════════
app.get('/api/board/weekly', async (req, res) => {
  try {
    const { campus_id, shift_id, week_start } = req.query

    if (!campus_id) return res.status(400).json({ error: '校区 ID 不能为空' })

    const campusId = parseInt(campus_id)
    // 默认当前周
    const ws = week_start || getCurrentWeekStart()
    const we = calcWeekEnd(ws)
    const weekDays = getWeekDays(ws)

    // 获取该校区全部地点（按名称排序）
    const locations = await findAll('duty_locations', { campus_id: campusId }, 'name ASC', 500)

    // 获取该校区该周的全部快照
    const schedules = await findAll('duty_schedules', { campus_id: campusId }, '', 1000)
    const scheduleIds = new Set(schedules.map(s => s.id))

    const allSnapshots = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'duty_snapshots',
      where: {}, orderBy: 'date ASC', limit: 10000
    })

    let snapshots = (allSnapshots.rows || []).filter(s => {
      if (!scheduleIds.has(s.schedule_id)) return false
      const d = new Date(s.date)
      return d >= new Date(ws) && d <= new Date(we)
    })

    // 按档期过滤
    if (shift_id) {
      const sid = parseInt(shift_id)
      snapshots = snapshots.filter(s => s.shift_id === sid)
    }

    // 构建网格：location_id -> date -> [snapshots]
    const grid = {}
    for (const loc of locations) {
      grid[loc.id] = {
        location_id: loc.id,
        location_name: loc.name,
        days: {}
      }
      for (const day of weekDays) {
        grid[loc.id].days[day] = []
      }
    }

    for (const snap of snapshots) {
      if (grid[snap.location_id] && grid[snap.location_id].days[snap.date]) {
        grid[snap.location_id].days[snap.date].push({
          id: snap.id,
          user_id: snap.user_id,
          user_name: snap.user_name,
          shift_id: snap.shift_id,
          status: snap.status,
          description: snap.description
        })
      }
    }

    // 获取该校区的全部档期
    const shifts = await findAll('duty_shifts', { campus_id: campusId }, 'name ASC', 100)

    res.json({
      campus_id: campusId,
      week_start: ws,
      week_end: we,
      week_days: weekDays.map((d, i) => ({ date: d, label: DAYS_OF_WEEK[i] })),
      shifts,
      locations: Object.values(grid),
      total_snapshots: snapshots.length
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════
// 周计划批量生成 API（PRD BR-ZB-01/02）
// ═══════════════════════════════════════════════════
app.get('/api/weekly-plans', (req, res) => listRecords(req, res, 'weekly_plans'))

/**
 * POST /api/weekly-plans/generate
 * 周计划孵化器：一次提交批量生成整周值班快照
 *
 * 请求体：
 * {
 *   campus_id: number,
 *   week_start: string (日期，必须为周一),
 *   shift_ids: number[],          // 本次排班覆盖的档期集合
 *   submitted_by: number,
 *   generate_immediately: boolean, // 是否立即生成快照
 *   template: [                    // 按地点的排班模板
 *     {
 *       location_id: number,
 *       shifts: {                  // 档期 -> 每天的人员
 *         [shiftId]: {
 *           1: [userId, ...],      // 周一
 *           2: [userId, ...],      // 周二
 *           ...
 *           7: [userId, ...],      // 周日
 *         }
 *       }
 *     }
 *   ],
 *   notes: string (可选)
 * }
 */
app.post('/api/weekly-plans/generate', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_weekly_plans', '您没有权限生成周计划')) return

    const { campus_id, week_start, shift_ids, submitted_by, template, generate_immediately, notes } = req.body

    // 必填字段验证
    const err = validateRequired(req.body, ['campus_id', 'week_start', 'submitted_by'])
    if (err) return res.status(400).json({ error: err })

    // 验证 week_start 必须为周一（PRD BR-ZB-02）
    if (!isMonday(week_start)) {
      return res.status(400).json({ error: '目标周开始日期必须为周一（BR-ZB-02）' })
    }

    if (!template || !Array.isArray(template) || template.length === 0) {
      return res.status(400).json({ error: '排班模板不能为空' })
    }

    const campusId = parseInt(campus_id)
    const weekEnd = calcWeekEnd(week_start)
    const weekDays = getWeekDays(week_start) // 7 天
    const shiftIds = shift_ids || []

    // 检查是否已有该周的重复计划
    const existing = await findOne('weekly_plans', {
      campus_id: campusId, week_start, week_end: weekEnd
    })
    if (existing) {
      return res.status(409).json({ error: '该校区该周已存在周计划，请勿重复生成' })
    }

    // 获取校区名称（用于描述）
    const campus = await findOne('duty_campuses', { id: campusId })
    const campusName = campus ? campus.name : `校区${campusId}`

    // 获取全部档期和地点的名称映射
    const allShifts = await findAll('duty_shifts', { campus_id: campusId }, '', 100)
    const shiftMap = {}
    for (const s of allShifts) shiftMap[s.id] = s.name

    const allLocations = await findAll('duty_locations', { campus_id: campusId }, 'name ASC', 500)
    const locationMap = {}
    for (const l of allLocations) locationMap[l.id] = l.name

    // 创建排班计划记录（每个档期一个 schedule）
    const scheduleIds = []
    const effectiveShiftIds = shiftIds.length > 0
      ? shiftIds
      : [...new Set(template.flatMap(t => Object.keys(t.shifts || {}).map(Number)))]

    for (const sid of effectiveShiftIds) {
      const schedResult = await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'duty_schedules',
        data: { campus_id: campusId, shift_id: sid, week_start, week_end: weekEnd }
      })
      scheduleIds.push({ shift_id: sid, schedule_id: schedResult.id })
    }

    const scheduleMap = {}
    for (const sc of scheduleIds) scheduleMap[sc.shift_id] = sc.schedule_id

    let createdSnapshots = []
    let conflicts = []

    // 是否立即生成快照
    if (generate_immediately !== false) {
      for (const entry of template) {
        const locationId = parseInt(entry.location_id)
        const locationName = locationMap[locationId] || `地点${locationId}`

        if (!entry.shifts || typeof entry.shifts !== 'object') continue

        for (const [shiftIdStr, dayMap] of Object.entries(entry.shifts)) {
          const shiftId = parseInt(shiftIdStr)
          const shiftName = shiftMap[shiftId] || `档期${shiftId}`
          const schedId = scheduleMap[shiftId]

          if (!schedId) continue

          if (!dayMap || typeof dayMap !== 'object') continue

          for (const [dayOfWeek, userIds] of Object.entries(dayMap)) {
            const dayIndex = parseInt(dayOfWeek) - 1 // 1=Mon -> 0
            if (dayIndex < 0 || dayIndex > 6) {
              conflicts.push({ error: `day_of_week ${dayOfWeek} 无效，应为 1-7`, location_id: locationId, shift_id: shiftId })
              continue
            }
            const date = weekDays[dayIndex]

            if (!Array.isArray(userIds)) continue

            for (const userId of userIds) {
              const uid = parseInt(userId)

              // 冲突检测
              const conflict = await findOne('duty_snapshots', {
                user_id: uid, date, shift_id: shiftId
              })
              if (conflict) {
                conflicts.push({ user_id: uid, date, shift_id: shiftId, location_id: locationId })
                continue
              }

              const description = buildSnapshotDescription(
                `用户${uid}`, campusName, shiftName, locationName
              )

              const snapshotData = {
                schedule_id: schedId,
                user_id: uid,
                user_name: `用户${uid}`,
                date,
                shift_id: shiftId,
                location_id: locationId,
                status: 'scheduled',
                description,
                configuration: 'SystemProtected',
                notes: notes || null
              }

              const snapResult = await app.mcp.call('data.insert', {
                orgId: req.orgId, tableName: 'duty_snapshots', data: snapshotData
              })
              createdSnapshots.push({ id: snapResult.id, ...snapshotData })
            }
          }
        }
      }
    }

    // 保存周计划记录
    const planResult = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'weekly_plans',
      data: {
        campus_id: campusId,
        shift_ids: JSON.stringify(effectiveShiftIds),
        week_start,
        week_end: weekEnd,
        submitted_by: parseInt(submitted_by),
        plan_data: JSON.stringify(template),
        status: generate_immediately !== false ? 'generated' : 'draft',
        snapshots_count: createdSnapshots.length,
        created_at: new Date().toISOString()
      }
    })

    res.json({
      id: planResult.id,
      campus_id: campusId,
      week_start,
      week_end: weekEnd,
      schedule_ids: scheduleIds,
      snapshots_created: createdSnapshots.length,
      conflicts,
      message: conflicts.length > 0
        ? `周计划已生成 ${createdSnapshots.length} 条快照，但有 ${conflicts.length} 条冲突被跳过`
        : `周计划已成功生成 ${createdSnapshots.length} 条值班快照`
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/weekly-plans', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_weekly_plans', '您没有权限管理周计划')) return
    const err = validateRequired(req.body, ['campus_id', 'week_start', 'submitted_by'])
    if (err) return res.status(400).json({ error: err })

    const data = {
      ...req.body,
      week_end: req.body.week_end || calcWeekEnd(req.body.week_start),
      status: req.body.status || 'draft',
      created_at: new Date().toISOString()
    }
    const result = await app.mcp.call('data.insert', { orgId: req.orgId, tableName: 'weekly_plans', data })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/weekly-plans/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_weekly_plans', '您没有权限管理周计划')) return
    await updateRecord(req, res, 'weekly_plans')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/weekly-plans/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'delete_records', '您没有权限删除周计划')) return
    await deleteRecord(req, res, 'weekly_plans')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════
// 代换班审批 API（PRD BR-ZB-04）
// ═══════════════════════════════════════════════════
app.get('/api/substitutions', async (req, res) => {
  try {
    const where = {}
    if (req.query.requester_id) where.requester_id = parseInt(req.query.requester_id)
    if (req.query.substitute_user_id) where.substitute_user_id = parseInt(req.query.substitute_user_id)
    if (req.query.status) where.status = req.query.status
    if (req.query.type) where.type = req.query.type

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_requests_duty', where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/**
 * POST /api/substitutions
 * 发起代换班申请
 *
 * 请求体：
 * {
 *   original_snapshot_id: number,   // 自己的班次快照
 *   requester_id: number,           // 申请人
 *   substitute_user_id: number,     // 对方（被代/被换的人）
 *   type: 'swap' | 'cover',        // 换班 | 代班
 *   target_snapshot_id?: number,    // 换班时指定对方的班次快照
 *   reason?: string                 // 申请原因
 * }
 */
app.post('/api/substitutions', async (req, res) => {
  try {
    const role = getUserRole(req)
    // teacher、duty_officer、admin 都可以发起
    if (!checkPermission(role, 'view_all') && role !== 'teacher') {
      return res.status(403).json({ error: '您没有权限发起代换申请' })
    }

    const { original_snapshot_id, requester_id, substitute_user_id, type, target_snapshot_id, reason } = req.body

    // 必填字段验证
    const err = validateRequired(req.body, ['original_snapshot_id', 'requester_id', 'substitute_user_id', 'type'])
    if (err) return res.status(400).json({ error: err })

    const typeErr = validateEnum(type, VALID_SUBSTITUTION_TYPES, '代换类型')
    if (typeErr) return res.status(400).json({ error: typeErr })

    // 换班必须指定目标快照
    if (type === 'swap' && !target_snapshot_id) {
      return res.status(400).json({ error: '换班类型必须指定目标值班快照 ID（target_snapshot_id）' })
    }

    // 验证原始快照存在
    const originalSnapshot = await findOne('duty_snapshots', { id: parseInt(original_snapshot_id) })
    if (!originalSnapshot) {
      return res.status(404).json({ error: '原始值班快照不存在' })
    }

    // 验证申请人是原始快照的值班人
    if (originalSnapshot.user_id !== parseInt(requester_id)) {
      return res.status(403).json({ error: '您只能对自己的值班班次发起代换申请' })
    }

    // 验证快照状态
    if (originalSnapshot.status === 'cancelled') {
      return res.status(400).json({ error: '已取消的值班快照不可发起代换' })
    }

    // 如果是换班，验证目标快照
    if (type === 'swap' && target_snapshot_id) {
      const targetSnapshot = await findOne('duty_snapshots', { id: parseInt(target_snapshot_id) })
      if (!targetSnapshot) {
        return res.status(404).json({ error: '目标值班快照不存在' })
      }
      // 目标快照的值班人应该是对方
      if (targetSnapshot.user_id !== parseInt(substitute_user_id)) {
        return res.status(403).json({ error: '目标班次的值班人与指定的对方不匹配' })
      }
    }

    // 不能自己换自己
    if (parseInt(requester_id) === parseInt(substitute_user_id)) {
      return res.status(400).json({ error: '申请人和对方不能是同一人' })
    }

    const now = new Date().toISOString()
    const subData = {
      original_snapshot_id: parseInt(original_snapshot_id),
      requester_id: parseInt(requester_id),
      substitute_user_id: parseInt(substitute_user_id),
      type,
      target_snapshot_id: target_snapshot_id ? parseInt(target_snapshot_id) : null,
      status: 'pending',
      workflow_instance_id: null,
      reason: reason || null,
      created_at: now
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'substitution_requests_duty', data: subData
    })

    // 启动审批工作流（PRD BR-ZB-04/05）
    try {
      const defs = await app.mcp.call('workflow.list_definitions', { orgId: req.orgId })
      const dutyDef = (defs.definitions || []).find(d => d.name === 'duty_substitution')

      if (dutyDef) {
        const instance = await app.mcp.call('workflow.start', {
          orgId: req.orgId,
          definitionId: dutyDef.id,
          variables: {
            substitution_id: result.id,
            original_snapshot_id: parseInt(original_snapshot_id),
            target_snapshot_id: target_snapshot_id ? parseInt(target_snapshot_id) : null,
            requester_id: parseInt(requester_id),
            substitute_user_id: parseInt(substitute_user_id),
            type
          }
        })

        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'substitution_requests_duty',
          where: { id: result.id },
          data: { workflow_instance_id: instance.instanceId }
        })
      }
    } catch (wfErr) {
      console.log(`[substitution] Workflow start skipped: ${wfErr.message}`)
    }

    res.json({
      id: result.id,
      ...subData,
      message: type === 'swap'
        ? '换班申请已提交，等待对方确认'
        : '代班申请已提交，等待审批'
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/**
 * POST /api/substitutions/:id/approve
 * 审批通过代换班申请（PRD BR-ZB-04）
 * - cover（代班）：将原始快照的值班人改写为代换人，追加交接标记
 * - swap（换班）：双向互换两个快照的值班人，均追加交接标记
 */
app.post('/api/substitutions/:id/approve', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'approve_substitutions', '您没有权限审批代换申请')) return

    const subId = parseInt(req.params.id)
    const sub = await findOne('substitution_requests_duty', { id: subId })
    if (!sub) return res.status(404).json({ error: '代换申请不存在' })
    if (sub.status !== 'pending') {
      return res.status(400).json({ error: `该申请已处理（当前状态：${sub.status}），不可重复审批` })
    }

    const originalSnapshot = await findOne('duty_snapshots', { id: sub.original_snapshot_id })
    if (!originalSnapshot) {
      return res.status(404).json({ error: '原始值班快照不存在，无法执行代换' })
    }

    if (sub.type === 'cover') {
      // 代班（PRD BR-ZB-04）：单向顶替
      // 将原始快照值班人改写为代换人，描述追加 "->代换人"
      const newDesc = appendHandoverMark(
        originalSnapshot.description || '',
        `用户${sub.substitute_user_id}`
      )
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'duty_snapshots',
        where: { id: sub.original_snapshot_id },
        data: {
          user_id: sub.substitute_user_id,
          user_name: `用户${sub.substitute_user_id}`,
          status: 'substituted',
          description: newDesc
        }
      })
    } else if (sub.type === 'swap') {
      // 换班（PRD BR-ZB-04）：双向互换
      const targetSnapshot = await findOne('duty_snapshots', { id: sub.target_snapshot_id })
      if (!targetSnapshot) {
        return res.status(404).json({ error: '目标值班快照不存在，无法执行换班' })
      }

      const originalUserId = originalSnapshot.user_id
      const originalUserName = originalSnapshot.user_name || `用户${originalUserId}`
      const targetUserId = targetSnapshot.user_id
      const targetUserName = targetSnapshot.user_name || `用户${targetUserId}`

      // 原始快照：值班人改为对方，描述追加 "->对方"
      const newOriginalDesc = appendHandoverMark(
        originalSnapshot.description || '', targetUserName
      )
      // 目标快照：值班人改为申请人，描述追加 "->申请人"
      const newTargetDesc = appendHandoverMark(
        targetSnapshot.description || '', originalUserName
      )

      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'duty_snapshots',
        where: { id: sub.original_snapshot_id },
        data: {
          user_id: targetUserId, user_name: targetUserName,
          status: 'substituted', description: newOriginalDesc
        }
      })
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'duty_snapshots',
        where: { id: sub.target_snapshot_id },
        data: {
          user_id: originalUserId, user_name: originalUserName,
          status: 'substituted', description: newTargetDesc
        }
      })
    }

    // 更新代换申请状态
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'substitution_requests_duty',
      where: { id: subId },
      data: { status: 'approved' }
    })

    // 推进工作流
    if (sub.workflow_instance_id) {
      try {
        const tasks = await app.mcp.call('workflow.list_tasks', { status: 'pending' })
        const wfTask = (tasks.tasks || []).find(t =>
          t.instance_id === sub.workflow_instance_id && t.step_name === 'review'
        )
        if (wfTask) {
          await app.mcp.call('workflow.approve', {
            orgId: req.orgId, taskId: wfTask.id, comment: `代换申请已批准（${sub.type === 'swap' ? '换班' : '代班'}）`
          })
        }
      } catch (wfErr) {
        console.log(`[substitution] Workflow advance skipped: ${wfErr.message}`)
      }
    }

    res.json({
      success: true,
      message: sub.type === 'swap'
        ? '换班申请已批准，双方班次已互换'
        : '代班申请已批准，值班人已替换'
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/**
 * POST /api/substitutions/:id/reject
 * 拒绝代换班申请
 */
app.post('/api/substitutions/:id/reject', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'approve_substitutions', '您没有权限审批代换申请')) return

    const subId = parseInt(req.params.id)
    const sub = await findOne('substitution_requests_duty', { id: subId })
    if (!sub) return res.status(404).json({ error: '代换申请不存在' })
    if (sub.status !== 'pending') {
      return res.status(400).json({ error: `该申请已处理（当前状态：${sub.status}），不可重复审批` })
    }

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'substitution_requests_duty',
      where: { id: subId },
      data: { status: 'rejected' }
    })

    // 推进工作流（拒绝）
    if (sub.workflow_instance_id) {
      try {
        const tasks = await app.mcp.call('workflow.list_tasks', { status: 'pending' })
        const wfTask = (tasks.tasks || []).find(t =>
          t.instance_id === sub.workflow_instance_id
        )
        if (wfTask) {
          await app.mcp.call('workflow.reject', {
            orgId: req.orgId, taskId: wfTask.id, comment: '代换申请被拒绝'
          })
        }
      } catch (wfErr) {
        console.log(`[substitution] Workflow reject skipped: ${wfErr.message}`)
      }
    }

    res.json({ success: true, message: '代换申请已拒绝，值班快照未发生变更' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/substitutions/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'manage_substitutions', '您没有权限修改代换申请')) return
    if (req.body.status) {
      const err = validateEnum(req.body.status, VALID_SUBSTITUTION_STATUSES, '代换状态')
      if (err) return res.status(400).json({ error: err })
    }
    await updateRecord(req, res, 'substitution_requests_duty')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/substitutions/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'delete_records', '您没有权限删除代换申请')) return
    await deleteRecord(req, res, 'substitution_requests_duty')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════
// 查岗记录 API（PRD BR-ZB-05/06）
// ═══════════════════════════════════════════════════
app.get('/api/inspections', async (req, res) => {
  try {
    const where = {}
    if (req.query.inspector_id) where.inspector_id = parseInt(req.query.inspector_id)
    if (req.query.result) where.result = req.query.result
    if (req.query.snapshot_id) where.snapshot_id = parseInt(req.query.snapshot_id)

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'inspection_records_duty', where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/**
 * GET /api/inspections/schedule
 * 查岗点名（PRD BR-ZB-05）：按校区+档期+日期查询快照，列出全部地点与值班人
 * 供查岗页面填充"安排"表格
 */
app.get('/api/inspections/schedule', async (req, res) => {
  try {
    const { campus_id, shift_id, date } = req.query
    if (!campus_id || !shift_id || !date) {
      return res.status(400).json({ error: '校区、档期和日期不能为空' })
    }

    const campusId = parseInt(campus_id)
    const shiftId = parseInt(shift_id)

    // 获取该校区该档期的全部地点
    const locations = await findAll('duty_locations', { campus_id: campusId }, 'name ASC', 500)

    // 获取该校区的全部排班计划
    const schedules = await findAll('duty_schedules', { campus_id: campusId }, '', 1000)
    const scheduleIds = new Set(schedules.filter(s => s.shift_id === shiftId).map(s => s.id))

    // 查询该日期的全部快照
    const allSnapshots = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'duty_snapshots',
      where: { date }, orderBy: 'location_id ASC', limit: 5000
    })

    const snapshots = (allSnapshots.rows || []).filter(s =>
      scheduleIds.has(s.schedule_id) && s.shift_id === shiftId
    )

    // 按地点组织
    const scheduleList = locations.map(loc => {
      const locSnap = snapshots.filter(s => s.location_id === loc.id)
      return {
        location_id: loc.id,
        location_name: loc.name,
        duty_officers: locSnap.map(s => ({
          snapshot_id: s.id,
          user_id: s.user_id,
          user_name: s.user_name,
          status: s.status
        })),
        has_duty: locSnap.length > 0
      }
    })

    // 查询已有的查岗记录
    const existingInspections = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'inspection_records_duty',
      where: {}, orderBy: 'created_at DESC', limit: 5000
    })
    const inspBySnapshot = {}
    for (const insp of (existingInspections.rows || [])) {
      inspBySnapshot[insp.snapshot_id] = insp
    }

    // 标注已查岗状态
    for (const item of scheduleList) {
      item.duty_officers = item.duty_officers.map(d => ({
        ...d,
        inspected: !!inspBySnapshot[d.snapshot_id],
        inspection_result: inspBySnapshot[d.snapshot_id]?.result || null
      }))
    }

    res.json({
      campus_id: campusId,
      shift_id: shiftId,
      date,
      schedule: scheduleList,
      total_locations: locations.length,
      total_duty_officers: scheduleList.reduce((sum, l) => sum + l.duty_officers.length, 0)
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/**
 * POST /api/inspections
 * 创建单条查岗记录
 */
app.post('/api/inspections', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'create_inspections', '您没有权限创建查岗记录，仅查岗员、值班领导或管理员可以操作')) return

    const { snapshot_id, inspector_id, result: inspResult, evidence_url, notes } = req.body

    const err = validateRequired(req.body, ['snapshot_id', 'inspector_id', 'result'])
    if (err) return res.status(400).json({ error: err })

    const resultErr = validateEnum(inspResult, VALID_INSPECTION_RESULTS, '查岗结果')
    if (resultErr) return res.status(400).json({ error: resultErr })

    // 验证快照存在
    const snapshot = await findOne('duty_snapshots', { id: parseInt(snapshot_id) })
    if (!snapshot) {
      return res.status(404).json({ error: '值班快照不存在' })
    }

    // 检查是否已有查岗记录（同一快照不重复查岗）
    const existing = await findOne('inspection_records_duty', { snapshot_id: parseInt(snapshot_id) })
    if (existing) {
      return res.status(409).json({ error: '该值班快照已有查岗记录，不可重复查岗' })
    }

    const now = new Date().toISOString()
    const recordData = {
      snapshot_id: parseInt(snapshot_id),
      inspector_id: parseInt(inspector_id),
      result: inspResult,
      evidence_url: evidence_url || null,
      notes: notes || null,
      created_at: now
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'inspection_records_duty', data: recordData
    })

    // 自动更新快照状态
    let snapshotStatus = 'confirmed'
    if (inspResult === 'absent') snapshotStatus = 'cancelled'

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'duty_snapshots',
      where: { id: parseInt(snapshot_id) },
      data: { status: snapshotStatus }
    })

    res.json({ id: result.id, ...recordData, message: '查岗记录已创建，快照状态已自动更新' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/**
 * POST /api/inspections/batch
 * 批量查岗：一次提交多个地点的查岗结果
 * 请求体：
 * {
 *   inspector_id: number,
 *   campus_id: number,
 *   shift_id: number,
 *   date: string,
 *   records: [
 *     { snapshot_id: number, result: 'present'|'absent'|'late', evidence_url?: string, notes?: string }
 *   ]
 * }
 */
app.post('/api/inspections/batch', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'create_inspections', '您没有权限创建查岗记录')) return

    const { inspector_id, records } = req.body

    if (!inspector_id) return res.status(400).json({ error: '查岗员 ID 不能为空' })
    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: '查岗记录列表不能为空' })
    }

    const now = new Date().toISOString()
    const created = []
    const skipped = []
    const errors = []

    for (const record of records) {
      if (!record.snapshot_id || !record.result) {
        errors.push({ record, error: '缺少 snapshot_id 或 result' })
        continue
      }

      const resultErr = validateEnum(record.result, VALID_INSPECTION_RESULTS, '查岗结果')
      if (resultErr) {
        errors.push({ snapshot_id: record.snapshot_id, error: resultErr })
        continue
      }

      // 检查是否已有查岗记录
      const existing = await findOne('inspection_records_duty', { snapshot_id: parseInt(record.snapshot_id) })
      if (existing) {
        skipped.push({ snapshot_id: record.snapshot_id, reason: '已有查岗记录' })
        continue
      }

      const recordData = {
        snapshot_id: parseInt(record.snapshot_id),
        inspector_id: parseInt(inspector_id),
        result: record.result,
        evidence_url: record.evidence_url || null,
        notes: record.notes || null,
        created_at: now
      }

      try {
        const result = await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'inspection_records_duty', data: recordData
        })

        // 更新快照状态
        let snapshotStatus = 'confirmed'
        if (record.result === 'absent') snapshotStatus = 'cancelled'
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'duty_snapshots',
          where: { id: parseInt(record.snapshot_id) },
          data: { status: snapshotStatus }
        })

        created.push({ id: result.id, ...recordData })
      } catch (insertErr) {
        errors.push({ snapshot_id: record.snapshot_id, error: insertErr.message })
      }
    }

    res.json({
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      details: { created, skipped, errors },
      message: `批量查岗完成：成功 ${created.length} 条，跳过 ${skipped.length} 条，失败 ${errors.length} 条`
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/inspections/:snapshot_id', async (req, res) => {
  try {
    const snapshotId = parseInt(req.params.snapshot_id)
    const snapshot = await findOne('duty_snapshots', { id: snapshotId })
    if (!snapshot) return res.status(404).json({ error: '值班快照不存在' })

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'inspection_records_duty',
      where: { snapshot_id: snapshotId },
      orderBy: 'created_at DESC', limit: 100
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/inspections/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'create_inspections', '您没有权限修改查岗记录')) return
    if (req.body.result) {
      const err = validateEnum(req.body.result, VALID_INSPECTION_RESULTS, '查岗结果')
      if (err) return res.status(400).json({ error: err })
    }
    await updateRecord(req, res, 'inspection_records_duty')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════
// 统计 API
// ═══════════════════════════════════════════════════

/** 个人值班统计：值班次数、缺勤次数、迟到次数 */
app.get('/api/statistics/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId)
    const { date_from, date_to } = req.query

    // 获取用户的全部快照
    const snapResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'duty_snapshots',
      where: { user_id: userId }, orderBy: 'date DESC', limit: 10000
    })
    let snapshots = snapResult.rows || []

    if (date_from) snapshots = snapshots.filter(s => new Date(s.date) >= new Date(date_from))
    if (date_to) snapshots = snapshots.filter(s => new Date(s.date) <= new Date(date_to))

    // 获取全部查岗记录
    const inspResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'inspection_records_duty',
      where: {}, limit: 10000
    })
    const inspMap = {}
    for (const insp of (inspResult.rows || [])) {
      inspMap[insp.snapshot_id] = insp
    }

    let dutyCount = 0
    let absenceCount = 0
    let lateCount = 0
    let presentCount = 0
    let substitutedCount = 0

    for (const snap of snapshots) {
      dutyCount++
      if (snap.status === 'substituted') substitutedCount++

      const insp = inspMap[snap.id]
      if (insp) {
        if (insp.result === 'present') presentCount++
        else if (insp.result === 'absent') absenceCount++
        else if (insp.result === 'late') lateCount++
      }
    }

    // 获取代换班记录
    const subResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_requests_duty',
      where: { requester_id: userId }, limit: 1000
    })

    res.json({
      user_id: userId,
      filter: { date_from, date_to },
      duty_count: dutyCount,
      present_count: presentCount,
      absence_count: absenceCount,
      late_count: lateCount,
      substituted_count: substitutedCount,
      inspection_count: presentCount + absenceCount + lateCount,
      attendance_rate: dutyCount > 0
        ? Math.round(((dutyCount - absenceCount) / dutyCount) * 100)
        : 0,
      substitution_requests: (subResult.rows || []).length
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 全局值班统计（PRD 成功指标相关） */
app.get('/api/statistics/duty', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'view_statistics', '您没有权限查看统计数据')) return

    const { campus_id, date_from, date_to } = req.query

    // 获取所有快照
    const snapshotResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'duty_snapshots', limit: 10000
    })
    let snapshots = snapshotResult.rows || []

    if (date_from) snapshots = snapshots.filter(s => new Date(s.date) >= new Date(date_from))
    if (date_to) snapshots = snapshots.filter(s => new Date(s.date) <= new Date(date_to))

    if (campus_id) {
      const schedules = await findAll('duty_schedules', { campus_id: parseInt(campus_id) }, '', 1000)
      const scheduleIds = new Set(schedules.map(s => s.id))
      snapshots = snapshots.filter(s => scheduleIds.has(s.schedule_id))
    }

    // 获取所有查岗记录
    const inspectionResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'inspection_records_duty', limit: 10000
    })
    const inspections = inspectionResult.rows || []
    const inspectionMap = {}
    for (const insp of inspections) inspectionMap[insp.snapshot_id] = insp

    // 按用户统计
    const userStats = {}
    for (const snap of snapshots) {
      const uid = snap.user_id
      if (!userStats[uid]) {
        userStats[uid] = {
          user_id: uid, user_name: snap.user_name,
          duty_count: 0, absence_count: 0, late_count: 0, present_count: 0
        }
      }
      userStats[uid].duty_count++
      const insp = inspectionMap[snap.id]
      if (insp) {
        if (insp.result === 'present') userStats[uid].present_count++
        if (insp.result === 'absent') userStats[uid].absence_count++
        if (insp.result === 'late') userStats[uid].late_count++
      }
    }

    // 汇总
    const totalSnapshots = snapshots.length
    const totalInspections = inspections.filter(i =>
      snapshots.some(s => s.id === i.snapshot_id)
    ).length
    const totalAbsences = Object.values(userStats).reduce((s, u) => s + u.absence_count, 0)
    const totalLates = Object.values(userStats).reduce((s, u) => s + u.late_count, 0)

    res.json({
      filter: { campus_id, date_from, date_to },
      summary: {
        total_snapshots: totalSnapshots,
        total_inspections: totalInspections,
        total_absences: totalAbsences,
        total_lates: totalLates,
        overall_attendance_rate: totalSnapshots > 0
          ? Math.round(((totalSnapshots - totalAbsences) / totalSnapshots) * 100)
          : 0
      },
      by_user: Object.values(userStats).sort((a, b) => b.duty_count - a.duty_count)
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 按校区统计 */
app.get('/api/statistics/campus', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'view_statistics', '您没有权限查看统计数据')) return

    const campuses = await findAll('duty_campuses', {}, '', 100)
    const schedules = await findAll('duty_schedules', {}, '', 10000)
    const snapshotResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'duty_snapshots', limit: 10000
    })
    const snapshots = snapshotResult.rows || []
    const inspectionResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'inspection_records_duty', limit: 10000
    })
    const inspections = inspectionResult.rows || []

    // schedule_id -> campus_id
    const scheduleCampusMap = {}
    for (const s of schedules) scheduleCampusMap[s.id] = s.campus_id

    // snapshot_id -> campus_id
    const snapshotCampusMap = {}
    for (const snap of snapshots) {
      snapshotCampusMap[snap.id] = scheduleCampusMap[snap.schedule_id]
    }

    const campusStats = {}
    for (const campus of campuses) {
      campusStats[campus.id] = {
        campus_id: campus.id,
        campus_name: campus.name,
        total_duties: 0,
        total_inspections: 0,
        present_count: 0,
        absent_count: 0,
        late_count: 0,
        inspection_pass_rate: 0
      }
    }

    for (const snap of snapshots) {
      const cid = scheduleCampusMap[snap.schedule_id]
      if (cid && campusStats[cid]) campusStats[cid].total_duties++
    }

    for (const insp of inspections) {
      const cid = snapshotCampusMap[insp.snapshot_id]
      if (cid && campusStats[cid]) {
        campusStats[cid].total_inspections++
        if (insp.result === 'present') campusStats[cid].present_count++
        if (insp.result === 'absent') campusStats[cid].absent_count++
        if (insp.result === 'late') campusStats[cid].late_count++
      }
    }

    const campusStatsArray = Object.values(campusStats).map(cs => {
      cs.inspection_pass_rate = cs.total_inspections > 0
        ? Math.round((cs.present_count / cs.total_inspections) * 100) : 0
      return cs
    })

    res.json({ by_campus: campusStatsArray, total_campuses: campuses.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 代换班统计 */
app.get('/api/statistics/substitutions', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (denyIfNoPermission(res, role, 'view_statistics', '您没有权限查看统计数据')) return

    const { date_from, date_to } = req.query

    const subResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_requests_duty',
      orderBy: 'created_at DESC', limit: 10000
    })
    let subs = subResult.rows || []

    if (date_from) subs = subs.filter(s => new Date(s.created_at) >= new Date(date_from))
    if (date_to) subs = subs.filter(s => new Date(s.created_at) <= new Date(date_to))

    const totalRequests = subs.length
    const approved = subs.filter(s => s.status === 'approved').length
    const rejected = subs.filter(s => s.status === 'rejected').length
    const pending = subs.filter(s => s.status === 'pending').length
    const swaps = subs.filter(s => s.type === 'swap').length
    const covers = subs.filter(s => s.type === 'cover').length

    // 按用户统计代换次数
    const userSubStats = {}
    for (const sub of subs) {
      const uid = sub.requester_id
      if (!userSubStats[uid]) userSubStats[uid] = { user_id: uid, total: 0, approved: 0, rejected: 0 }
      userSubStats[uid].total++
      if (sub.status === 'approved') userSubStats[uid].approved++
      if (sub.status === 'rejected') userSubStats[uid].rejected++
    }

    res.json({
      filter: { date_from, date_to },
      summary: {
        total_requests: totalRequests,
        approved, rejected, pending,
        swaps, covers,
        approval_rate: totalRequests > 0 ? Math.round((approved / totalRequests) * 100) : 0
      },
      by_user: Object.values(userSubStats).sort((a, b) => b.total - a.total)
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
