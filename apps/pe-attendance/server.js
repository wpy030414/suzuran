import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'pe-attendance', port: 8083 })

const frontendDist = join(__dirname, 'frontend', 'dist')

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

const TABLES = {
  classrooms: [
    { name: 'name', type: 'text' },
    { name: 'grade', type: 'integer', nullable: true },
    { name: 'homeroom_teacher_id', type: 'integer' },   // 班主任
    { name: 'homeroom_teacher_name', type: 'text', nullable: true },
    { name: 'pe_teacher_id', type: 'integer' },          // 缺省体育老师
    { name: 'pe_teacher_name', type: 'text', nullable: true },
    { name: 'student_ids', type: 'jsonb' },              // list of student IDs
  ],
  students: [
    { name: 'name', type: 'text' },
    { name: 'classroom_id', type: 'integer' },
    { name: 'student_number', type: 'text', nullable: true },
  ],
  pe_classes: [
    { name: 'classroom_id', type: 'integer' },
    { name: 'classroom_name', type: 'text', nullable: true },
    { name: 'pe_teacher_id', type: 'integer' },
    { name: 'pe_teacher_name', type: 'text', nullable: true },
    { name: 'date', type: 'date' },
    { name: 'slot_index', type: 'integer' },
    { name: 'total_students', type: 'integer' },
    { name: 'status', type: 'text' },        // 'pending' | 'homeroom_done' | 'pe_done' | 'completed'
    { name: 'created_at', type: 'timestamp', nullable: true },
  ],
  attendance_records: [
    { name: 'pe_class_id', type: 'integer' },
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text', nullable: true },
    { name: 'status', type: 'text' },        // 'present' | 'absent'
    { name: 'recorded_by', type: 'text' },   // 'pe_teacher' | 'homeroom_teacher'
    { name: 'recorded_by_id', type: 'integer', nullable: true },
    { name: 'recorded_at', type: 'timestamp', nullable: true },
  ],
  leave_reports: [
    { name: 'pe_class_id', type: 'integer' },
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text', nullable: true },
    { name: 'reported_by_id', type: 'integer' },   // 班主任 user_id
    { name: 'reported_by_name', type: 'text', nullable: true },
    { name: 'reason', type: 'text', nullable: true },
    { name: 'leave_type', type: 'text', nullable: true },  // 'sick' | 'personal' | 'other'
    { name: 'leave_doc_url', type: 'text', nullable: true },
    { name: 'reported_at', type: 'timestamp', nullable: true },
  ],
  reconciliations: [
    { name: 'pe_class_id', type: 'integer' },
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text', nullable: true },
    { name: 'has_leave', type: 'boolean' },       // 班主任是否报了请假
    { name: 'is_present', type: 'boolean' },      // 体育老师是否记到勤
    { name: 'result', type: 'text' },             // 'normal' | 'anomaly'
    { name: 'result_description', type: 'text', nullable: true },
    { name: 'resolved_at', type: 'timestamp', nullable: true },
  ],
  anomalies: [
    { name: 'pe_class_id', type: 'integer' },
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text', nullable: true },
    { name: 'classroom_name', type: 'text', nullable: true },
    { name: 'date', type: 'date', nullable: true },
    { name: 'type', type: 'text' },              // 'absent_without_leave' | 'leave_but_present'
    { name: 'description', type: 'text', nullable: true },
    { name: 'resolved', type: 'boolean' },
    { name: 'resolved_by', type: 'text', nullable: true },
    { name: 'resolved_at', type: 'timestamp', nullable: true },
    { name: 'resolution_notes', type: 'text', nullable: true },
  ],
}

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

// --- Permission middleware ---
function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.userRole || 'teacher'
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: '权限不足，需要角色: ' + roles.join('/') })
    }
    next()
  }
}

// --- Validation helpers ---
function validateRequired(body, fields) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '')
  if (missing.length > 0) return `缺少必填字段: ${missing.join(', ')}`
  return null
}

// --- Generic CRUD ---
async function listRecords(req, res, tableName) {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (k !== 'limit' && k !== 'offset' && k !== 'orderBy') where[k] = v
    }
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName, where,
      orderBy: req.query.orderBy || '',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0'),
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

async function getRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName, where: { id: parseInt(req.params.id) }, limit: 1,
    })
    if (result.rows && result.rows.length > 0) res.json(result.rows[0])
    else res.status(404).json({ error: 'Not found' })
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
      orgId: req.orgId, tableName, where: { id: parseInt(req.params.id) }, data: req.body,
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

async function deleteRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName, where: { id: parseInt(req.params.id) },
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// --- Classrooms (with homeroom teacher + PE teacher config) ---
app.get('/api/classrooms', (req, res) => listRecords(req, res, 'classrooms'))
app.get('/api/classrooms/:id', (req, res) => getRecord(req, res, 'classrooms'))
app.post('/api/classrooms', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['name', 'homeroom_teacher_id', 'pe_teacher_id'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'classrooms')
})
app.put('/api/classrooms/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'classrooms'))
app.delete('/api/classrooms/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'classrooms'))

// Find classroom by homeroom teacher (for auto-fill)
app.get('/api/classrooms/by-homeroom/:teacherId', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'classrooms',
      where: { homeroom_teacher_id: parseInt(req.params.teacherId) },
      limit: 10,
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Find classrooms by PE teacher (for auto-fill)
app.get('/api/classrooms/by-pe-teacher/:teacherId', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'classrooms',
      where: { pe_teacher_id: parseInt(req.params.teacherId) },
      limit: 50,
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Students ---
app.get('/api/students', (req, res) => listRecords(req, res, 'students'))
app.get('/api/students/by-classroom/:classroomId', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'students',
      where: { classroom_id: parseInt(req.params.classroomId) },
      orderBy: 'student_number, name',
      limit: 200,
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.post('/api/students', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['name', 'classroom_id'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'students')
})
app.put('/api/students/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'students'))
app.delete('/api/students/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'students'))

// --- PE Classes ---
app.get('/api/classes', async (req, res) => {
  try {
    const where = {}
    if (req.query.classroom_id) where.classroom_id = parseInt(req.query.classroom_id)
    if (req.query.date) where.date = req.query.date
    if (req.query.pe_teacher_id) where.pe_teacher_id = parseInt(req.query.pe_teacher_id)
    if (req.query.status) where.status = req.query.status
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'pe_classes', where,
      orderBy: req.query.orderBy || 'date DESC, slot_index',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0'),
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.get('/api/classes/:id', (req, res) => getRecord(req, res, 'pe_classes'))

// Create PE class session (auto-populate students)
app.post('/api/classes', async (req, res) => {
  try {
    const { classroom_id, pe_teacher_id, date, slot_index } = req.body
    const err = validateRequired(req.body, ['classroom_id', 'pe_teacher_id', 'date', 'slot_index'])
    if (err) return res.status(400).json({ error: err })

    // Get classroom info
    const classroom = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'classrooms',
      where: { id: parseInt(classroom_id) }, limit: 1,
    })
    if (!classroom.rows || classroom.rows.length === 0) {
      return res.status(404).json({ error: '班级不存在' })
    }

    // Get students
    const students = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'students',
      where: { classroom_id: parseInt(classroom_id) }, limit: 200,
    })
    const studentList = students.rows || []

    // Create PE class session
    const peClassResult = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'pe_classes',
      data: {
        classroom_id: parseInt(classroom_id),
        classroom_name: classroom.rows[0].name,
        pe_teacher_id: parseInt(pe_teacher_id),
        pe_teacher_name: classroom.rows[0].pe_teacher_name || '',
        date,
        slot_index: parseInt(slot_index),
        total_students: studentList.length,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    })

    // Auto-create attendance records for all students (default absent)
    for (const student of studentList) {
      await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'attendance_records',
        data: {
          pe_class_id: peClassResult.id,
          student_id: student.id,
          student_name: student.name,
          status: 'absent',
          recorded_by: 'pending',
          recorded_at: new Date().toISOString(),
        },
      })
    }

    res.json({
      id: peClassResult.id,
      classroom_id: parseInt(classroom_id),
      classroom_name: classroom.rows[0].name,
      total_students: studentList.length,
      students: studentList.map(s => ({ id: s.id, name: s.name })),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/classes/:id', (req, res) => updateRecord(req, res, 'pe_classes'))
app.delete('/api/classes/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'pe_classes'))

// --- Attendance Records ---
app.get('/api/attendance', async (req, res) => {
  try {
    const where = {}
    if (req.query.pe_class_id) where.pe_class_id = parseInt(req.query.pe_class_id)
    if (req.query.student_id) where.student_id = parseInt(req.query.student_id)
    if (req.query.status) where.status = req.query.status
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'attendance_records', where,
      orderBy: 'student_name',
      limit: parseInt(req.query.limit || '200'),
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PE teacher records attendance (batch update)
app.post('/api/attendance/batch', async (req, res) => {
  try {
    const { pe_class_id, records, teacher_id, teacher_name } = req.body
    if (!pe_class_id || !Array.isArray(records)) {
      return res.status(400).json({ error: '缺少 pe_class_id 或 records' })
    }

    for (const record of records) {
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'attendance_records',
        where: { pe_class_id: parseInt(pe_class_id), student_id: record.student_id },
        data: {
          status: record.status, // 'present' | 'absent'
          recorded_by: 'pe_teacher',
          recorded_by_id: teacher_id,
          recorded_at: new Date().toISOString(),
        },
      })
    }

    // Update PE class status
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'pe_classes',
      where: { id: parseInt(pe_class_id) },
      data: { status: 'pe_done' },
    })

    res.json({ success: true, updated: records.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Leave Reports ---
app.get('/api/leaves', async (req, res) => {
  try {
    const where = {}
    if (req.query.pe_class_id) where.pe_class_id = parseInt(req.query.pe_class_id)
    if (req.query.student_id) where.student_id = parseInt(req.query.student_id)
    if (req.query.reported_by_id) where.reported_by_id = parseInt(req.query.reported_by_id)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_reports', where,
      orderBy: 'reported_at DESC',
      limit: parseInt(req.query.limit || '200'),
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Homeroom teacher reports leave (batch)
app.post('/api/leaves/batch', async (req, res) => {
  try {
    const { pe_class_id, leaves, teacher_id, teacher_name } = req.body
    if (!pe_class_id || !Array.isArray(leaves)) {
      return res.status(400).json({ error: '缺少 pe_class_id 或 leaves' })
    }

    for (const leave of leaves) {
      // Check if leave report already exists
      const existing = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'leave_reports',
        where: { pe_class_id: parseInt(pe_class_id), student_id: leave.student_id },
        limit: 1,
      })
      if (existing.rows && existing.rows.length > 0) {
        // Update existing
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'leave_reports',
          where: { id: existing.rows[0].id },
          data: {
            reason: leave.reason || '',
            leave_type: leave.leave_type || 'personal',
            reported_at: new Date().toISOString(),
          },
        })
      } else {
        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'leave_reports',
          data: {
            pe_class_id: parseInt(pe_class_id),
            student_id: leave.student_id,
            student_name: leave.student_name || '',
            reported_by_id: teacher_id,
            reported_by_name: teacher_name || '',
            reason: leave.reason || '',
            leave_type: leave.leave_type || 'personal',
            reported_at: new Date().toISOString(),
          },
        })
      }
    }

    // Update PE class status
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'pe_classes',
      where: { id: parseInt(pe_class_id) },
      data: { status: 'homeroom_done' },
    })

    res.json({ success: true, reported: leaves.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Reconciliation (竞合结果计算) ---
// Core business logic: compare attendance with leave reports
// Rule: 请假=否 且 到勤=否 → 异常; 其余 → 正常
app.post('/api/reconcile/:peClassId', async (req, res) => {
  try {
    const peClassId = parseInt(req.params.peClassId)

    // Get PE class info
    const peClass = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'pe_classes', where: { id: peClassId }, limit: 1,
    })
    if (!peClass.rows || peClass.rows.length === 0) {
      return res.status(404).json({ error: '体育课不存在' })
    }

    // Get all attendance records
    const attendance = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'attendance_records',
      where: { pe_class_id: peClassId }, limit: 500,
    })

    // Get all leave reports
    const leaves = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_reports',
      where: { pe_class_id: peClassId }, limit: 500,
    })

    // Build leave map
    const leaveMap = new Map()
    for (const leave of (leaves.rows || [])) {
      leaveMap.set(leave.student_id, leave)
    }

    // Clear existing reconciliations for this class
    await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'reconciliations',
      where: { pe_class_id: peClassId },
    })

    let normalCount = 0
    let anomalyCount = 0
    const anomalies = []

    for (const record of (attendance.rows || [])) {
      const hasLeave = leaveMap.has(record.student_id)
      const isPresent = record.status === 'present'

      // Core reconciliation rule (竞合结果):
      // 请假=否 且 到勤=否 → 异常 (静默缺勤)
      // 其余所有组合 → 正常
      const isAnomaly = !hasLeave && !isPresent
      const result = isAnomaly ? 'anomaly' : 'normal'

      let description = ''
      if (hasLeave && isPresent) description = '请假且到勤（人在即安全，班主任可核对假条）'
      else if (hasLeave && !isPresent) description = '请假且未到（符合预期）'
      else if (!hasLeave && isPresent) description = '未请假但到勤（人在即安全）'
      else description = '未请假且未到勤（静默缺勤）'

      await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'reconciliations',
        data: {
          pe_class_id: peClassId,
          student_id: record.student_id,
          student_name: record.student_name || '',
          has_leave: hasLeave,
          is_present: isPresent,
          result,
          result_description: description,
          resolved_at: new Date().toISOString(),
        },
      })

      if (isAnomaly) {
        anomalyCount++
        anomalies.push({ student_id: record.student_id, student_name: record.student_name })

        // Create anomaly record
        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'anomalies',
          data: {
            pe_class_id: peClassId,
            student_id: record.student_id,
            student_name: record.student_name || '',
            classroom_name: peClass.rows[0].classroom_name || '',
            date: peClass.rows[0].date,
            type: 'absent_without_leave',
            description: `学生${record.student_name || record.student_id}缺勤但未提交请假条`,
            resolved: false,
          },
        })
      } else {
        normalCount++
      }
    }

    // Update PE class status to completed
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'pe_classes',
      where: { id: peClassId },
      data: { status: 'completed' },
    })

    res.json({
      success: true,
      total: (attendance.rows || []).length,
      normal: normalCount,
      anomaly: anomalyCount,
      anomalies,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Reconciliations ---
app.get('/api/reconciliations', async (req, res) => {
  try {
    const where = {}
    if (req.query.pe_class_id) where.pe_class_id = parseInt(req.query.pe_class_id)
    if (req.query.result) where.result = req.query.result
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'reconciliations', where,
      orderBy: 'student_name',
      limit: parseInt(req.query.limit || '200'),
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Anomalies ---
app.get('/api/anomalies', async (req, res) => {
  try {
    const where = {}
    if (req.query.pe_class_id) where.pe_class_id = parseInt(req.query.pe_class_id)
    if (req.query.resolved !== undefined) where.resolved = req.query.resolved === 'true'
    if (req.query.date) where.date = req.query.date
    if (req.query.classroom_name) where.classroom_name = req.query.classroom_name
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'anomalies', where,
      orderBy: req.query.orderBy || 'date DESC',
      limit: parseInt(req.query.limit || '200'),
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Resolve anomaly
app.put('/api/anomalies/:id/resolve', async (req, res) => {
  try {
    const { resolved_by, resolution_notes } = req.body
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'anomalies',
      where: { id: parseInt(req.params.id) },
      data: {
        resolved: true,
        resolved_by: resolved_by || '',
        resolved_at: new Date().toISOString(),
        resolution_notes: resolution_notes || '',
      },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Statistics & Reports ---

// Anomaly detection summary
app.get('/api/stats/anomaly-summary', async (req, res) => {
  try {
    const { date_from, date_to } = req.query
    const where = {}
    if (date_from) where.date_gte = date_from
    if (date_to) where.date_lte = date_to

    const anomalies = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'anomalies', where, limit: 10000,
    })
    const rows = anomalies.rows || []

    const total = rows.length
    const resolved = rows.filter(a => a.resolved).length
    const unresolved = total - resolved

    // Group by classroom
    const byClassroom = {}
    for (const a of rows) {
      const key = a.classroom_name || 'unknown'
      if (!byClassroom[key]) byClassroom[key] = { classroom: key, total: 0, resolved: 0 }
      byClassroom[key].total++
      if (a.resolved) byClassroom[key].resolved++
    }

    // Group by date
    const byDate = {}
    for (const a of rows) {
      const key = a.date || 'unknown'
      if (!byDate[key]) byDate[key] = { date: key, total: 0 }
      byDate[key].total++
    }

    res.json({
      total, resolved, unresolved,
      by_classroom: Object.values(byClassroom).sort((a, b) => b.total - a.total),
      by_date: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Attendance rate by class
app.get('/api/stats/attendance-rate', async (req, res) => {
  try {
    const { date_from, date_to } = req.query
    const peClasses = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'pe_classes',
      where: { status: 'completed' }, limit: 1000,
    })

    let filtered = peClasses.rows || []
    if (date_from) filtered = filtered.filter(c => c.date >= date_from)
    if (date_to) filtered = filtered.filter(c => c.date <= date_to)

    const stats = []
    for (const peClass of filtered) {
      const attendance = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'attendance_records',
        where: { pe_class_id: peClass.id }, limit: 200,
      })
      const rows = attendance.rows || []
      const present = rows.filter(r => r.status === 'present').length
      const total = rows.length

      stats.push({
        pe_class_id: peClass.id,
        classroom_name: peClass.classroom_name,
        date: peClass.date,
        slot_index: peClass.slot_index,
        total_students: total,
        present,
        absent: total - present,
        attendance_rate: total > 0 ? (present / total * 100).toFixed(1) : 0,
      })
    }

    res.json({ rows: stats.sort((a, b) => a.date.localeCompare(b.date)) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Export anomaly data
app.get('/api/export/anomalies', async (req, res) => {
  try {
    const { date_from, date_to } = req.query
    const where = {}
    if (date_from) where.date_gte = date_from
    if (date_to) where.date_lte = date_to

    const anomalies = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'anomalies', where,
      orderBy: 'date, classroom_name, student_name',
      limit: 10000,
    })

    const csvRows = [['日期', '班级', '学生姓名', '异常类型', '描述', '是否已处理', '处理人', '处理备注']]
    for (const a of (anomalies.rows || [])) {
      csvRows.push([
        a.date, a.classroom_name, a.student_name, a.type, a.description,
        a.resolved ? '是' : '否', a.resolved_by || '', a.resolution_notes || '',
      ])
    }

    res.json({ format: 'csv', data: csvRows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
