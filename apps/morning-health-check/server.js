import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'morning-health-check', port: 8095 })

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

// ═══════════════════════════════════════════════════════════════════
// 角色权限矩阵（PRD 4.3.6 权限模型）
// 角色: admin / campus_admin / grade_head / class_teacher / school_doctor
// ═══════════════════════════════════════════════════════════════════
const ROLE_PERMISSIONS = {
  admin: {
    manage_hierarchy: true,       // 负责人树维护
    manage_configs: true,         // 检查时间窗 / 校区配置
    conduct_check: true,          // 晨午检填报
    view_check: true,             // 查看检查概要
    manage_absence: true,         // 缺勤记录管理
    approve_leave: true,          // 请假审批
    manage_leave: true,           // 请假 / 销假管理
    manage_infectious: true,      // 传染病登记
    view_statistics: true,        // 统计报表
    view_all_data: true,          // 查看全域数据
    auto_absence: true            // 自动生成缺勤
  },
  campus_admin: {
    manage_hierarchy: true,       // 本校区负责人树
    manage_configs: true,         // 本校区检查时间窗
    conduct_check: true,          // 跨级部检查
    view_check: true,             // 本校区检查概要
    manage_absence: true,         // 本校区缺勤
    approve_leave: false,
    manage_leave: true,           // 本校区请假
    manage_infectious: true,      // 本校区传染病
    view_statistics: true,        // 本校区统计
    view_all_data: false,
    auto_absence: true            // 本校区自动缺勤
  },
  grade_head: {
    manage_hierarchy: false,
    manage_configs: false,
    conduct_check: true,          // 跨班级检查
    view_check: true,             // 本年级检查概要
    manage_absence: true,         // 本年级缺勤
    approve_leave: true,          // 请假审批
    manage_leave: true,
    manage_infectious: false,
    view_statistics: true,        // 本年级统计
    view_all_data: false,
    auto_absence: false
  },
  class_teacher: {
    manage_hierarchy: false,
    manage_configs: false,
    conduct_check: true,          // 本班填报
    view_check: true,             // 本班检查概要
    manage_absence: true,         // 本班缺勤
    approve_leave: false,
    manage_leave: true,           // 本班请假
    manage_infectious: false,
    view_statistics: true,        // 本班统计
    view_all_data: false,
    auto_absence: false
  },
  school_doctor: {
    manage_hierarchy: false,
    manage_configs: false,
    conduct_check: false,
    view_check: true,             // 全校健康概要
    manage_absence: false,
    approve_leave: false,
    manage_leave: false,
    manage_infectious: true,      // 传染病全权管理
    view_statistics: true,        // 全校健康统计
    view_all_data: true,          // 健康数据全域可见
    auto_absence: false
  }
}

// ─── 角色层级（用于数据范围过滤） ───
const ROLE_SCOPE = {
  admin:        { level: 5, label: '全校' },
  school_doctor: { level: 4, label: '全校（健康）' },
  campus_admin: { level: 3, label: '校区' },
  grade_head:   { level: 2, label: '年级' },
  class_teacher: { level: 1, label: '班级' }
}

// ═══════════════════════════════════════════════════════════════════
// 权限辅助函数
// ═══════════════════════════════════════════════════════════════════

/** 获取用户角色（从请求头 / 查询参数） */
function getUserRole(req) {
  return req.headers['x-user-role'] || req.query.role || 'class_teacher'
}

/** 检查角色是否拥有某权限 */
function checkPermission(role, action) {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.class_teacher
  return perms[action] || false
}

/** 权限中间件：基于动作的权限校验 */
function requirePermission(action) {
  return (req, res, next) => {
    const role = getUserRole(req)
    if (!checkPermission(role, action)) {
      return res.status(403).json({ error: `权限不足，需要 ${action} 权限` })
    }
    req.userRole = role
    req.userId = req.headers['x-user-id']
    req.campusId = req.headers['x-user-campus-id']
    req.gradeId = req.headers['x-user-grade-id']
    req.classId = req.headers['x-user-class-id']
    next()
  }
}

/** 向后兼容：基于最低角色的中间件 */
function requireRole(minRole) {
  const minLevel = ROLE_SCOPE[minRole]?.level || 0
  return (req, res, next) => {
    const role = getUserRole(req)
    const userLevel = ROLE_SCOPE[role]?.level || 0
    if (userLevel < minLevel) {
      return res.status(403).json({ error: '权限不足，需要 ' + minRole + ' 及以上角色' })
    }
    req.userRole = role
    req.userId = req.headers['x-user-id']
    req.campusId = req.headers['x-user-campus-id']
    req.gradeId = req.headers['x-user-grade-id']
    req.classId = req.headers['x-user-class-id']
    next()
  }
}

// ═══════════════════════════════════════════════════════════════════
// 数据验证函数
// ═══════════════════════════════════════════════════════════════════

/** 日期格式验证 YYYY-MM-DD */
function validateDate(date) {
  if (!date) return { valid: false, message: '日期不能为空' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return { valid: false, message: '日期格式必须为 YYYY-MM-DD' }
  }
  const d = new Date(date)
  if (isNaN(d.getTime())) {
    return { valid: false, message: '日期无效' }
  }
  return { valid: true }
}

/** 体温验证：35.0 ~ 42.0 */
function validateTemperature(temp) {
  if (temp === null || temp === undefined) return { valid: true } // 可选
  const num = parseFloat(temp)
  if (isNaN(num)) return { valid: false, message: '体温必须为数字' }
  if (num < 35.0 || num > 42.0) return { valid: false, message: '体温范围 35.0~42.0' }
  return { valid: true }
}

/** 时间格式验证 HH:MM */
function validateTime(time) {
  if (!time) return { valid: false, message: '时间不能为空' }
  if (!/^\d{2}:\d{2}$/.test(String(time))) {
    return { valid: false, message: '时间格式必须为 HH:MM' }
  }
  return { valid: true }
}

/** 检查类型验证 */
function validateCheckType(type) {
  if (!type) return { valid: false, message: '检查类型不能为空' }
  if (!['morning', 'afternoon'].includes(type)) {
    return { valid: false, message: '检查类型必须为 morning（晨检）或 afternoon（午检）' }
  }
  return { valid: true }
}

/** 半天时段映射：晨检→上午，午检→下午 */
function checkTypeToHalfday(checkType) {
  return checkType === 'morning' ? 'am' : 'pm'
}

/** 缺勤类型验证 */
function validateAbsenceType(type) {
  if (!type) return { valid: true } // 可选，有默认值
  if (!['sick', 'personal', 'unexcused', 'infectious'].includes(type)) {
    return { valid: false, message: '缺勤类型必须为 sick/personal/unexcused/infectious' }
  }
  return { valid: true }
}

/** 层级验证 */
function validateLevel(level) {
  if (!level || !['campus', 'grade', 'class'].includes(level)) {
    return { valid: false, message: '层级必须为 campus（校区）/ grade（年级）/ class（班级）' }
  }
  return { valid: true }
}

/** 学生明细行验证（记名模式） */
function validateStudentEntry(entry) {
  const errors = []
  if (!entry.student_id) errors.push('学生ID不能为空')
  if (entry.temperature !== undefined && entry.temperature !== null) {
    const tempCheck = validateTemperature(entry.temperature)
    if (!tempCheck.valid) errors.push(tempCheck.message)
  }
  if (entry.status && !['normal', 'abnormal', 'present', 'absent'].includes(entry.status)) {
    errors.push('学生状态必须为 normal/abnormal/present/absent')
  }
  return errors
}

// ═══════════════════════════════════════════════════════════════════
// 数据范围过滤（PRD 4.3.6 最小可见性原则）
// ═══════════════════════════════════════════════════════════════════

/** 根据角色将数据范围过滤条件注入 where */
function applyScopeFilter(where, req) {
  const role = req.userRole || getUserRole(req)
  if (role === 'class_teacher') {
    const classId = req.classId || req.headers['x-user-class-id']
    if (classId) where.campus_id = parseInt(classId)
  } else if (role === 'grade_head') {
    const gradeId = req.gradeId || req.headers['x-user-grade-id']
    if (gradeId) where.campus_id = parseInt(gradeId)
  } else if (role === 'campus_admin') {
    const campusId = req.campusId || req.headers['x-user-campus-id']
    if (campusId) where.campus_id = parseInt(campusId)
  }
  // admin / school_doctor 可见全域
}

/** 根据角色将层级树过滤 */
function filterHierarchyByRole(rows, req) {
  const role = req.userRole || getUserRole(req)
  if (role === 'admin' || role === 'school_doctor') return rows
  const campusId = parseInt(req.campusId || req.headers['x-user-campus-id'] || '0')
  if (role === 'campus_admin' && campusId) {
    return rows.filter(r => r.level === 'campus' ? r.id === campusId : r.campus_id === campusId || true)
  }
  return rows
}

// ─── 数据表定义 ───
const TABLES = {
  campus_hierarchy: [
    { name: 'campus_name', type: 'text' },
    { name: 'grade_name', type: 'text', nullable: true },
    { name: 'class_name', type: 'text', nullable: true },
    { name: 'parent_id', type: 'integer', nullable: true },
    { name: 'level', type: 'text' },
    { name: 'responsible_id', type: 'integer', nullable: true },
    { name: 'responsible_name', type: 'text', nullable: true },
    { name: 'student_count', type: 'integer', nullable: true },
    { name: 'record_mode', type: 'text', nullable: true }
  ],
  health_check_configs: [
    { name: 'campus_id', type: 'integer' },
    { name: 'check_time_morning', type: 'text' },
    { name: 'check_time_afternoon', type: 'text' },
    { name: 'auto_absence_threshold', type: 'text' },
    { name: 'halfday_period', type: 'text', nullable: true }
  ],
  health_checks: [
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'grade', type: 'text' },
    { name: 'class_name', type: 'text' },
    { name: 'campus_id', type: 'integer' },
    { name: 'campus_name', type: 'text' },
    { name: 'check_date', type: 'date' },
    { name: 'check_time', type: 'text' },
    { name: 'check_type', type: 'text' },
    { name: 'check_mode', type: 'text' },
    { name: 'halfday_period', type: 'text' },
    { name: 'temperature', type: 'numeric' },
    { name: 'symptoms', type: 'text' },
    { name: 'status', type: 'text' },
    { name: 'is_abnormal', type: 'boolean' },
    { name: 'abnormal_details', type: 'text', nullable: true },
    { name: 'infectious_disease_type', type: 'text', nullable: true },
    { name: 'auto_lock', type: 'boolean' },
    { name: 'leave_record_id', type: 'integer', nullable: true },
    { name: 'checker_id', type: 'integer' },
    { name: 'reporter_id', type: 'integer' },
    { name: 'reporter_name', type: 'text' }
  ],
  absent_records: [
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'grade', type: 'text' },
    { name: 'class_name', type: 'text' },
    { name: 'campus_id', type: 'integer' },
    { name: 'campus_name', type: 'text' },
    { name: 'absent_date', type: 'date' },
    { name: 'absence_type', type: 'text' },
    { name: 'reason', type: 'text' },
    { name: 'status', type: 'text' },
    { name: 'auto_generated', type: 'boolean', default: false },
    { name: 'leave_record_id', type: 'integer', nullable: true }
  ],
  leave_records: [
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'grade', type: 'text' },
    { name: 'class_name', type: 'text' },
    { name: 'campus_id', type: 'integer' },
    { name: 'campus_name', type: 'text' },
    { name: 'leave_type', type: 'text' },
    { name: 'infectious_disease_type', type: 'text', nullable: true },
    { name: 'from_date', type: 'date' },
    { name: 'from_halfday', type: 'text' },
    { name: 'to_date', type: 'date' },
    { name: 'to_halfday', type: 'text' },
    { name: 'reason', type: 'text', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'agent_id', type: 'integer', nullable: true },
    { name: 'agent_name', type: 'text', nullable: true },
    { name: 'auto_generated', type: 'boolean', default: false },
    { name: 'source_check_id', type: 'integer', nullable: true },
    { name: 'recovery_material', type: 'text', nullable: true },
    { name: 'recovery_date', type: 'date', nullable: true }
  ],
  infectious_diseases: [
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'grade', type: 'text' },
    { name: 'class_name', type: 'text' },
    { name: 'campus_id', type: 'integer' },
    { name: 'disease_name', type: 'text' },
    { name: 'diagnosis_date', type: 'date' },
    { name: 'recovery_date', type: 'date', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'reported_by', type: 'text' },
    { name: 'report_date', type: 'date' },
    { name: 'leave_record_id', type: 'integer', nullable: true }
  ]
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

// ═══════════════════════════════════════════════════════════════════
// 半天时间窗核心逻辑（PRD 4.3.1 HalfdayDatetime）
// ═══════════════════════════════════════════════════════════════════

/**
 * 判断请假区间是否覆盖检查时点
 * 请假区间: [from_date + from_halfday, to_date + to_halfday]
 * 检查时点: check_date + check_halfday
 * 半天粒度：am=上午(12点前), pm=下午(12点后)
 * 闭区间判定
 */
function isLeaveCoveringCheck(leave, checkDate, checkHalfday) {
  const checkDayNum = dateToNum(checkDate)
  const checkHalfNum = halfdayToNum(checkHalfday)
  const checkPoint = checkDayNum + checkHalfNum

  const fromDayNum = dateToNum(leave.from_date)
  const fromHalfNum = halfdayToNum(leave.from_halfday)
  const fromPoint = fromDayNum + fromHalfNum

  const toDayNum = dateToNum(leave.to_date)
  const toHalfNum = halfdayToNum(leave.to_halfday)
  const toPoint = toDayNum + toHalfNum

  return checkPoint >= fromPoint && checkPoint <= toPoint
}

/** 日期转数字（用于比较）：YYYY-MM-DD → 整数 */
function dateToNum(dateStr) {
  if (!dateStr) return 0
  const parts = String(dateStr).split('-')
  return parseInt(parts[0]) * 10000 + parseInt(parts[1] || '0') * 100 + parseInt(parts[2] || '0')
}

/** 半天转数字：am=0, pm=1 */
function halfdayToNum(halfday) {
  return halfday === 'pm' ? 1 : 0
}

/**
 * 查询某学生在某检查时点的有效请假
 * 返回命中的请假记录或 null
 */
async function findEffectiveLeave(orgId, studentId, checkDate, checkType) {
  const halfday = checkTypeToHalfday(checkType)
  const result = await app.mcp.call('data.query', {
    orgId, tableName: 'leave_records',
    where: { student_id: parseInt(studentId), status: 'approved' },
    limit: 100
  })
  const leaves = result.rows || []
  return leaves.find(l => isLeaveCoveringCheck(l, checkDate, halfday)) || null
}

// ═══════════════════════════════════════════════════════════════════
// 校园层级管理 API（PRD FR-CJ-01）
// ═══════════════════════════════════════════════════════════════════
app.get('/api/campus-hierarchy', requirePermission('view_check'), async (req, res) => {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy'].includes(k)) where[k] = v
    }
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'campus_hierarchy', where,
      orderBy: req.query.orderBy || 'level, parent_id, id',
      limit: parseInt(req.query.limit || '1000'),
      offset: parseInt(req.query.offset || '0')
    })
    // 按角色过滤可见范围
    let rows = result.rows || []
    rows = filterHierarchyByRole(rows, req)
    res.json({ rows, count: rows.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/campus-hierarchy', requirePermission('manage_hierarchy'), async (req, res) => {
  try {
    const { campus_name, grade_name, class_name, parent_id, level,
            responsible_id, responsible_name, student_count, record_mode } = req.body

    if (!campus_name) return res.status(400).json({ error: '校区名称不能为空' })
    const levelCheck = validateLevel(level)
    if (!levelCheck.valid) return res.status(400).json({ error: levelCheck.message })
    if (level === 'grade' && !parent_id) {
      return res.status(400).json({ error: '年级必须指定所属校区（parent_id）' })
    }
    if (level === 'class' && !parent_id) {
      return res.status(400).json({ error: '班级必须指定所属年级（parent_id）' })
    }
    if (record_mode && !['roll_call', 'count'].includes(record_mode)) {
      return res.status(400).json({ error: '学生记载模式必须为 roll_call（记名）/ count（记数）' })
    }

    const data = {
      campus_name,
      grade_name: grade_name || null,
      class_name: class_name || null,
      parent_id: parent_id ? parseInt(parent_id) : null,
      level,
      responsible_id: responsible_id ? parseInt(responsible_id) : null,
      responsible_name: responsible_name || null,
      student_count: student_count ? parseInt(student_count) : null,
      record_mode: record_mode || null
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'campus_hierarchy', data
    })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/campus-hierarchy/:id', requirePermission('manage_hierarchy'), (req, res) => updateRecord(req, res, 'campus_hierarchy'))
app.delete('/api/campus-hierarchy/:id', requirePermission('manage_hierarchy'), (req, res) => deleteRecord(req, res, 'campus_hierarchy'))

/** 获取层级树（支持角色过滤） */
app.get('/api/campus-hierarchy/tree', requirePermission('view_check'), async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'campus_hierarchy', limit: 1000
    })
    let rows = result.rows || []
    rows = filterHierarchyByRole(rows, req)

    const campuses = rows.filter(r => r.level === 'campus')
    const tree = campuses.map(c => {
      const grades = rows.filter(r => r.level === 'grade' && r.parent_id === c.id)
      return {
        ...c,
        children: grades.map(g => ({
          ...g,
          children: rows.filter(r => r.level === 'class' && r.parent_id === g.id)
        }))
      }
    })
    res.json({ tree })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/**
 * 获取当前用户负责的班级列表（PRD CJ-R1）
 * 检查页"班级"下拉 = 所有"负责人 = 登录人"的班级
 */
app.get('/api/my-classes', requirePermission('conduct_check'), async (req, res) => {
  try {
    const userId = parseInt(req.userId || req.headers['x-user-id'] || '0')
    const role = getUserRole(req)

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'campus_hierarchy',
      where: { level: 'class' },
      limit: 1000
    })
    const allClasses = result.rows || []

    let myClasses
    if (role === 'admin') {
      myClasses = allClasses
    } else if (userId) {
      // 负责人 = 登录人的班级（可跨校区/级部/年级）
      myClasses = allClasses.filter(c => c.responsible_id === userId)
    } else {
      myClasses = []
    }

    res.json({ classes: myClasses, count: myClasses.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════════════════════
// 健康检查配置 API（PRD FR-CJ-02）
// ═══════════════════════════════════════════════════════════════════
app.get('/api/health-check-configs', requirePermission('view_check'), (req, res) => listRecords(req, res, 'health_check_configs'))

app.post('/api/health-check-configs', requirePermission('manage_configs'), async (req, res) => {
  try {
    const { campus_id, check_time_morning, check_time_afternoon, auto_absence_threshold } = req.body
    if (!campus_id) return res.status(400).json({ error: '校区ID不能为空' })

    if (check_time_morning) {
      const t = validateTime(check_time_morning)
      if (!t.valid) return res.status(400).json({ error: '晨检时间' + t.message })
    }
    if (check_time_afternoon) {
      const t = validateTime(check_time_afternoon)
      if (!t.valid) return res.status(400).json({ error: '午检时间' + t.message })
    }

    const data = {
      campus_id: parseInt(campus_id),
      check_time_morning: check_time_morning || '08:00',
      check_time_afternoon: check_time_afternoon || '14:00',
      auto_absence_threshold: auto_absence_threshold || '09:30'
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'health_check_configs', data
    })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/health-check-configs/:id', requirePermission('manage_configs'), (req, res) => updateRecord(req, res, 'health_check_configs'))
app.delete('/api/health-check-configs/:id', requirePermission('manage_configs'), (req, res) => deleteRecord(req, res, 'health_check_configs'))

// ═══════════════════════════════════════════════════════════════════
// 健康检查 API（PRD FR-CJ-03/04/05/06）
// ═══════════════════════════════════════════════════════════════════
app.get('/api/health-checks', requirePermission('view_check'), async (req, res) => {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy'].includes(k)) where[k] = v
    }
    applyScopeFilter(where, req)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'health_checks', where,
      orderBy: req.query.orderBy || 'check_date DESC, check_time DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 单条健康检查创建 */
app.post('/api/health-checks', requirePermission('conduct_check'), async (req, res) => {
  try {
    const { student_id, student_name, grade, class_name, campus_id, campus_name,
            check_date, check_time, check_type, check_mode, temperature, symptoms,
            status, is_abnormal, abnormal_details, infectious_disease_type,
            reporter_id, reporter_name } = req.body

    // ── 必填字段验证 ──
    if (!student_id) return res.status(400).json({ error: '学生ID不能为空' })
    const dateCheck = validateDate(check_date)
    if (!dateCheck.valid) return res.status(400).json({ error: dateCheck.message })
    const typeCheck = validateCheckType(check_type)
    if (!typeCheck.valid) return res.status(400).json({ error: typeCheck.message })
    if (temperature !== undefined && temperature !== null) {
      const tempCheck = validateTemperature(temperature)
      if (!tempCheck.valid) return res.status(400).json({ error: tempCheck.message })
    }

    const halfday = checkTypeToHalfday(check_type)
    const isAbnormal = status === 'abnormal' || is_abnormal === true

    const data = {
      student_id: parseInt(student_id),
      student_name: student_name || '',
      grade: grade || '',
      class_name: class_name || '',
      campus_id: campus_id ? parseInt(campus_id) : null,
      campus_name: campus_name || '',
      check_date,
      check_time: check_time || new Date().toTimeString().slice(0, 5),
      check_type,
      check_mode: check_mode || 'roll_call',
      halfday_period: halfday,
      temperature: temperature ? parseFloat(temperature) : null,
      symptoms: symptoms || null,
      status: status || 'normal',
      is_abnormal: isAbnormal,
      abnormal_details: isAbnormal ? (abnormal_details || symptoms || null) : null,
      infectious_disease_type: infectious_disease_type || null,
      auto_lock: false,
      leave_record_id: null,
      checker_id: parseInt(req.userId) || null,
      reporter_id: reporter_id ? parseInt(reporter_id) : parseInt(req.userId) || null,
      reporter_name: reporter_name || ''
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'health_checks', data
    })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/**
 * 点名模式批量提交（PRD FR-CJ-03 CJ-R2 记名模式）
 * - 名单自动带出
 * - 应到/实到/缺勤自动计算
 * - 异常自动生成请假（CJ-R5）
 */
app.post('/api/health-checks/roll-call', requirePermission('conduct_check'), async (req, res) => {
  try {
    const { check_date, check_type, campus_id, campus_name, grade, class_name,
            reporter_id, reporter_name, students } = req.body

    // ── 参数验证 ──
    const dateCheck = validateDate(check_date)
    if (!dateCheck.valid) return res.status(400).json({ error: dateCheck.message })
    const typeCheck = validateCheckType(check_type)
    if (!typeCheck.valid) return res.status(400).json({ error: typeCheck.message })
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: '必须提供学生列表' })
    }

    const halfday = checkTypeToHalfday(check_type)
    const inserted = []
    const autoLeaves = []
    const errors = []

    for (let i = 0; i < students.length; i++) {
      const s = students[i]
      if (!s.student_id) {
        errors.push(`第 ${i + 1} 行: 学生ID不能为空`)
        continue
      }

      // 验证学生明细
      const entryErrors = validateStudentEntry(s)
      if (entryErrors.length > 0) {
        errors.push(`第 ${i + 1} 行 (${s.student_name || s.student_id}): ${entryErrors.join('; ')}`)
        continue
      }

      // 检查是否有有效请假（CJ-R4 自动回填与锁定）
      const effectiveLeave = await findEffectiveLeave(req.orgId, s.student_id, check_date, check_type)
      const isLocked = !!effectiveLeave
      const studentStatus = isLocked ? (effectiveLeave.leave_type || 'absent') : (s.status || 'present')
      const studentIsAbnormal = !isLocked && (s.status === 'abnormal')

      const data = {
        student_id: parseInt(s.student_id),
        student_name: s.student_name || '',
        grade: grade || '',
        class_name: class_name || '',
        campus_id: campus_id ? parseInt(campus_id) : null,
        campus_name: campus_name || '',
        check_date,
        check_time: new Date().toTimeString().slice(0, 5),
        check_type,
        check_mode: 'roll_call',
        halfday_period: halfday,
        temperature: s.temperature ? parseFloat(s.temperature) : null,
        symptoms: isLocked ? (effectiveLeave.reason || null) : (s.symptoms || null),
        status: studentStatus,
        is_abnormal: studentIsAbnormal,
        abnormal_details: studentIsAbnormal ? (s.abnormal_details || s.symptoms || null) : null,
        infectious_disease_type: isLocked ? (effectiveLeave.infectious_disease_type || null) : (s.infectious_disease_type || null),
        auto_lock: isLocked,
        leave_record_id: isLocked ? effectiveLeave.id : null,
        checker_id: parseInt(req.userId) || null,
        reporter_id: reporter_id ? parseInt(reporter_id) : parseInt(req.userId) || null,
        reporter_name: reporter_name || ''
      }

      const result = await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'health_checks', data
      })
      const record = { id: result.id, ...data }
      inserted.push(record)

      // CJ-R5: 未锁定且异常 → 自动生成请假
      if (studentIsAbnormal && !isLocked) {
        const leaveData = {
          student_id: parseInt(s.student_id),
          student_name: s.student_name || '',
          grade: grade || '',
          class_name: class_name || '',
          campus_id: campus_id ? parseInt(campus_id) : null,
          campus_name: campus_name || '',
          leave_type: s.infectious_disease_type ? 'infectious' : 'sick',
          infectious_disease_type: s.infectious_disease_type || null,
          from_date: check_date,
          from_halfday: halfday,
          to_date: check_date,
          to_halfday: halfday,
          reason: s.abnormal_details || s.symptoms || '晨午检异常自动请假',
          status: 'approved',
          agent_id: reporter_id ? parseInt(reporter_id) : parseInt(req.userId) || null,
          agent_name: reporter_name || '',
          auto_generated: true,
          source_check_id: record.id,
          recovery_material: null,
          recovery_date: null
        }
        const leaveResult = await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'leave_records', data: leaveData
        })
        autoLeaves.push({ id: leaveResult.id, ...leaveData })

        // 回填 leave_record_id 到检查记录
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'health_checks',
          where: { id: record.id },
          data: { leave_record_id: leaveResult.id }
        }).catch(() => {})
      }
    }

    // 计算汇总
    const totalCount = inserted.length
    const presentCount = inserted.filter(r => r.status === 'present' || r.status === 'normal').length
    const absentCount = inserted.filter(r => r.status === 'absent' || r.status === 'approved').length
    const abnormalCount = inserted.filter(r => r.is_abnormal).length
    const lockedCount = inserted.filter(r => r.auto_lock).length

    res.json({
      success: true,
      count: inserted.length,
      records: inserted,
      summary: {
        total: totalCount,
        present: presentCount,
        absent: absentCount,
        abnormal: abnormalCount,
        locked: lockedCount
      },
      auto_leaves: autoLeaves,
      errors
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/**
 * 计数模式提交（PRD FR-CJ-04 CJ-R2 记数模式）
 * - 应到取班级配置的"学生数量"
 * - 缺勤人数驱动明细行
 */
app.post('/api/health-checks/count', requirePermission('conduct_check'), async (req, res) => {
  try {
    const { check_date, check_type, campus_id, campus_name, grade, class_name,
            reporter_id, reporter_name, total_count, present_count,
            absent_count, abnormal_count, notes } = req.body

    const dateCheck = validateDate(check_date)
    if (!dateCheck.valid) return res.status(400).json({ error: dateCheck.message })
    const typeCheck = validateCheckType(check_type)
    if (!typeCheck.valid) return res.status(400).json({ error: typeCheck.message })
    if (total_count === undefined || total_count < 0) {
      return res.status(400).json({ error: '总人数必须为非负整数' })
    }

    const halfday = checkTypeToHalfday(check_type)

    const data = {
      student_id: 0, // 汇总记录标记
      student_name: '班级汇总',
      grade: grade || '',
      class_name: class_name || '',
      campus_id: campus_id ? parseInt(campus_id) : null,
      campus_name: campus_name || '',
      check_date,
      check_time: new Date().toTimeString().slice(0, 5),
      check_type,
      check_mode: 'count',
      halfday_period: halfday,
      temperature: null,
      symptoms: notes || null,
      status: 'count_summary',
      is_abnormal: (abnormal_count || 0) > 0,
      abnormal_details: `应到${total_count}人，实到${present_count}人，缺勤${absent_count}人，异常${abnormal_count}人`,
      infectious_disease_type: null,
      auto_lock: false,
      leave_record_id: null,
      checker_id: parseInt(req.userId) || null,
      reporter_id: reporter_id ? parseInt(reporter_id) : parseInt(req.userId) || null,
      reporter_name: reporter_name || ''
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'health_checks', data
    })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/**
 * 检查前预加载：获取学生列表及请假回填状态（CJ-R4/R6）
 * 前端检查页加载时调用，获取班级学生名单 + 每人的有效请假状态
 */
app.post('/api/health-checks/preflight', requirePermission('conduct_check'), async (req, res) => {
  try {
    const { check_date, check_type, class_id, students } = req.body

    const dateCheck = validateDate(check_date)
    if (!dateCheck.valid) return res.status(400).json({ error: dateCheck.message })
    const typeCheck = validateCheckType(check_type)
    if (!typeCheck.valid) return res.status(400).json({ error: typeCheck.message })

    if (!students || !Array.isArray(students)) {
      return res.status(400).json({ error: '必须提供学生列表' })
    }

    const halfday = checkTypeToHalfday(check_type)
    const preflightResults = []

    for (const s of students) {
      if (!s.student_id) continue
      const effectiveLeave = await findEffectiveLeave(req.orgId, s.student_id, check_date, check_type)

      preflightResults.push({
        student_id: s.student_id,
        student_name: s.student_name || '',
        gender: s.gender || '',
        auto_lock: !!effectiveLeave,
        effective_leave: effectiveLeave ? {
          id: effectiveLeave.id,
          leave_type: effectiveLeave.leave_type,
          infectious_disease_type: effectiveLeave.infectious_disease_type,
          from_date: effectiveLeave.from_date,
          from_halfday: effectiveLeave.from_halfday,
          to_date: effectiveLeave.to_date,
          to_halfday: effectiveLeave.to_halfday,
          reason: effectiveLeave.reason
        } : null,
        // 回填值
        prefilled_status: effectiveLeave ? (effectiveLeave.leave_type || 'absent') : 'normal',
        prefilled_infectious_type: effectiveLeave?.infectious_disease_type || null,
        prefilled_symptoms: effectiveLeave?.reason || null
      })
    }

    res.json({ students: preflightResults, check_date, check_type, halfday_period: halfday })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/**
 * 自动生成缺勤记录（PRD 异常自动请假补充）
 * 对当天标记为缺勤且无请假记录的学生，自动生成缺勤记录
 */
app.post('/api/health-checks/auto-absence', requirePermission('auto_absence'), async (req, res) => {
  try {
    const { check_date, campus_id } = req.body
    const dateCheck = validateDate(check_date)
    if (!dateCheck.valid) return res.status(400).json({ error: dateCheck.message })

    // 查询当天所有标记为缺勤的检查记录
    const checkWhere = { check_date, status: 'absent' }
    if (campus_id) checkWhere.campus_id = parseInt(campus_id)
    applyScopeFilter(checkWhere, req)

    const absentChecks = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'health_checks', where: checkWhere, limit: 10000
    })

    // 查询当天已有的缺勤记录（避免重复）
    const existingWhere = { absent_date: check_date }
    if (campus_id) existingWhere.campus_id = parseInt(campus_id)
    const existingRecords = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'absent_records', where: existingWhere, limit: 10000
    })
    const existingStudentIds = new Set((existingRecords.rows || []).map(r => r.student_id))

    // 查询当天已有的请假记录
    const leaveWhere = { from_date: check_date, status: 'approved' }
    const leaveRecords = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_records', where: leaveWhere, limit: 10000
    })
    const leaveStudentIds = new Set((leaveRecords.rows || []).map(r => r.student_id))

    // 为没有请假记录的缺勤学生自动生成缺勤记录
    const generated = []
    for (const check of (absentChecks.rows || [])) {
      if (existingStudentIds.has(check.student_id)) continue
      if (check.student_id === 0) continue // 跳过汇总记录
      if (leaveStudentIds.has(check.student_id)) continue // 有请假记录的不生成

      const data = {
        student_id: check.student_id,
        student_name: check.student_name || '',
        grade: check.grade || '',
        class_name: check.class_name || '',
        campus_id: check.campus_id,
        campus_name: check.campus_name || '',
        absent_date: check_date,
        absence_type: 'unexcused',
        reason: '未到校且无请假记录，系统自动生成',
        status: 'pending',
        auto_generated: true,
        leave_record_id: null
      }
      const result = await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'absent_records', data
      })
      generated.push({ id: result.id, ...data })
    }

    res.json({
      success: true,
      generated_count: generated.length,
      records: generated,
      summary: {
        total_absent: (absentChecks.rows || []).filter(r => r.student_id !== 0).length,
        already_had_leave: leaveStudentIds.size,
        already_had_record: existingStudentIds.size,
        newly_generated: generated.length
      }
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/health-checks/:id', requirePermission('conduct_check'), (req, res) => updateRecord(req, res, 'health_checks'))
app.delete('/api/health-checks/:id', requirePermission('conduct_check'), (req, res) => deleteRecord(req, res, 'health_checks'))

// ═══════════════════════════════════════════════════════════════════
// 请假记录 API（PRD FR-CJ-07/08）
// ═══════════════════════════════════════════════════════════════════
app.get('/api/leave-records', requirePermission('view_check'), async (req, res) => {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy'].includes(k)) where[k] = v
    }
    applyScopeFilter(where, req)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_records', where,
      orderBy: req.query.orderBy || 'from_date DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 手动创建请假记录（PRD FR-CJ-07） */
app.post('/api/leave-records', requirePermission('manage_leave'), async (req, res) => {
  try {
    const { student_id, student_name, grade, class_name, campus_id, campus_name,
            leave_type, infectious_disease_type,
            from_date, from_halfday, to_date, to_halfday,
            reason, agent_id, agent_name } = req.body

    // ── 必填字段验证 ──
    if (!student_id) return res.status(400).json({ error: '学生ID不能为空' })
    const fromDateCheck = validateDate(from_date)
    if (!fromDateCheck.valid) return res.status(400).json({ error: '开始日期: ' + fromDateCheck.message })
    const toDateCheck = validateDate(to_date)
    if (!toDateCheck.valid) return res.status(400).json({ error: '结束日期: ' + toDateCheck.message })
    if (!from_halfday || !['am', 'pm'].includes(from_halfday)) {
      return res.status(400).json({ error: '开始时段必须为 am（上午）/ pm（下午）' })
    }
    if (!to_halfday || !['am', 'pm'].includes(to_halfday)) {
      return res.status(400).json({ error: '结束时段必须为 am（上午）/ pm（下午）' })
    }

    // 区间合法性：from <= to
    const fromNum = dateToNum(from_date) * 2 + halfdayToNum(from_halfday)
    const toNum = dateToNum(to_date) * 2 + halfdayToNum(to_halfday)
    if (fromNum > toNum) {
      return res.status(400).json({ error: '请假结束时间不能早于开始时间' })
    }

    // 传染病类型：如果 leave_type 为 infectious，必须指定疾病类型
    if (leave_type === 'infectious' && !infectious_disease_type) {
      return res.status(400).json({ error: '传染病请假必须指定疾病类型' })
    }

    // 检查是否已存在冲突的请假（PRD 6.4 数据一致性约束）
    const existingLeaves = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_records',
      where: { student_id: parseInt(student_id), status: 'approved' },
      limit: 100
    })
    const conflict = (existingLeaves.rows || []).find(l => {
      const lFrom = dateToNum(l.from_date) * 2 + halfdayToNum(l.from_halfday)
      const lTo = dateToNum(l.to_date) * 2 + halfdayToNum(l.to_halfday)
      return fromNum <= lTo && toNum >= lFrom // 区间重叠
    })
    if (conflict) {
      return res.status(400).json({
        error: '该学生在指定时段已有请假记录',
        conflict_id: conflict.id,
        conflict_period: `${l.from_date}(${l.from_halfday}) ~ ${conflict.to_date}(${conflict.to_halfday})`
      })
    }

    const data = {
      student_id: parseInt(student_id),
      student_name: student_name || '',
      grade: grade || '',
      class_name: class_name || '',
      campus_id: campus_id ? parseInt(campus_id) : null,
      campus_name: campus_name || '',
      leave_type: leave_type || 'personal',
      infectious_disease_type: infectious_disease_type || null,
      from_date,
      from_halfday,
      to_date,
      to_halfday,
      reason: reason || '',
      status: 'approved',
      agent_id: agent_id ? parseInt(agent_id) : parseInt(req.userId) || null,
      agent_name: agent_name || '',
      auto_generated: false,
      source_check_id: null,
      recovery_material: null,
      recovery_date: null
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'leave_records', data
    })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/**
 * 销假（PRD FR-CJ-08 CJ-R6）
 * 提前结束请假区间；传染病销假强制复学材料
 */
app.post('/api/leave-records/:id/cancel', requirePermission('manage_leave'), async (req, res) => {
  try {
    const leaveId = parseInt(req.params.id)
    const { end_date, end_halfday, recovery_material } = req.body

    // 查询原请假记录
    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_records', where: { id: leaveId }, limit: 1
    })
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: '请假记录不存在' })
    }
    const leave = existing.rows[0]

    if (leave.status === 'cancelled') {
      return res.status(400).json({ error: '该请假记录已销假' })
    }

    // 验证结束时间
    if (end_date) {
      const dateCheck = validateDate(end_date)
      if (!dateCheck.valid) return res.status(400).json({ error: '结束日期: ' + dateCheck.message })
    }
    if (end_halfday && !['am', 'pm'].includes(end_halfday)) {
      return res.status(400).json({ error: '结束时段必须为 am/pm' })
    }

    // CJ-R7: 传染病销假强制复学材料
    const isInfectious = leave.leave_type === 'infectious' ||
      (leave.infectious_disease_type && leave.infectious_disease_type !== '')
    if (isInfectious && !recovery_material) {
      return res.status(400).json({ error: '传染病请假销假必须上传复学材料（医院复课证明）' })
    }

    const finalEndDate = end_date || new Date().toISOString().split('T')[0]
    const finalEndHalfday = end_halfday || 'pm'

    // CJ-R6: 更新请假区间终点（原位更新，留痕）
    const updateData = {
      to_date: finalEndDate,
      to_halfday: finalEndHalfday,
      status: 'cancelled',
      recovery_material: recovery_material || null,
      recovery_date: finalEndDate
    }

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'leave_records',
      where: { id: leaveId }, data: updateData
    })

    // 同步更新关联的传染病记录
    if (isInfectious) {
      try {
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'infectious_diseases',
          where: { student_id: leave.student_id, status: 'active' },
          data: { recovery_date: finalEndDate, status: 'recovered' }
        })
      } catch (_) { /* 可能没有关联的传染病记录 */ }
    }

    res.json({
      success: true,
      count: result.count,
      leave_id: leaveId,
      original_period: {
        from: `${leave.from_date}(${leave.from_halfday})`,
        to: `${leave.to_date}(${leave.to_halfday})`
      },
      updated_period: {
        from: `${leave.from_date}(${leave.from_halfday})`,
        to: `${finalEndDate}(${finalEndHalfday})`
      },
      infectious: isInfectious,
      recovery_material_attached: !!recovery_material
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 请假审批（PRD 请假审批） */
app.put('/api/leave-records/:id/approve', requirePermission('approve_leave'), async (req, res) => {
  try {
    const leaveId = parseInt(req.params.id)
    const { status, reason } = req.body

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: '审批状态必须为 approved / rejected' })
    }

    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_records', where: { id: leaveId }, limit: 1
    })
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: '请假记录不存在' })
    }

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'leave_records',
      where: { id: leaveId },
      data: { status, reason: reason || existing.rows[0].reason }
    })

    res.json({ success: true, count: result.count, leave_id: leaveId, new_status: status })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/leave-records/:id', requirePermission('manage_leave'), (req, res) => updateRecord(req, res, 'leave_records'))
app.delete('/api/leave-records/:id', requirePermission('manage_leave'), (req, res) => deleteRecord(req, res, 'leave_records'))

// ═══════════════════════════════════════════════════════════════════
// 缺勤记录 API
// ═══════════════════════════════════════════════════════════════════
app.get('/api/absent-records', requirePermission('view_check'), async (req, res) => {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy'].includes(k)) where[k] = v
    }
    applyScopeFilter(where, req)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'absent_records', where,
      orderBy: req.query.orderBy || 'absent_date DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/absent-records', requirePermission('manage_absence'), async (req, res) => {
  try {
    const { student_id, student_name, grade, class_name, campus_id, campus_name,
            absent_date, absence_type, reason, status, leave_record_id } = req.body

    if (!student_id) return res.status(400).json({ error: '学生ID不能为空' })
    const dateCheck = validateDate(absent_date)
    if (!dateCheck.valid) return res.status(400).json({ error: dateCheck.message })
    const typeCheck = validateAbsenceType(absence_type)
    if (!typeCheck.valid) return res.status(400).json({ error: typeCheck.message })

    const data = {
      student_id: parseInt(student_id),
      student_name: student_name || '',
      grade: grade || '',
      class_name: class_name || '',
      campus_id: campus_id ? parseInt(campus_id) : null,
      campus_name: campus_name || '',
      absent_date,
      absence_type: absence_type || 'personal',
      reason: reason || '',
      status: status || 'pending',
      auto_generated: false,
      leave_record_id: leave_record_id ? parseInt(leave_record_id) : null
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'absent_records', data
    })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/absent-records/:id', requirePermission('manage_absence'), (req, res) => updateRecord(req, res, 'absent_records'))
app.delete('/api/absent-records/:id', requirePermission('manage_absence'), (req, res) => deleteRecord(req, res, 'absent_records'))

// ═══════════════════════════════════════════════════════════════════
// 传染病登记 API（PRD FR-CJ-10）
// ═══════════════════════════════════════════════════════════════════
app.get('/api/infectious-diseases', requirePermission('view_check'), async (req, res) => {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy'].includes(k)) where[k] = v
    }
    applyScopeFilter(where, req)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'infectious_diseases', where,
      orderBy: req.query.orderBy || 'report_date DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/infectious-diseases', requirePermission('manage_infectious'), async (req, res) => {
  try {
    const { student_id, student_name, grade, class_name, campus_id,
            disease_name, diagnosis_date, reported_by, leave_record_id } = req.body

    if (!student_id) return res.status(400).json({ error: '学生ID不能为空' })
    if (!disease_name) return res.status(400).json({ error: '疾病名称不能为空' })
    const dateCheck = validateDate(diagnosis_date)
    if (!dateCheck.valid) return res.status(400).json({ error: dateCheck.message })

    const data = {
      student_id: parseInt(student_id),
      student_name: student_name || '',
      grade: grade || '',
      class_name: class_name || '',
      campus_id: campus_id ? parseInt(campus_id) : null,
      disease_name,
      diagnosis_date,
      recovery_date: null,
      status: 'active',
      reported_by: reported_by || '',
      report_date: new Date().toISOString().split('T')[0],
      leave_record_id: leave_record_id ? parseInt(leave_record_id) : null
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'infectious_diseases', data
    })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/infectious-diseases/:id', requirePermission('manage_infectious'), async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    // 标记康复
    if (req.body.status === 'recovered') {
      req.body.recovery_date = req.body.recovery_date || new Date().toISOString().split('T')[0]
    }

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'infectious_diseases', where: { id }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/infectious-diseases/:id', requirePermission('manage_infectious'), (req, res) => deleteRecord(req, res, 'infectious_diseases'))

// ═══════════════════════════════════════════════════════════════════
// 统计报表 API（PRD FR-CJ-09）
// ═══════════════════════════════════════════════════════════════════

/** 出勤率统计（单日） */
app.get('/api/statistics/attendance', requirePermission('view_statistics'), async (req, res) => {
  try {
    const { date, campus_id, grade, class_name } = req.query
    if (!date) return res.status(400).json({ error: '日期不能为空' })

    const where = { check_date: date }
    if (campus_id) where.campus_id = parseInt(campus_id)
    if (grade) where.grade = grade
    if (class_name) where.class_name = class_name
    applyScopeFilter(where, req)

    const checks = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'health_checks', where, limit: 10000
    })

    const rows = (checks.rows || []).filter(r => r.check_mode !== 'count')
    const total = rows.length
    const present = rows.filter(r => r.status === 'present' || r.status === 'normal').length
    const absent = rows.filter(r => r.status === 'absent').length
    const abnormal = rows.filter(r => r.is_abnormal || r.status === 'abnormal').length
    const normal = total - abnormal
    const locked = rows.filter(r => r.auto_lock).length

    res.json({
      date,
      total,
      present,
      absent,
      abnormal,
      normal,
      locked,
      attendance_rate: total > 0 ? Math.round((present / total) * 10000) / 100 : 0,
      absence_rate: total > 0 ? Math.round((absent / total) * 10000) / 100 : 0,
      abnormal_rate: total > 0 ? Math.round((abnormal / total) * 10000) / 100 : 0
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 缺勤趋势（日期范围） */
app.get('/api/statistics/absence-trend', requirePermission('view_statistics'), async (req, res) => {
  try {
    const { campus_id, date_from, date_to, grade, class_name } = req.query
    if (!date_from || !date_to) return res.status(400).json({ error: '必须指定日期范围' })

    const where = {}
    if (campus_id) where.campus_id = parseInt(campus_id)
    if (grade) where.grade = grade
    if (class_name) where.class_name = class_name
    applyScopeFilter(where, req)

    const checks = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'health_checks', where, limit: 10000
    })

    const from = new Date(date_from)
    const to = new Date(date_to)
    const filtered = (checks.rows || []).filter(r => {
      const d = new Date(r.check_date)
      return d >= from && d <= to && r.check_mode !== 'count'
    })

    // 按日期分组
    const byDate = {}
    for (const r of filtered) {
      const key = r.check_date
      if (!byDate[key]) byDate[key] = { date: key, total: 0, absent: 0, abnormal: 0, locked: 0 }
      byDate[key].total++
      if (r.status === 'absent') byDate[key].absent++
      if (r.is_abnormal || r.status === 'abnormal') byDate[key].abnormal++
      if (r.auto_lock) byDate[key].locked++
    }

    const trend = Object.values(byDate).map(d => ({
      ...d,
      attendance_rate: d.total > 0 ? Math.round(((d.total - d.absent) / d.total) * 10000) / 100 : 0,
      absence_rate: d.total > 0 ? Math.round((d.absent / d.total) * 10000) / 100 : 0,
      abnormal_rate: d.total > 0 ? Math.round((d.abnormal / d.total) * 10000) / 100 : 0
    })).sort((a, b) => a.date.localeCompare(b.date))

    res.json({ date_from, date_to, trend, total_days: trend.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 异常详情 */
app.get('/api/statistics/abnormal-detail', requirePermission('view_statistics'), async (req, res) => {
  try {
    const { date, campus_id, grade, class_name } = req.query
    if (!date) return res.status(400).json({ error: '日期不能为空' })

    const where = { check_date: date, is_abnormal: true }
    if (campus_id) where.campus_id = parseInt(campus_id)
    if (grade) where.grade = grade
    if (class_name) where.class_name = class_name
    applyScopeFilter(where, req)

    const checks = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'health_checks', where, limit: 1000
    })

    const rows = checks.rows || []

    // 按疾病类型分组
    const byDiseaseType = {}
    for (const r of rows) {
      const key = r.infectious_disease_type || '非传染病异常'
      if (!byDiseaseType[key]) byDiseaseType[key] = { type: key, count: 0, students: [] }
      byDiseaseType[key].count++
      byDiseaseType[key].students.push({
        student_id: r.student_id,
        student_name: r.student_name,
        class_name: r.class_name,
        grade: r.grade,
        symptoms: r.symptoms || r.abnormal_details
      })
    }

    res.json({
      date,
      records: rows,
      count: rows.length,
      by_disease_type: Object.values(byDiseaseType)
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 校区对比统计 */
app.get('/api/statistics/by-campus', requirePermission('view_statistics'), async (req, res) => {
  try {
    const { date } = req.query
    if (!date) return res.status(400).json({ error: '日期不能为空' })

    const checks = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'health_checks',
      where: { check_date: date }, limit: 10000
    })

    const rows = (checks.rows || []).filter(r => r.check_mode !== 'count')
    const byCampus = {}
    for (const r of rows) {
      const key = r.campus_name || `校区#${r.campus_id || '未知'}`
      if (!byCampus[key]) byCampus[key] = { campus_name: key, campus_id: r.campus_id, total: 0, present: 0, absent: 0, abnormal: 0, locked: 0 }
      byCampus[key].total++
      if (r.status === 'present' || r.status === 'normal') byCampus[key].present++
      if (r.status === 'absent') byCampus[key].absent++
      if (r.is_abnormal || r.status === 'abnormal') byCampus[key].abnormal++
      if (r.auto_lock) byCampus[key].locked++
    }

    const campuses = Object.values(byCampus).map(c => ({
      ...c,
      attendance_rate: c.total > 0 ? Math.round((c.present / c.total) * 10000) / 100 : 0,
      absence_rate: c.total > 0 ? Math.round((c.absent / c.total) * 10000) / 100 : 0,
      abnormal_rate: c.total > 0 ? Math.round((c.abnormal / c.total) * 10000) / 100 : 0
    }))

    res.json({ date, campuses })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 年级对比统计 */
app.get('/api/statistics/by-grade', requirePermission('view_statistics'), async (req, res) => {
  try {
    const { date, campus_id } = req.query
    if (!date) return res.status(400).json({ error: '日期不能为空' })

    const where = { check_date: date }
    if (campus_id) where.campus_id = parseInt(campus_id)
    applyScopeFilter(where, req)

    const checks = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'health_checks', where, limit: 10000
    })

    const rows = (checks.rows || []).filter(r => r.check_mode !== 'count')
    const byGrade = {}
    for (const r of rows) {
      const key = r.grade || `年级#未知`
      if (!byGrade[key]) byGrade[key] = { grade: key, total: 0, present: 0, absent: 0, abnormal: 0 }
      byGrade[key].total++
      if (r.status === 'present' || r.status === 'normal') byGrade[key].present++
      if (r.status === 'absent') byGrade[key].absent++
      if (r.is_abnormal || r.status === 'abnormal') byGrade[key].abnormal++
    }

    const grades = Object.values(byGrade).map(g => ({
      ...g,
      attendance_rate: g.total > 0 ? Math.round((g.present / g.total) * 10000) / 100 : 0,
      absence_rate: g.total > 0 ? Math.round((g.absent / g.total) * 10000) / 100 : 0,
      abnormal_rate: g.total > 0 ? Math.round((g.abnormal / g.total) * 10000) / 100 : 0
    }))

    res.json({ date, grades })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 班级对比统计 */
app.get('/api/statistics/by-class', requirePermission('view_statistics'), async (req, res) => {
  try {
    const { date, campus_id, grade } = req.query
    if (!date) return res.status(400).json({ error: '日期不能为空' })

    const where = { check_date: date }
    if (campus_id) where.campus_id = parseInt(campus_id)
    if (grade) where.grade = grade
    applyScopeFilter(where, req)

    const checks = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'health_checks', where, limit: 10000
    })

    const rows = (checks.rows || []).filter(r => r.check_mode !== 'count')
    const byClass = {}
    for (const r of rows) {
      const key = `${r.grade || ''}-${r.class_name || '未知'}`
      if (!byClass[key]) byClass[key] = { grade: r.grade, class_name: r.class_name, total: 0, present: 0, absent: 0, abnormal: 0 }
      byClass[key].total++
      if (r.status === 'present' || r.status === 'normal') byClass[key].present++
      if (r.status === 'absent') byClass[key].absent++
      if (r.is_abnormal || r.status === 'abnormal') byClass[key].abnormal++
    }

    const classes = Object.values(byClass).map(c => ({
      ...c,
      attendance_rate: c.total > 0 ? Math.round((c.present / c.total) * 10000) / 100 : 0,
      absence_rate: c.total > 0 ? Math.round((c.absent / c.total) * 10000) / 100 : 0,
      abnormal_rate: c.total > 0 ? Math.round((c.abnormal / c.total) * 10000) / 100 : 0
    })).sort((a, b) => a.attendance_rate - b.attendance_rate) // 按出勤率升序，问题班级在前

    res.json({ date, classes })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 传染病汇总 */
app.get('/api/statistics/infectious-disease-summary', requirePermission('view_statistics'), async (req, res) => {
  try {
    const where = {}
    if (req.query.status) where.status = req.query.status
    else where.status = 'active'
    applyScopeFilter(where, req)

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'infectious_diseases', where, limit: 10000
    })

    const rows = result.rows || []
    const byType = {}
    for (const r of rows) {
      const key = r.disease_name || '未知疾病'
      if (!byType[key]) byType[key] = { disease_name: key, count: 0, active: 0, recovered: 0 }
      byType[key].count++
      if (r.status === 'active') byType[key].active++
      if (r.status === 'recovered') byType[key].recovered++
    }

    // 按校区分布
    const byCampus = {}
    for (const r of rows) {
      const key = r.campus_id ? `校区#${r.campus_id}` : '未知校区'
      if (!byCampus[key]) byCampus[key] = { campus_id: r.campus_id, count: 0 }
      byCampus[key].count++
    }

    res.json({
      total: rows.length,
      total_active: rows.filter(r => r.status === 'active').length,
      total_recovered: rows.filter(r => r.status === 'recovered').length,
      by_type: Object.values(byType),
      by_campus: Object.values(byCampus)
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 缺勤闭环统计（PRD 缺勤概要） */
app.get('/api/statistics/absence-loop', requirePermission('view_statistics'), async (req, res) => {
  try {
    const { date, campus_id } = req.query
    if (!date) return res.status(400).json({ error: '日期不能为空' })

    // 获取当天所有缺勤记录
    const absentWhere = { absent_date: date }
    if (campus_id) absentWhere.campus_id = parseInt(campus_id)
    applyScopeFilter(absentWhere, req)

    const absentResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'absent_records', where: absentWhere, limit: 10000
    })
    const absentRows = absentResult.rows || []

    // 获取当天所有请假记录
    const leaveWhere = { from_date: date, status: 'approved' }
    const leaveResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_records', where: leaveWhere, limit: 10000
    })
    const leaveRows = leaveResult.rows || []
    const leaveStudentIds = new Set(leaveRows.map(l => l.student_id))

    // 闭环分析
    const totalAbsent = absentRows.length
    const withLeave = absentRows.filter(r => leaveStudentIds.has(r.student_id) || r.leave_record_id).length
    const withoutLeave = totalAbsent - withLeave
    const autoGenerated = absentRows.filter(r => r.auto_generated).length
    const pending = absentRows.filter(r => r.status === 'pending').length

    res.json({
      date,
      total_absent: totalAbsent,
      with_leave: withLeave,
      without_leave: withoutLeave,
      auto_generated: autoGenerated,
      pending_review: pending,
      closure_rate: totalAbsent > 0 ? Math.round((withLeave / totalAbsent) * 10000) / 100 : 0,
      records: absentRows
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 综合仪表盘（校长视角） */
app.get('/api/statistics/dashboard', requirePermission('view_statistics'), async (req, res) => {
  try {
    const { date } = req.query
    const today = date || new Date().toISOString().split('T')[0]

    // 并行查询
    const [todayChecks, activeInfectious, pendingAbsences] = await Promise.all([
      app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'health_checks',
        where: { check_date: today }, limit: 10000
      }),
      app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'infectious_diseases',
        where: { status: 'active' }, limit: 1000
      }),
      app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'absent_records',
        where: { absent_date: today, status: 'pending' }, limit: 1000
      })
    ])

    const checkRows = (todayChecks.rows || []).filter(r => r.check_mode !== 'count')
    const total = checkRows.length
    const present = checkRows.filter(r => r.status === 'present' || r.status === 'normal').length
    const absent = checkRows.filter(r => r.status === 'absent').length
    const abnormal = checkRows.filter(r => r.is_abnormal || r.status === 'abnormal').length

    // 按检查类型分
    const morningChecks = checkRows.filter(r => r.check_type === 'morning')
    const afternoonChecks = checkRows.filter(r => r.check_type === 'afternoon')

    res.json({
      date: today,
      attendance: {
        total,
        present,
        absent,
        abnormal,
        attendance_rate: total > 0 ? Math.round((present / total) * 10000) / 100 : 0,
        absence_rate: total > 0 ? Math.round((absent / total) * 10000) / 100 : 0,
        abnormal_rate: total > 0 ? Math.round((abnormal / total) * 10000) / 100 : 0
      },
      morning: {
        total: morningChecks.length,
        present: morningChecks.filter(r => r.status === 'present' || r.status === 'normal').length,
        absent: morningChecks.filter(r => r.status === 'absent').length
      },
      afternoon: {
        total: afternoonChecks.length,
        present: afternoonChecks.filter(r => r.status === 'present' || r.status === 'normal').length,
        absent: afternoonChecks.filter(r => r.status === 'absent').length
      },
      infectious: {
        active_count: (activeInfectious.rows || []).length,
        by_type: Object.values(
          (activeInfectious.rows || []).reduce((acc, r) => {
            const key = r.disease_name || '未知'
            if (!acc[key]) acc[key] = { disease: key, count: 0 }
            acc[key].count++
            return acc
          }, {})
        )
      },
      pending_absences: (pendingAbsences.rows || []).length
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 检查上报进度（按班级） */
app.get('/api/statistics/check-progress', requirePermission('view_statistics'), async (req, res) => {
  try {
    const { date, check_type, campus_id } = req.query
    if (!date) return res.status(400).json({ error: '日期不能为空' })

    // 获取所有班级
    const classResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'campus_hierarchy',
      where: { level: 'class' }, limit: 1000
    })
    let allClasses = classResult.rows || []
    if (campus_id) {
      // 过滤出该校区的班级（简化：通过 parent_id 链路）
      // 这里直接返回所有班级，让前端按校区过滤
    }

    // 获取当天已上报的检查
    const checkWhere = { check_date: date }
    if (check_type) checkWhere.check_type = check_type
    const checkResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'health_checks', where: checkWhere, limit: 10000
    })
    const checkRows = checkResult.rows || []

    // 按班级统计已上报情况
    const reportedClasses = new Set()
    const classCheckMap = {}
    for (const r of checkRows) {
      if (r.check_mode === 'count') {
        // 记数模式通过 class_name 关联
        const key = `${r.grade || ''}-${r.class_name || ''}`
        reportedClasses.add(key)
        classCheckMap[key] = r
      } else {
        // 记名模式通过 student 关联
        const key = `${r.grade || ''}-${r.class_name || ''}`
        if (!classCheckMap[key]) {
          classCheckMap[key] = { total: 0, present: 0, absent: 0 }
          reportedClasses.add(key)
        }
        classCheckMap[key].total++
        if (r.status === 'present' || r.status === 'normal') classCheckMap[key].present++
        if (r.status === 'absent') classCheckMap[key].absent++
      }
    }

    const totalClasses = allClasses.length
    const reportedCount = reportedClasses.size
    const unreportedClasses = allClasses.filter(c => {
      const key = `${c.grade_name || ''}-${c.class_name || ''}`
      return !reportedClasses.has(key)
    })

    res.json({
      date,
      check_type: check_type || 'all',
      total_classes: totalClasses,
      reported_classes: reportedCount,
      unreported_classes: unreportedClasses.map(c => ({
        id: c.id,
        grade: c.grade_name,
        class_name: c.class_name,
        responsible: c.responsible_name
      })),
      report_rate: totalClasses > 0 ? Math.round((reportedCount / totalClasses) * 10000) / 100 : 0
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 兼容旧版统计接口
app.get('/api/statistics', requirePermission('view_statistics'), async (req, res) => {
  try {
    const { date } = req.query
    const checks = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'health_checks',
      where: { check_date: date },
      limit: 10000
    })

    const rows = (checks.rows || []).filter(r => r.check_mode !== 'count')
    const total = rows.length
    const abnormal = rows.filter(r => r.is_abnormal || r.status === 'abnormal').length
    const normal = total - abnormal

    res.json({ date, total, normal, abnormal })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
