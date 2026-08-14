import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'special-student-care', port: 8093 })

const frontendDist = join(__dirname, 'frontend', 'dist')

// ─── Static file serving ───
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
    res.status(404).send('Frontend not built')
  }
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', appId: req.appId, orgId: req.orgId })
})

// ─── Table definitions ───
const TABLES = {
  // GA: 学生基础信息（建档）
  special_students: [
    { name: 'student_code', type: 'text' },             // 学号
    { name: 'name', type: 'text' },                      // 包保学生姓名
    { name: 'grade_id', type: 'integer' },               // 年级
    { name: 'class_id', type: 'integer' },               // 班级
    { name: 'condition_type', type: 'text' },             // 类型（心理关怀/家庭变故/行为偏差等）
    { name: 'care_level_id', type: 'integer' },           // 关爱级别
    { name: 'guardian_name', type: 'text' },              // 监护人姓名
    { name: 'guardian_phone', type: 'text' },             // 监护人电话
    { name: 'community', type: 'text' },                  // 所属社区
    { name: 'address', type: 'text' },                    // 住址
    { name: 'responsible_teacher_id', type: 'integer' },  // 包保负责人
    { name: 'responsible_teacher_name', type: 'text' },
    { name: 'responsible_teacher_phone', type: 'text' },
    { name: 'leader_id', type: 'integer' },               // 包保领导
    { name: 'leader_name', type: 'text' },
    { name: 'leader_phone', type: 'text' },
    { name: 'remarks', type: 'text' },                    // 备注
    { name: 'status', type: 'text' },                     // active / paused / closed
    { name: 'created_by', type: 'integer' },
    { name: 'created_at', type: 'timestamp' }
  ],

  // GA: 关爱级别配置
  care_levels: [
    { name: 'level_name', type: 'text' },       // 级别名称（如"一级关爱"）
    { name: 'period_type', type: 'text' },      // 关爱周期：month / semester
    { name: 'period_count', type: 'integer' },  // 周期次数
    { name: 'description', type: 'text' }
  ],

  // GA: 年级配置
  grades: [
    { name: 'grade_name', type: 'text' },
    { name: 'director_id', type: 'integer' },   // 年级主任
    { name: 'director_name', type: 'text' }
  ],

  // GA: 班级配置
  classes: [
    { name: 'grade_id', type: 'integer' },
    { name: 'class_name', type: 'text' },
    { name: 'teacher_id', type: 'integer' },    // 班主任
    { name: 'teacher_name', type: 'text' }
  ],

  // GA: 心理教师名单（LEADER 轨道准入）
  psychological_teachers: [
    { name: 'teacher_id', type: 'integer' },
    { name: 'teacher_name', type: 'text' }
  ],

  // GA: 关爱计划（主表）
  care_plans: [
    { name: 'initiator_role', type: 'text' },    // teacher / psychological_teacher
    { name: 'initiator_id', type: 'integer' },
    { name: 'initiator_name', type: 'text' },
    { name: 'grade_id', type: 'integer' },
    { name: 'class_id', type: 'integer' },
    { name: 'period_type', type: 'text' },       // month / semester
    { name: 'period_month', type: 'text' },      // 月份（YYYY-MM）
    { name: 'academic_year', type: 'text' },     // 学年（如 "2025-2026"）
    { name: 'semester', type: 'integer' },       // 学期（1/2）
    { name: 'status', type: 'text' },            // draft / submitted / active
    { name: 'created_at', type: 'timestamp' }
  ],

  // GA: 关爱计划明细
  care_plan_items: [
    { name: 'plan_id', type: 'integer' },
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'responsible_teacher_id', type: 'integer' },
    { name: 'responsible_teacher_name', type: 'text' },
    { name: 'is_checked', type: 'boolean' },     // 本周期检查（暂缓审批通过后清空）
    { name: 'planned_count', type: 'integer' }   // 本周期检查次数
  ],

  // GA: 关爱登记（执行凭证）
  care_records: [
    { name: 'academic_year', type: 'text' },
    { name: 'semester', type: 'integer' },
    { name: 'care_date', type: 'date' },
    { name: 'teacher_id', type: 'integer' },
    { name: 'teacher_name', type: 'text' },
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'care_form', type: 'text' },         // 谈心谈话/家访/学业辅导等
    { name: 'content', type: 'text' },
    { name: 'image_urls', type: 'text' },        // 图片URL（JSON数组）
    { name: 'created_at', type: 'timestamp' }
  ],

  // GA: 暂缓关爱审批记录
  care_pause_requests: [
    { name: 'summary', type: 'text' },           // 情况简述
    { name: 'reason', type: 'text' },            // 理由
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'plan_id', type: 'integer' },        // PlanUUID
    { name: 'plan_snapshot', type: 'text' },     // DataJSON（计划明细快照）
    { name: 'initiator_id', type: 'integer' },
    { name: 'initiator_name', type: 'text' },
    { name: 'grade_director_id', type: 'integer' },  // 年级组长（审批人）
    { name: 'grade_director_name', type: 'text' },
    { name: 'workflow_instance_id', type: 'integer' },
    { name: 'status', type: 'text' },            // pending / approved / rejected
    { name: 'created_at', type: 'timestamp' }
  ],

  // GA: 提醒
  care_reminders: [
    { name: 'receiver_id', type: 'integer' },
    { name: 'receiver_name', type: 'text' },
    { name: 'content', type: 'text' },
    { name: 'is_read', type: 'boolean' },
    { name: 'created_at', type: 'timestamp' }
  ]
}

// ─── Initialize tables ───
app.onStart(async () => {
  for (const [tableName, columns] of Object.entries(TABLES)) {
    try {
      await app.mcp.call('data.create_table', { orgId: app.orgId, tableName, columns })
      console.log(`[init] Table '${tableName}' ready`)
    } catch (e) {
      console.log(`[init] Table '${tableName}' already exists`)
    }
  }

  // Register workflow definition for care pause approval
  try {
    await app.mcp.call('workflow.define', {
      orgId: app.orgId,
      name: 'care_pause_approval',
      description: '暂缓关爱审批流程：包保教师发起，年级组长审批',
      variables: {
        studentId: 'number',
        studentName: 'string',
        planId: 'number',
        planSnapshot: 'string',
        reason: 'string',
        gradeDirectorId: 'number'
      },
      steps: [
        {
          name: 'submit',
          type: 'start',
          next: 'grade_director_approve'
        },
        {
          name: 'grade_director_approve',
          type: 'approval',
          assignee: { type: 'variable', value: 'gradeDirectorId' },
          on_approve: { goto: 'end_approved' },
          on_reject: { goto: 'end_rejected' }
        },
        { name: 'end_approved', type: 'end', result: 'approved' },
        { name: 'end_rejected', type: 'end', result: 'rejected' }
      ]
    })
    console.log('[init] Workflow definition "care_pause_approval" registered')
  } catch (e) {
    console.log(`[init] Workflow definition already exists or error: ${e.message}`)
  }
})

// ─── Helper: generic CRUD ───
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

// ─── Helper: query all rows from a table ───
async function queryAll(orgId, tableName, where = {}) {
  const result = await app.mcp.call('data.query', {
    orgId, tableName, where, limit: 10000
  })
  return result.rows || []
}

// ─── Helper: get current user context from request ───
function getUserContext(req) {
  return {
    userId: parseInt(req.headers['x-user-id'] || '0'),
    userName: req.headers['x-user-name'] || '',
    userRole: req.headers['x-user-role'] || 'teacher' // admin / psychological_teacher / grade_director / teacher
  }
}

// ─── Helper: check if user is psychological teacher ───
async function isPsychologicalTeacher(orgId, userId) {
  const teachers = await queryAll(orgId, 'psychological_teachers', { teacher_id: userId })
  return teachers.length > 0
}

// ─── Helper: get grade director ───
async function getGradeDirector(orgId, gradeId) {
  const grades = await queryAll(orgId, 'grades', { id: gradeId })
  return grades.length > 0 ? grades[0] : null
}

// ─── Helper: check if user is class teacher ───
async function isClassTeacher(orgId, userId, classId) {
  const classes = await queryAll(orgId, 'classes', { id: classId })
  return classes.length > 0 && classes[0].teacher_id === userId
}

// ─── Academic year / semester engine ───
function getCurrentAcademicYearSemester() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()

  // 第一学期起点：8月25日；第二学期起点：2月1日
  const firstSemesterStart = new Date(year, 7, 25) // Aug 25
  const secondSemesterStart = new Date(year, 1, 1)  // Feb 1

  let academicYear, semester
  if (now >= firstSemesterStart) {
    // 8/25 之后 → 当前学年第1学期
    academicYear = `${year}-${year + 1}`
    semester = 1
  } else if (now >= secondSemesterStart) {
    // 2/1 ~ 8/24 → 当前学年第2学期
    academicYear = `${year - 1}-${year}`
    semester = 2
  } else {
    // 1/1 ~ 1/31 → 上一学年第2学期
    academicYear = `${year - 1}-${year}`
    semester = 2
  }

  return { academicYear, semester, year, month }
}

function getMonthWindow(periodMonth) {
  // periodMonth: "YYYY-MM"
  const [y, m] = periodMonth.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 1)
  return { start, end }
}

// ═══════════════════════════════════════════════
// REST API Routes
// ═══════════════════════════════════════════════

// ─── Care Levels ───
app.get('/api/care-levels', (req, res) => listRecords(req, res, 'care_levels'))
app.post('/api/care-levels', (req, res) => createRecord(req, res, 'care_levels'))
app.put('/api/care-levels/:id', (req, res) => updateRecord(req, res, 'care_levels'))
app.delete('/api/care-levels/:id', (req, res) => deleteRecord(req, res, 'care_levels'))

// ─── Grades ───
app.get('/api/grades', (req, res) => listRecords(req, res, 'grades'))
app.post('/api/grades', (req, res) => createRecord(req, res, 'grades'))
app.put('/api/grades/:id', (req, res) => updateRecord(req, res, 'grades'))
app.delete('/api/grades/:id', (req, res) => deleteRecord(req, res, 'grades'))

// ─── Classes ───
app.get('/api/classes', (req, res) => listRecords(req, res, 'classes'))
app.post('/api/classes', (req, res) => createRecord(req, res, 'classes'))
app.put('/api/classes/:id', (req, res) => updateRecord(req, res, 'classes'))
app.delete('/api/classes/:id', (req, res) => deleteRecord(req, res, 'classes'))

// ─── Psychological Teachers ───
app.get('/api/psychological-teachers', (req, res) => listRecords(req, res, 'psychological_teachers'))
app.post('/api/psychological-teachers', (req, res) => createRecord(req, res, 'psychological_teachers'))
app.delete('/api/psychological-teachers/:id', (req, res) => deleteRecord(req, res, 'psychological_teachers'))

// ─── Special Students (GA-R1: 建档) ───
app.get('/api/students', async (req, res) => {
  try {
    const user = getUserContext(req)
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy'].includes(k)) where[k] = v
    }

    // Permission: teachers can only see students in their class
    if (user.userRole === 'teacher') {
      const myClasses = await queryAll(req.orgId, 'classes', { teacher_id: user.userId })
      const classIds = myClasses.map(c => c.id)
      if (classIds.length === 0) {
        return res.json({ rows: [], count: 0 })
      }
      where.class_id = classIds[0] // teacher only sees own class
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'special_students', where,
      orderBy: req.query.orderBy || '',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })

    // Enrich with care level info
    const levels = await queryAll(req.orgId, 'care_levels')
    const levelMap = {}
    levels.forEach(l => { levelMap[l.id] = l })

    const rows = (result.rows || []).map(s => ({
      ...s,
      care_level: levelMap[s.care_level_id] || null
    }))

    res.json({ ...result, rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/students', async (req, res) => {
  try {
    const user = getUserContext(req)
    // Permission check
    if (user.userRole === 'teacher') {
      return res.status(403).json({ error: '教师无权创建特殊学生档案，请联系管理员或心理教师' })
    }
    const data = { ...req.body, created_by: user.userId, created_at: new Date().toISOString(), status: 'active' }
    const result = await app.mcp.call('data.insert', { orgId: req.orgId, tableName: 'special_students', data })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/students/:id', async (req, res) => {
  try {
    const user = getUserContext(req)
    if (user.userRole === 'teacher') {
      return res.status(403).json({ error: '教师无权编辑特殊学生档案' })
    }
    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'special_students',
      where: { id: parseInt(req.params.id) }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/students/:id', async (req, res) => {
  try {
    const user = getUserContext(req)
    if (user.userRole === 'teacher') {
      return res.status(403).json({ error: '教师无权删除特殊学生档案' })
    }
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'special_students',
      where: { id: parseInt(req.params.id) }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Care Plans (GA-R1/R2: 计划生成) ───
app.get('/api/plans', async (req, res) => {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy'].includes(k)) where[k] = v
    }
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'care_plans', where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GA-R1/R2: 生成关爱计划（含身份校验）
app.post('/api/plans', async (req, res) => {
  try {
    const user = getUserContext(req)
    const { initiator_role, class_id, period_type, period_month, academic_year, semester, items } = req.body

    // GA-R2: 身份校验
    if (initiator_role === 'teacher') {
      const isTeacher = await isClassTeacher(req.orgId, user.userId, class_id)
      if (!isTeacher) {
        return res.status(400).json({ error: '您不是班主任，不可以以普通教师的身份提交！' })
      }
    } else if (initiator_role === 'psychological_teacher') {
      const isPsy = await isPsychologicalTeacher(req.orgId, user.userId)
      if (!isPsy && user.userRole !== 'admin') {
        return res.status(403).json({ error: '您不在心理教师名单中，无法以心理教师身份提交' })
      }
    }

    // Create plan
    const planData = {
      initiator_role,
      initiator_id: user.userId,
      initiator_name: user.userName,
      grade_id: req.body.grade_id,
      class_id,
      period_type,
      period_month: period_type === 'month' ? period_month : '',
      academic_year: period_type === 'semester' ? academic_year : '',
      semester: period_type === 'semester' ? semester : 0,
      status: 'submitted',
      created_at: new Date().toISOString()
    }
    const planResult = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'care_plans', data: planData
    })
    const planId = planResult.id

    // Create plan items
    if (items && items.length > 0) {
      for (const item of items) {
        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'care_plan_items',
          data: {
            plan_id: planId,
            student_id: item.student_id,
            student_name: item.student_name,
            responsible_teacher_id: item.responsible_teacher_id,
            responsible_teacher_name: item.responsible_teacher_name,
            is_checked: true,
            planned_count: item.planned_count
          }
        })
      }
    }

    res.json({ id: planId, ...planData })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Plan Items ───
app.get('/api/plan-items', async (req, res) => {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy'].includes(k)) where[k] = v
    }
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'care_plan_items', where,
      limit: parseInt(req.query.limit || '1000'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/plan-items/:id', async (req, res) => {
  try {
    const user = getUserContext(req)
    // Only psychological teacher or admin can edit plan items
    if (user.userRole === 'teacher') {
      return res.status(403).json({ error: '仅心理教师可调整计划明细' })
    }
    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'care_plan_items',
      where: { id: parseInt(req.params.id) }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Care Records (GA-R3: 关爱登记) ───
app.get('/api/records', async (req, res) => {
  try {
    const user = getUserContext(req)
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy'].includes(k)) where[k] = v
    }

    // Teachers can only see records for their students
    if (user.userRole === 'teacher') {
      // Filter by teacher_id (the care teacher)
      where.teacher_id = user.userId
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'care_records', where,
      orderBy: req.query.orderBy || 'care_date DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/records', async (req, res) => {
  try {
    const user = getUserContext(req)
    const data = {
      ...req.body,
      teacher_id: user.userId,
      teacher_name: user.userName,
      created_at: new Date().toISOString()
    }
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'care_records', data
    })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/records/:id', (req, res) => updateRecord(req, res, 'care_records'))
app.delete('/api/records/:id', (req, res) => deleteRecord(req, res, 'care_records'))

// ═══════════════════════════════════════════════
// Business Logic Endpoints
// ═══════════════════════════════════════════════

// ─── GA-R3: 关爱完成率统计（计划 vs 实际）───
app.get('/api/stats/completion', async (req, res) => {
  try {
    const { period_type, period_month, academic_year, semester, class_id } = req.query
    const orgId = req.orgId

    // Get all plans matching criteria
    const planWhere = { period_type }
    if (period_type === 'month' && period_month) planWhere.period_month = period_month
    if (period_type === 'semester' && academic_year) planWhere.academic_year = academic_year
    if (class_id) planWhere.class_id = parseInt(class_id)

    const plans = await queryAll(orgId, 'care_plans', planWhere)
    const planIds = plans.map(p => p.id)

    if (planIds.length === 0) {
      return res.json({ students: [], summary: { total: 0, completed: 0, rate: 0 } })
    }

    // Get plan items
    const allItems = []
    for (const pid of planIds) {
      const items = await queryAll(orgId, 'care_plan_items', { plan_id: pid, is_checked: true })
      allItems.push(...items)
    }

    // Get care records and calculate completion per student
    const allRecords = await queryAll(orgId, 'care_records')
    const recordsByStudent = {}
    for (const r of allRecords) {
      const sid = r.student_id
      if (!recordsByStudent[sid]) recordsByStudent[sid] = []
      recordsByStudent[sid].push(r)
    }

    // Calculate per student
    const students = allItems.map(item => {
      const records = recordsByStudent[item.student_id] || []

      // Filter records by time window (GA-R3)
      let filteredRecords = records
      if (period_type === 'month' && period_month) {
        const window = getMonthWindow(period_month)
        filteredRecords = records.filter(r => {
          const d = new Date(r.care_date)
          return d >= window.start && d < window.end
        })
      }
      // For semester, no extra date filter (whole semester)
      if (period_type === 'semester' && academic_year && semester) {
        // Filter by academic year/semester
        filteredRecords = records.filter(r =>
          r.academic_year === academic_year && parseInt(r.semester) === parseInt(semester)
        )
      }

      const completedCount = filteredRecords.length
      const plannedCount = item.planned_count || 0
      const remainingCount = Math.max(0, plannedCount - completedCount)

      return {
        student_id: item.student_id,
        student_name: item.student_name,
        responsible_teacher_id: item.responsible_teacher_id,
        responsible_teacher_name: item.responsible_teacher_name,
        planned_count: plannedCount,
        completed_count: completedCount,
        remaining_count: remainingCount,
        completion_rate: plannedCount > 0 ? Math.round((completedCount / plannedCount) * 100) : 0
      }
    })

    const totalPlanned = students.reduce((s, x) => s + x.planned_count, 0)
    const totalCompleted = students.reduce((s, x) => s + x.completed_count, 0)

    res.json({
      students,
      summary: {
        total: students.length,
        total_planned: totalPlanned,
        total_completed: totalCompleted,
        rate: totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0
      }
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── GA: 首页工作台（按登录人聚合）───
app.get('/api/dashboard/home', async (req, res) => {
  try {
    const user = getUserContext(req)
    const orgId = req.orgId

    // 1. 待关爱任务（包保责任人为登录人的计划行）
    const allPlans = await queryAll(orgId, 'care_plans', { status: 'submitted' })
    const planIds = allPlans.map(p => p.id)

    const pendingTasks = []
    for (const pid of planIds) {
      const items = await queryAll(orgId, 'care_plan_items', {
        plan_id: pid, is_checked: true, responsible_teacher_id: user.userId
      })
      for (const item of items) {
        // Calculate remaining count
        const records = await queryAll(orgId, 'care_records', { student_id: item.student_id, teacher_id: user.userId })
        const plan = allPlans.find(p => p.id === pid)
        let filteredRecords = records
        if (plan && plan.period_type === 'month' && plan.period_month) {
          const window = getMonthWindow(plan.period_month)
          filteredRecords = records.filter(r => {
            const d = new Date(r.care_date)
            return d >= window.start && d < window.end
          })
        }
        const remaining = Math.max(0, (item.planned_count || 0) - filteredRecords.length)
        if (remaining > 0) {
          pendingTasks.push({
            plan_id: pid,
            item_id: item.id,
            student_id: item.student_id,
            student_name: item.student_name,
            planned_count: item.planned_count,
            completed_count: filteredRecords.length,
            remaining_count: remaining,
            period_type: plan?.period_type,
            period_month: plan?.period_month
          })
        }
      }
    }

    // 2. 我包保的学生
    const myStudents = await queryAll(orgId, 'special_students', { responsible_teacher_id: user.userId, status: 'active' })

    // 3. 本班特殊学生（班主任）
    let classStudents = []
    const myClasses = await queryAll(orgId, 'classes', { teacher_id: user.userId })
    if (myClasses.length > 0) {
      for (const cls of myClasses) {
        const students = await queryAll(orgId, 'special_students', { class_id: cls.id, status: 'active' })
        classStudents.push(...students.map(s => ({ ...s, class_name: cls.class_name })))
      }
    }

    // 4. 我的关爱历史
    const myRecords = await queryAll(orgId, 'care_records', { teacher_id: user.userId })

    // 5. 我的提醒
    const myReminders = await queryAll(orgId, 'care_reminders', { receiver_id: user.userId })

    res.json({
      pending_tasks: pendingTasks,
      my_students: myStudents,
      class_students: classStudents,
      my_records: myRecords.slice(0, 20), // Latest 20
      my_reminders: myReminders.filter(r => !r.is_read).slice(0, 10),
      academic_info: getCurrentAcademicYearSemester()
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── GA-F2: 暂缓关爱审批 ───
app.post('/api/pause-requests', async (req, res) => {
  try {
    const user = getUserContext(req)
    const { student_id, student_name, plan_id, reason } = req.body

    // Get student info to find grade
    const students = await queryAll(req.orgId, 'special_students', { id: student_id })
    if (students.length === 0) {
      return res.status(404).json({ error: '未找到该学生' })
    }
    const student = students[0]

    // Get grade director
    const grade = await getGradeDirector(req.orgId, student.grade_id)
    if (!grade) {
      return res.status(400).json({ error: '未找到该学生所在年级的年级组长' })
    }

    // Get plan items snapshot
    const planItems = await queryAll(req.orgId, 'care_plan_items', { plan_id: plan_id })
    // Remove the target student's check (GA-R5)
    const snapshot = planItems.map(item => ({
      ...item,
      is_checked: item.student_id === student_id ? false : item.is_checked
    }))

    // Start workflow
    let workflowInstanceId = null
    try {
      const wfResult = await app.mcp.call('workflow.start', {
        orgId: req.orgId,
        definitionName: 'care_pause_approval',
        variables: {
          studentId: student_id,
          studentName: student_name,
          planId: plan_id,
          planSnapshot: JSON.stringify(snapshot),
          reason: reason,
          gradeDirectorId: grade.director_id
        },
        initiatedBy: user.userId
      })
      workflowInstanceId = wfResult.instanceId
    } catch (e) {
      console.log(`[workflow] Failed to start: ${e.message}`)
    }

    // Save pause request
    const requestData = {
      summary: `教师【${user.userName}】请求暂缓本周期对学生【${student_name}】的关爱`,
      reason,
      student_id,
      student_name,
      plan_id,
      plan_snapshot: JSON.stringify(snapshot),
      initiator_id: user.userId,
      initiator_name: user.userName,
      grade_director_id: grade.director_id,
      grade_director_name: grade.director_name,
      workflow_instance_id: workflowInstanceId,
      status: 'pending',
      created_at: new Date().toISOString()
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'care_pause_requests', data: requestData
    })

    res.json({ id: result.id, ...requestData })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/pause-requests', (req, res) => listRecords(req, res, 'care_pause_requests'))

// Approve/reject pause request (callback from workflow)
app.post('/api/pause-requests/:id/approve', async (req, res) => {
  try {
    const pauseId = parseInt(req.params.id)
    const { action } = req.body // approve / reject

    // Get pause request
    const requests = await queryAll(req.orgId, 'care_pause_requests', { id: pauseId })
    if (requests.length === 0) {
      return res.status(404).json({ error: '未找到暂缓申请' })
    }
    const pauseReq = requests[0]

    if (action === 'approve') {
      // GA-R5: 回写计划明细快照
      const snapshot = JSON.parse(pauseReq.plan_snapshot)

      // Delete old plan items and insert new ones
      const oldItems = await queryAll(req.orgId, 'care_plan_items', { plan_id: pauseReq.plan_id })
      for (const item of oldItems) {
        await app.mcp.call('data.delete', {
          orgId: req.orgId, tableName: 'care_plan_items',
          where: { id: item.id }
        })
      }
      for (const item of snapshot) {
        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'care_plan_items',
          data: {
            plan_id: pauseReq.plan_id,
            student_id: item.student_id,
            student_name: item.student_name,
            responsible_teacher_id: item.responsible_teacher_id,
            responsible_teacher_name: item.responsible_teacher_name,
            is_checked: item.is_checked,
            planned_count: item.planned_count
          }
        })
      }

      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'care_pause_requests',
        where: { id: pauseId }, data: { status: 'approved' }
      })
    } else {
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'care_pause_requests',
        where: { id: pauseId }, data: { status: 'rejected' }
      })
    }

    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── GA-F3: 看板 - 班级计划上报情况 ───
app.get('/api/dashboard/plan-report', async (req, res) => {
  try {
    const { grade_id, period_type, period_month, academic_year, semester } = req.query
    const orgId = req.orgId

    // Get all classes (optionally filtered by grade)
    const classWhere = {}
    if (grade_id) classWhere.grade_id = parseInt(grade_id)
    const classes = await queryAll(orgId, 'classes', classWhere)

    // Get plans matching criteria
    const planWhere = { period_type, status: 'submitted' }
    if (period_type === 'month' && period_month) planWhere.period_month = period_month
    if (period_type === 'semester' && academic_year) planWhere.academic_year = academic_year

    const plans = await queryAll(orgId, 'care_plans', planWhere)
    const planClassIds = new Set(plans.map(p => p.class_id))

    const report = classes.map(cls => ({
      class_id: cls.id,
      class_name: cls.class_name,
      teacher_name: cls.teacher_name,
      has_reported: planClassIds.has(cls.id)
    }))

    const reportedCount = report.filter(r => r.has_reported).length

    res.json({
      classes: report,
      summary: {
        total: classes.length,
        reported: reportedCount,
        not_reported: classes.length - reportedCount,
        rate: classes.length > 0 ? Math.round((reportedCount / classes.length) * 100) : 0
      }
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── GA-F3: 看板 - 学生情况动态摸排 ───
app.get('/api/dashboard/student-survey', async (req, res) => {
  try {
    const { search, grade_id, class_id } = req.query
    const orgId = req.orgId

    const where = { status: 'active' }
    if (grade_id) where.grade_id = parseInt(grade_id)
    if (class_id) where.class_id = parseInt(class_id)

    const students = await queryAll(orgId, 'special_students', where)

    // Get care levels
    const levels = await queryAll(orgId, 'care_levels')
    const levelMap = {}
    levels.forEach(l => { levelMap[l.id] = l })

    // Get grades
    const grades = await queryAll(orgId, 'grades')
    const gradeMap = {}
    grades.forEach(g => { gradeMap[g.id] = g })

    // Get classes
    const classes = await queryAll(orgId, 'classes')
    const classMap = {}
    classes.forEach(c => { classMap[c.id] = c })

    let result = students.map(s => ({
      ...s,
      care_level: levelMap[s.care_level_id] || null,
      grade_name: gradeMap[s.grade_id]?.grade_name || '',
      class_name: classMap[s.class_id]?.class_name || '',
      grade_director: gradeMap[s.grade_id]?.director_name || ''
    }))

    // Search filter
    if (search) {
      const keyword = search.toLowerCase()
      result = result.filter(s =>
        s.name.toLowerCase().includes(keyword) ||
        (s.guardian_name || '').toLowerCase().includes(keyword)
      )
    }

    res.json({ students: result, total: result.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── GA-F3: 看板 - 关爱次数统计 + 一键提醒 ───
app.get('/api/dashboard/care-stats', async (req, res) => {
  try {
    const { period_type, period_month, academic_year, semester, class_id, search } = req.query
    const orgId = req.orgId

    // Reuse completion stats
    const planWhere = { period_type }
    if (period_type === 'month' && period_month) planWhere.period_month = period_month
    if (period_type === 'semester' && academic_year) planWhere.academic_year = academic_year
    if (class_id) planWhere.class_id = parseInt(class_id)

    const plans = await queryAll(orgId, 'care_plans', planWhere)
    const planIds = plans.map(p => p.id)

    if (planIds.length === 0) {
      return res.json({ students: [], summary: { total: 0 } })
    }

    const allItems = []
    for (const pid of planIds) {
      const items = await queryAll(orgId, 'care_plan_items', { plan_id: pid, is_checked: true })
      allItems.push(...items)
    }

    const allRecords = await queryAll(orgId, 'care_records')
    const recordsByStudent = {}
    for (const r of allRecords) {
      if (!recordsByStudent[r.student_id]) recordsByStudent[r.student_id] = []
      recordsByStudent[r.student_id].push(r)
    }

    let students = allItems.map(item => {
      const records = recordsByStudent[item.student_id] || []
      let filteredRecords = records
      if (period_type === 'month' && period_month) {
        const window = getMonthWindow(period_month)
        filteredRecords = records.filter(r => {
          const d = new Date(r.care_date)
          return d >= window.start && d < window.end
        })
      }
      if (period_type === 'semester' && academic_year && semester) {
        filteredRecords = records.filter(r =>
          r.academic_year === academic_year && parseInt(r.semester) === parseInt(semester)
        )
      }

      const completedCount = filteredRecords.length
      const plannedCount = item.planned_count || 0
      const remainingCount = Math.max(0, plannedCount - completedCount)

      return {
        student_id: item.student_id,
        student_name: item.student_name,
        responsible_teacher_id: item.responsible_teacher_id,
        responsible_teacher_name: item.responsible_teacher_name,
        planned_count: plannedCount,
        completed_count: completedCount,
        remaining_count: remainingCount
      }
    })

    if (search) {
      const keyword = search.toLowerCase()
      students = students.filter(s =>
        s.student_name.toLowerCase().includes(keyword) ||
        (s.responsible_teacher_name || '').toLowerCase().includes(keyword)
      )
    }

    res.json({ students, total: students.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── GA: 一键提醒 ───
app.post('/api/reminders/batch', async (req, res) => {
  try {
    const { period_type, period_month, academic_year, semester } = req.body
    const orgId = req.orgId

    // Get completion stats
    const planWhere = { period_type }
    if (period_type === 'month' && period_month) planWhere.period_month = period_month
    if (period_type === 'semester' && academic_year) planWhere.academic_year = academic_year

    const plans = await queryAll(orgId, 'care_plans', planWhere)
    const planIds = plans.map(p => p.id)

    if (planIds.length === 0) {
      return res.json({ success: true, count: 0 })
    }

    const allItems = []
    for (const pid of planIds) {
      const items = await queryAll(orgId, 'care_plan_items', { plan_id: pid, is_checked: true })
      allItems.push(...items)
    }

    const allRecords = await queryAll(orgId, 'care_records')
    const recordsByStudent = {}
    for (const r of allRecords) {
      if (!recordsByStudent[r.student_id]) recordsByStudent[r.student_id] = []
      recordsByStudent[r.student_id].push(r)
    }

    // Find incomplete teachers
    const incompleteTeachers = {}
    for (const item of allItems) {
      const records = recordsByStudent[item.student_id] || []
      let filteredRecords = records
      if (period_type === 'month' && period_month) {
        const window = getMonthWindow(period_month)
        filteredRecords = records.filter(r => {
          const d = new Date(r.care_date)
          return d >= window.start && d < window.end
        })
      }
      const remaining = Math.max(0, (item.planned_count || 0) - filteredRecords.length)
      if (remaining > 0 && item.responsible_teacher_id) {
        const tid = item.responsible_teacher_id
        if (!incompleteTeachers[tid]) {
          incompleteTeachers[tid] = {
            teacher_id: tid,
            teacher_name: item.responsible_teacher_name,
            students: []
          }
        }
        incompleteTeachers[tid].students.push({
          student_name: item.student_name,
          remaining
        })
      }
    }

    // Create reminders
    let count = 0
    for (const [tid, info] of Object.entries(incompleteTeachers)) {
      const studentDetails = info.students.map(s => `${s.student_name}(剩余${s.remaining}次)`).join('、')
      const content = `请尽快完成本周期关爱！以下学生尚未完成：${studentDetails}`

      await app.mcp.call('data.insert', {
        orgId, tableName: 'care_reminders',
        data: {
          receiver_id: info.teacher_id,
          receiver_name: info.teacher_name,
          content,
          is_read: false,
          created_at: new Date().toISOString()
        }
      })
      count++
    }

    res.json({ success: true, count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Reminders ───
app.get('/api/reminders', async (req, res) => {
  try {
    const user = getUserContext(req)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'care_reminders',
      where: { receiver_id: user.userId },
      orderBy: 'created_at DESC',
      limit: 50
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/reminders/:id/read', async (req, res) => {
  try {
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'care_reminders',
      where: { id: parseInt(req.params.id) }, data: { is_read: true }
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Academic year/semester engine API ───
app.get('/api/academic-info', (req, res) => {
  res.json(getCurrentAcademicYearSemester())
})

app.start()
