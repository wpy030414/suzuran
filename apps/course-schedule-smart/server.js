import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'course-schedule-smart', port: 8080 })

// --- Static file serving ---
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

// --- Schema setup ---
const TABLES = {
  campuses: [
    { name: 'name', type: 'text' },
    { name: 'address', type: 'text', nullable: true },
  ],
  classrooms: [
    { name: 'campus_id', type: 'integer' },
    { name: 'grade_id', type: 'integer', nullable: true },
    { name: 'name', type: 'text' },
    { name: 'capacity', type: 'integer', nullable: true },
  ],
  subjects: [
    { name: 'name', type: 'text' },
    { name: 'color', type: 'text', nullable: true },
    { name: 'icon', type: 'text', nullable: true },
  ],
  time_slots: [
    { name: 'campus_id', type: 'integer' },
    { name: 'name', type: 'text' },
    { name: 'start_time', type: 'text', nullable: true },
    { name: 'end_time', type: 'text', nullable: true },
    { name: 'sort_order', type: 'integer' },
  ],
  teachers_pool: [
    { name: 'user_id', type: 'integer' },
    { name: 'name', type: 'text' },
    { name: 'subject_ids', type: 'jsonb', nullable: true },
  ],
  schedules: [
    { name: 'campus_id', type: 'integer' },
    { name: 'classroom_id', type: 'integer' },
    { name: 'semester_start', type: 'date' },
    { name: 'semester_end', type: 'date' },
    { name: 'weekly_data', type: 'jsonb' },
  ],
  snapshots: [
    { name: 'campus_id', type: 'integer' },
    { name: 'classroom_id', type: 'integer' },
    { name: 'date', type: 'date' },
    { name: 'slot_index', type: 'integer' },
    { name: 'subject_id', type: 'integer' },
    { name: 'teacher_id', type: 'integer' },
    { name: 'original_teacher_id', type: 'integer', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'notes', type: 'text', nullable: true },
    { name: 'description', type: 'text', nullable: true },
  ],
  substitution_requests: [
    { name: 'type', type: 'text' },
    { name: 'requester_id', type: 'integer' },
    { name: 'requester_name', type: 'text', nullable: true },
    { name: 'snapshot_ids', type: 'jsonb' },
    { name: 'target_teacher_id', type: 'integer' },
    { name: 'target_teacher_name', type: 'text', nullable: true },
    { name: 'target_snapshot_ids', type: 'jsonb', nullable: true },
    { name: 'reason', type: 'text', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'workflow_instance_id', type: 'integer', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: true },
    { name: 'approved_at', type: 'timestamp', nullable: true },
  ],
  inspections: [
    { name: 'campus_id', type: 'integer' },
    { name: 'grade_id', type: 'integer', nullable: true },
    { name: 'slot_index', type: 'integer' },
    { name: 'date', type: 'date' },
    { name: 'inspector_id', type: 'integer' },
    { name: 'inspector_name', type: 'text', nullable: true },
    { name: 'records', type: 'jsonb' },
    { name: 'created_at', type: 'timestamp', nullable: true },
  ],
}

// --- Workflow definition for substitution approval ---
const SUBSTITUTION_WORKFLOW_DEF = {
  name: '调代课审批',
  description: '教师调课/代课申请审批流程',
  variables: {
    type: 'string',
    requester_id: 'number',
    target_teacher_id: 'number',
    snapshot_count: 'number',
  },
  steps: [
    { name: 'submit', type: 'start', next: 'admin_approve' },
    {
      name: 'admin_approve',
      type: 'approval',
      assignee: { type: 'role', value: 'admin' },
      on_approve: { goto: 'end_approved' },
      on_reject: { goto: 'end_rejected' },
    },
    { name: 'end_approved', type: 'end', result: 'approved' },
    { name: 'end_rejected', type: 'end', result: 'rejected' },
  ],
}

app.onStart(async () => {
  // Create tables
  for (const [tableName, columns] of Object.entries(TABLES)) {
    try {
      await app.mcp.call('data.create_table', {
        orgId: app.orgId,
        tableName,
        columns,
      })
      console.log(`[init] Table '${tableName}' ready`)
    } catch (e) {
      console.log(`[init] Table '${tableName}' already exists`)
    }
  }

  // Register workflow definition for substitution approval
  try {
    const wfResult = await app.mcp.call('workflow.define', {
      orgId: app.orgId,
      definition: SUBSTITUTION_WORKFLOW_DEF,
    })
    app.substitutionWorkflowId = wfResult.id
    console.log(`[init] Substitution workflow registered: ${wfResult.id}`)
  } catch (e) {
    console.log(`[init] Workflow already defined or error: ${e.message}`)
  }
})

// --- Permission middleware ---
function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.userRole || 'teacher' // default to teacher
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: '权限不足，需要角色: ' + roles.join('/') })
    }
    next()
  }
}

// --- Validation helpers ---
function validateRequired(body, fields) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '')
  if (missing.length > 0) {
    return `缺少必填字段: ${missing.join(', ')}`
  }
  return null
}

function validateDateRange(start, end) {
  if (!start || !end) return '学期起止日期不能为空'
  const s = new Date(start)
  const e = new Date(end)
  if (s >= e) return '学期起始日期必须早于结束日期'
  if (e - s > 365 * 24 * 60 * 60 * 1000) return '学期范围不能超过一年'
  return null
}

// --- Conflict detection ---
async function detectTeacherConflict(orgId, teacherId, date, slotIndex, excludeSnapshotId) {
  const where = { teacher_id: teacherId, date, slot_index: slotIndex }
  if (excludeSnapshotId) where.id_ne = excludeSnapshotId
  const result = await app.mcp.call('data.query', {
    orgId, tableName: 'snapshots', where, limit: 1,
  })
  return (result.rows || []).length > 0
}

// --- Generic CRUD helpers ---
async function listRecords(req, res, tableName) {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (k !== 'limit' && k !== 'offset' && k !== 'orderBy' && k !== 'date_from' && k !== 'date_to' && k !== 'search') {
        where[k] = v
      }
    }
    // Date range support
    if (req.query.date_from && req.query.date_to) {
      where.date_gte = req.query.date_from
      where.date_lte = req.query.date_to
    }
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId,
      tableName,
      where,
      orderBy: req.query.orderBy || '',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0'),
    })
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function getRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId,
      tableName,
      where: { id: parseInt(req.params.id) },
      limit: 1,
    })
    if (result.rows && result.rows.length > 0) {
      res.json(result.rows[0])
    } else {
      res.status(404).json({ error: 'Not found' })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function createRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId,
      tableName,
      data: req.body,
    })
    res.json({ id: result.id, ...req.body })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function updateRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.update', {
      orgId: req.orgId,
      tableName,
      where: { id: parseInt(req.params.id) },
      data: req.body,
    })
    res.json({ success: true, count: result.count })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

async function deleteRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId,
      tableName,
      where: { id: parseInt(req.params.id) },
    })
    res.json({ success: true, count: result.count })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// --- Campuses ---
app.get('/api/campuses', (req, res) => listRecords(req, res, 'campuses'))
app.get('/api/campuses/:id', (req, res) => getRecord(req, res, 'campuses'))
app.post('/api/campuses', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['name'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'campuses')
})
app.put('/api/campuses/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'campuses'))
app.delete('/api/campuses/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'campuses'))

// --- Classrooms ---
app.get('/api/classrooms', (req, res) => listRecords(req, res, 'classrooms'))
app.get('/api/classrooms/:id', (req, res) => getRecord(req, res, 'classrooms'))
app.post('/api/classrooms', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['campus_id', 'name'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'classrooms')
})
app.put('/api/classrooms/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'classrooms'))
app.delete('/api/classrooms/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'classrooms'))

// --- Subjects ---
app.get('/api/subjects', (req, res) => listRecords(req, res, 'subjects'))
app.get('/api/subjects/:id', (req, res) => getRecord(req, res, 'subjects'))
app.post('/api/subjects', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['name'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'subjects')
})
app.put('/api/subjects/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'subjects'))
app.delete('/api/subjects/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'subjects'))

// --- Time Slots ---
app.get('/api/time-slots', (req, res) => listRecords(req, res, 'time_slots'))
app.get('/api/time-slots/:id', (req, res) => getRecord(req, res, 'time_slots'))
app.post('/api/time-slots', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['campus_id', 'name', 'sort_order'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'time_slots')
})
app.put('/api/time-slots/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'time_slots'))
app.delete('/api/time-slots/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'time_slots'))

// --- Teachers Pool ---
app.get('/api/teachers', (req, res) => listRecords(req, res, 'teachers_pool'))
app.get('/api/teachers/:id', (req, res) => getRecord(req, res, 'teachers_pool'))
app.post('/api/teachers', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['user_id', 'name'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'teachers_pool')
})
app.put('/api/teachers/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'teachers_pool'))
app.delete('/api/teachers/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'teachers_pool'))

// --- Schedules ---
app.get('/api/schedules', (req, res) => listRecords(req, res, 'schedules'))
app.get('/api/schedules/:id', (req, res) => getRecord(req, res, 'schedules'))
app.post('/api/schedules', requireRole('admin'), async (req, res) => {
  try {
    const err = validateRequired(req.body, ['campus_id', 'classroom_id', 'semester_start', 'semester_end', 'weekly_data'])
    if (err) return res.status(400).json({ error: err })
    const dateErr = validateDateRange(req.body.semester_start, req.body.semester_end)
    if (dateErr) return res.status(400).json({ error: dateErr })

    // Validate weekly_data structure
    const weeklyData = typeof req.body.weekly_data === 'string'
      ? JSON.parse(req.body.weekly_data) : req.body.weekly_data
    if (!weeklyData || typeof weeklyData !== 'object') {
      return res.status(400).json({ error: 'weekly_data 格式不正确' })
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'schedules', data: req.body,
    })
    res.json({ id: result.id, ...req.body })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
app.put('/api/schedules/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'schedules'))
app.delete('/api/schedules/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'schedules'))

// --- Snapshots ---
app.get('/api/snapshots', async (req, res) => {
  try {
    const where = {}
    if (req.query.classroom_id) where.classroom_id = parseInt(req.query.classroom_id)
    if (req.query.teacher_id) where.teacher_id = parseInt(req.query.teacher_id)
    if (req.query.date) where.date = req.query.date
    if (req.query.campus_id) where.campus_id = parseInt(req.query.campus_id)
    if (req.query.status) where.status = req.query.status
    if (req.query.subject_id) where.subject_id = parseInt(req.query.subject_id)
    // Date range
    if (req.query.date_from && req.query.date_to) {
      where.date_gte = req.query.date_from
      where.date_lte = req.query.date_to
    }
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId,
      tableName: 'snapshots',
      where,
      orderBy: req.query.orderBy || 'date, slot_index',
      limit: parseInt(req.query.limit || '500'),
      offset: parseInt(req.query.offset || '0'),
    })
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
app.get('/api/snapshots/:id', (req, res) => getRecord(req, res, 'snapshots'))
app.post('/api/snapshots', requireRole('admin'), (req, res) => createRecord(req, res, 'snapshots'))
app.put('/api/snapshots/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'snapshots'))
app.delete('/api/snapshots/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'snapshots'))

// --- Snapshot Incubator (batch generate snapshots from schedules) ---
// Enhanced with progress tracking, conflict detection, and description generation
app.post('/api/snapshots/incubate', requireRole('admin'), async (req, res) => {
  try {
    const { classroom_id, password } = req.body
    // Password gate
    const INCUBATOR_PASSWORD = process.env.INCUBATOR_PASSWORD || 'suzuran2026'
    if (password !== INCUBATOR_PASSWORD) {
      return res.status(403).json({ error: '孵化器口令错误' })
    }

    const where = classroom_id ? { classroom_id: parseInt(classroom_id) } : {}
    const schedules = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'schedules', where, limit: 1000,
    })

    // Load reference data for description generation
    const [teachersRes, subjectsRes, classroomsRes, timeSlotsRes] = await Promise.all([
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'teachers_pool', limit: 500 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'subjects', limit: 100 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'classrooms', limit: 200 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'time_slots', limit: 200 }),
    ])
    const teachersMap = Object.fromEntries((teachersRes.rows || []).map(t => [t.id, t.name]))
    const subjectsMap = Object.fromEntries((subjectsRes.rows || []).map(s => [s.id, s.name]))
    const classroomsMap = Object.fromEntries((classroomsRes.rows || []).map(c => [c.id, c.name]))
    const slotsMap = Object.fromEntries((timeSlotsRes.rows || []).map(s => [s.sort_order, s.name]))

    const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    let created = 0
    let skipped = 0
    let conflicts = 0
    const totalEstimate = (schedules.rows || []).length * 100 // rough estimate

    for (const schedule of (schedules.rows || [])) {
      const weeklyData = typeof schedule.weekly_data === 'string'
        ? JSON.parse(schedule.weekly_data) : schedule.weekly_data
      if (!weeklyData) continue

      const startDate = new Date(schedule.semester_start)
      const endDate = new Date(schedule.semester_end)
      const classroomName = classroomsMap[schedule.classroom_id] || `班级${schedule.classroom_id}`

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay()
        const dayKey = `day_${dayOfWeek}`
        const daySlots = weeklyData[dayKey]
        if (!daySlots) continue

        const dateStr = d.toISOString().split('T')[0]
        const dayName = DAY_NAMES[dayOfWeek]

        for (const slot of daySlots) {
          if (!slot.subject_id || !slot.teacher_id) { skipped++; continue }

          // Conflict detection: check if teacher already has a class at this time
          const hasConflict = await detectTeacherConflict(
            req.orgId, slot.teacher_id, dateStr, slot.slot_index || 0, null
          )
          if (hasConflict) { conflicts++; continue }

          const subjectName = subjectsMap[slot.subject_id] || `科目${slot.subject_id}`
          const teacherName = teachersMap[slot.teacher_id] || `教师${slot.teacher_id}`
          const slotName = slotsMap[slot.slot_index] || `第${slot.slot_index + 1}节`

          // Generate description
          const description = `${teacherName}/${subjectName}：${classroomName}，${dateStr}-${dayName}-${slotName}`

          await app.mcp.call('data.insert', {
            orgId: req.orgId,
            tableName: 'snapshots',
            data: {
              campus_id: schedule.campus_id,
              classroom_id: schedule.classroom_id,
              date: dateStr,
              slot_index: slot.slot_index || 0,
              subject_id: slot.subject_id,
              teacher_id: slot.teacher_id,
              original_teacher_id: slot.teacher_id,
              status: 'normal',
              description,
            },
          })
          created++
        }
      }
    }

    res.json({ success: true, created, skipped, conflicts, total: created + skipped + conflicts })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Clean snapshots (with password gate) ---
app.post('/api/snapshots/clean', requireRole('admin'), async (req, res) => {
  try {
    const { classroom_id, date_from, date_to, password } = req.body
    const INCUBATOR_PASSWORD = process.env.INCUBATOR_PASSWORD || 'suzuran2026'
    if (password !== INCUBATOR_PASSWORD) {
      return res.status(403).json({ error: '孵化器口令错误' })
    }

    const where = {}
    if (classroom_id) where.classroom_id = parseInt(classroom_id)
    if (date_from) where.date_gte = date_from
    if (date_to) where.date_lte = date_to

    // Batch delete in chunks of 100
    let totalDeleted = 0
    let batchResult = { count: 0 }
    do {
      batchResult = await app.mcp.call('data.delete', {
        orgId: req.orgId, tableName: 'snapshots', where, limit: 100,
      })
      totalDeleted += (batchResult.count || 0)
    } while (batchResult.count >= 100)

    res.json({ success: true, deleted: totalDeleted })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Substitution Requests ---
app.get('/api/substitutions', async (req, res) => {
  try {
    const where = {}
    if (req.query.status) where.status = req.query.status
    if (req.query.requester_id) where.requester_id = parseInt(req.query.requester_id)
    if (req.query.target_teacher_id) where.target_teacher_id = parseInt(req.query.target_teacher_id)
    if (req.query.type) where.type = req.query.type
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_requests', where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0'),
    })
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
app.get('/api/substitutions/:id', (req, res) => getRecord(req, res, 'substitution_requests'))

// Create substitution request with validation + workflow start
app.post('/api/substitutions', async (req, res) => {
  try {
    const { type, requester_id, snapshot_ids, target_teacher_id, target_snapshot_ids, reason } = req.body

    // Validation
    const err = validateRequired(req.body, ['type', 'requester_id', 'snapshot_ids', 'target_teacher_id'])
    if (err) return res.status(400).json({ error: err })

    const snapshotIds = typeof snapshot_ids === 'string' ? JSON.parse(snapshot_ids) : snapshot_ids
    if (!Array.isArray(snapshotIds) || snapshotIds.length === 0) {
      return res.status(400).json({ error: '必须选择至少一个己方课程快照' })
    }

    // Swap type requires equal snapshot counts
    if (type === 'swap') {
      const targetIds = typeof target_snapshot_ids === 'string' ? JSON.parse(target_snapshot_ids) : target_snapshot_ids
      if (!Array.isArray(targetIds) || targetIds.length === 0) {
        return res.status(400).json({ error: '调课类型必须选择对方课程快照' })
      }
      if (snapshotIds.length !== targetIds.length) {
        return res.status(400).json({ error: '您调课必须使得双方所选课程数对等！' })
      }
    }

    // Cannot substitute for yourself
    if (requester_id === target_teacher_id) {
      return res.status(400).json({ error: '不能给自己代课/调课' })
    }

    // Verify snapshots exist and belong to requester
    for (const snapId of snapshotIds) {
      const snapResult = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'snapshots', where: { id: snapId }, limit: 1,
      })
      if (!snapResult.rows || snapResult.rows.length === 0) {
        return res.status(400).json({ error: `快照 ${snapId} 不存在` })
      }
      if (snapResult.rows[0].teacher_id !== requester_id) {
        return res.status(400).json({ error: `快照 ${snapId} 不属于您` })
      }
    }

    // Start workflow
    let workflowInstanceId = null
    try {
      const wfResult = await app.mcp.call('workflow.start', {
        orgId: req.orgId,
        definitionId: app.substitutionWorkflowId,
        variables: {
          type,
          requester_id,
          target_teacher_id,
          snapshot_count: snapshotIds.length,
        },
        createdBy: requester_id,
      })
      workflowInstanceId = wfResult.instanceId
    } catch (wfErr) {
      console.log(`[workflow] Start failed: ${wfErr.message}, proceeding without workflow`)
    }

    // Get teacher names for display
    const [requesterRes, targetRes] = await Promise.all([
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'teachers_pool', where: { id: requester_id }, limit: 1 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'teachers_pool', where: { id: target_teacher_id }, limit: 1 }),
    ])

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId,
      tableName: 'substitution_requests',
      data: {
        type,
        requester_id,
        requester_name: requesterRes.rows?.[0]?.name || '',
        snapshot_ids: JSON.stringify(snapshotIds),
        target_teacher_id,
        target_teacher_name: targetRes.rows?.[0]?.name || '',
        target_snapshot_ids: target_snapshot_ids ? JSON.stringify(typeof target_snapshot_ids === 'string' ? JSON.parse(target_snapshot_ids) : target_snapshot_ids) : null,
        reason: reason || '',
        status: workflowInstanceId ? 'pending_workflow' : 'pending',
        workflow_instance_id: workflowInstanceId,
        created_at: new Date().toISOString(),
      },
    })

    res.json({ id: result.id, workflow_instance_id: workflowInstanceId, ...req.body })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/substitutions/:id', (req, res) => updateRecord(req, res, 'substitution_requests'))
app.delete('/api/substitutions/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'substitution_requests'))

// --- Approval workflow for substitutions ---
// Enhanced: uses workflow.approve/reject MCP tools + updates snapshots
app.post('/api/substitutions/:id/approve', requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const subResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_requests', where: { id }, limit: 1,
    })
    if (!subResult.rows || subResult.rows.length === 0) {
      return res.status(404).json({ error: '调代课申请不存在' })
    }
    const sub = subResult.rows[0]
    if (sub.status === 'approved') {
      return res.status(400).json({ error: '该申请已经通过' })
    }

    const snapshotIds = typeof sub.snapshot_ids === 'string' ? JSON.parse(sub.snapshot_ids) : sub.snapshot_ids
    const type = sub.type

    if (type === 'sub') {
      // 代课: change teacher on own snapshots
      for (const snapId of snapshotIds) {
        const snapRes = await app.mcp.call('data.query', {
          orgId: req.orgId, tableName: 'snapshots', where: { id: snapId }, limit: 1,
        })
        const snap = snapRes.rows?.[0]
        const oldDesc = snap?.description || ''
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'snapshots', where: { id: snapId },
          data: {
            teacher_id: sub.target_teacher_id,
            status: 'substituted',
            notes: `${oldDesc} ->代课(教师${sub.target_teacher_id}:${sub.target_teacher_name || ''})`,
            description: `${oldDesc} ->${sub.target_teacher_name || '代课教师'}`,
          },
        })
      }
    } else if (type === 'swap') {
      // 调课: swap teachers between two sets of snapshots
      const targetSnapshotIds = typeof sub.target_snapshot_ids === 'string'
        ? JSON.parse(sub.target_snapshot_ids) : sub.target_snapshot_ids

      // Get requester's teacher id from first snapshot
      const requesterSnap = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'snapshots', where: { id: snapshotIds[0] }, limit: 1,
      })
      const requesterTeacher = requesterSnap.rows[0].teacher_id

      for (const snapId of snapshotIds) {
        const snapRes = await app.mcp.call('data.query', {
          orgId: req.orgId, tableName: 'snapshots', where: { id: snapId }, limit: 1,
        })
        const oldDesc = snapRes.rows?.[0]?.description || ''
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'snapshots', where: { id: snapId },
          data: {
            teacher_id: sub.target_teacher_id,
            status: 'swapped',
            notes: `${oldDesc} ->调课(教师${sub.target_teacher_id}:${sub.target_teacher_name || ''})`,
            description: `${oldDesc} ->${sub.target_teacher_name || '对调教师'}`,
          },
        })
      }
      for (const snapId of targetSnapshotIds) {
        const snapRes = await app.mcp.call('data.query', {
          orgId: req.orgId, tableName: 'snapshots', where: { id: snapId }, limit: 1,
        })
        const oldDesc = snapRes.rows?.[0]?.description || ''
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'snapshots', where: { id: snapId },
          data: {
            teacher_id: requesterTeacher,
            status: 'swapped',
            notes: `${oldDesc} ->调课(教师${requesterTeacher})`,
            description: `${oldDesc} ->原教师`,
          },
        })
      }
    }

    // Update request status
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'substitution_requests', where: { id },
      data: { status: 'approved', approved_at: new Date().toISOString() },
    })

    // Also approve via workflow if linked
    if (sub.workflow_instance_id) {
      try {
        // Get pending tasks for this instance
        const tasks = await app.mcp.call('workflow.list_tasks', {
          orgId: req.orgId, instanceId: sub.workflow_instance_id, status: 'pending',
        })
        if (tasks.tasks && tasks.tasks.length > 0) {
          await app.mcp.call('workflow.approve', {
            orgId: req.orgId,
            taskId: tasks.tasks[0].id,
            userId: req.userId || sub.requester_id,
            comment: req.body.comment || '审批通过',
          })
        }
      } catch (wfErr) {
        console.log(`[workflow] Approve failed: ${wfErr.message}`)
      }
    }

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Reject substitution
app.post('/api/substitutions/:id/reject', requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'substitution_requests', where: { id },
      data: { status: 'rejected' },
    })

    // Also reject via workflow if linked
    const subResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_requests', where: { id }, limit: 1,
    })
    const sub = subResult.rows?.[0]
    if (sub?.workflow_instance_id) {
      try {
        const tasks = await app.mcp.call('workflow.list_tasks', {
          orgId: req.orgId, instanceId: sub.workflow_instance_id, status: 'pending',
        })
        if (tasks.tasks && tasks.tasks.length > 0) {
          await app.mcp.call('workflow.reject', {
            orgId: req.orgId,
            taskId: tasks.tasks[0].id,
            userId: req.userId,
            comment: req.body.comment || '审批拒绝',
          })
        }
      } catch (wfErr) {
        console.log(`[workflow] Reject failed: ${wfErr.message}`)
      }
    }

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Inspection (巡课) ---
app.get('/api/inspections', (req, res) => listRecords(req, res, 'inspections'))
app.get('/api/inspections/:id', (req, res) => getRecord(req, res, 'inspections'))

app.post('/api/inspections', async (req, res) => {
  try {
    const { campus_id, grade_id, slot_index, date, records, inspector_id, inspector_name } = req.body

    // Validate required fields
    const err = validateRequired(req.body, ['campus_id', 'slot_index', 'date'])
    if (err) return res.status(400).json({ error: err })

    // Fetch snapshots for the given criteria
    const where = { campus_id: parseInt(campus_id), date, slot_index: parseInt(slot_index) }
    if (grade_id) where.grade_id = parseInt(grade_id)
    const snapshots = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'snapshots', where,
      orderBy: 'classroom_id',
      limit: 100,
    })

    const classes = (snapshots.rows || []).map(s => ({
      snapshot_id: s.id,
      classroom_id: s.classroom_id,
      subject_id: s.subject_id,
      teacher_id: s.teacher_id,
      description: s.description,
    }))

    // If records are provided, save the inspection
    if (records && Array.isArray(records)) {
      const result = await app.mcp.call('data.insert', {
        orgId: req.orgId,
        tableName: 'inspections',
        data: {
          campus_id: parseInt(campus_id),
          grade_id: grade_id ? parseInt(grade_id) : null,
          slot_index: parseInt(slot_index),
          date,
          inspector_id: inspector_id || req.userId,
          inspector_name: inspector_name || '',
          records: JSON.stringify(records),
          created_at: new Date().toISOString(),
        },
      })
      return res.json({ success: true, id: result.id, classes })
    }

    res.json({ success: true, classes })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Statistics & Reports ---

// Teacher workload statistics
app.get('/api/stats/teacher-workload', async (req, res) => {
  try {
    const { date_from, date_to, teacher_id } = req.query
    const where = { status: ['normal', 'substituted', 'swapped'] }
    if (date_from && date_to) {
      where.date_gte = date_from
      where.date_lte = date_to
    }
    if (teacher_id) where.teacher_id = parseInt(teacher_id)

    const snapshots = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'snapshots', where, limit: 10000,
    })

    // Group by teacher
    const teacherStats = {}
    for (const snap of (snapshots.rows || [])) {
      if (!teacherStats[snap.teacher_id]) {
        teacherStats[snap.teacher_id] = { teacher_id: snap.teacher_id, total: 0, substituted: 0, swapped: 0 }
      }
      teacherStats[snap.teacher_id].total++
      if (snap.status === 'substituted') teacherStats[snap.teacher_id].substituted++
      if (snap.status === 'swapped') teacherStats[snap.teacher_id].swapped++
    }

    // Enrich with teacher names
    const teachersRes = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'teachers_pool', limit: 500,
    })
    const teachersMap = Object.fromEntries((teachersRes.rows || []).map(t => [t.id, t.name]))

    const stats = Object.values(teacherStats).map(s => ({
      ...s,
      teacher_name: teachersMap[s.teacher_id] || `教师${s.teacher_id}`,
    }))

    res.json({ rows: stats.sort((a, b) => b.total - a.total) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Classroom schedule statistics
app.get('/api/stats/classroom-schedule', async (req, res) => {
  try {
    const { date_from, date_to, campus_id } = req.query
    const where = {}
    if (date_from && date_to) {
      where.date_gte = date_from
      where.date_lte = date_to
    }
    if (campus_id) where.campus_id = parseInt(campus_id)

    const snapshots = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'snapshots', where, limit: 10000,
    })

    // Group by classroom + subject
    const classroomStats = {}
    for (const snap of (snapshots.rows || [])) {
      const key = snap.classroom_id
      if (!classroomStats[key]) {
        classroomStats[key] = { classroom_id: snap.classroom_id, total: 0, subjects: {} }
      }
      classroomStats[key].total++
      const subjKey = snap.subject_id
      classroomStats[key].subjects[subjKey] = (classroomStats[key].subjects[subjKey] || 0) + 1
    }

    // Enrich with names
    const [classroomsRes, subjectsRes] = await Promise.all([
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'classrooms', limit: 200 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'subjects', limit: 100 }),
    ])
    const classroomsMap = Object.fromEntries((classroomsRes.rows || []).map(c => [c.id, c.name]))
    const subjectsMap = Object.fromEntries((subjectsRes.rows || []).map(s => [s.id, s.name]))

    const stats = Object.values(classroomStats).map(s => ({
      classroom_id: s.classroom_id,
      classroom_name: classroomsMap[s.classroom_id] || `班级${s.classroom_id}`,
      total: s.total,
      subject_breakdown: Object.entries(s.subjects).map(([sid, count]) => ({
        subject_id: parseInt(sid),
        subject_name: subjectsMap[parseInt(sid)] || `科目${sid}`,
        count,
      })),
    }))

    res.json({ rows: stats.sort((a, b) => a.classroom_name.localeCompare(b.classroom_name)) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Substitution statistics
app.get('/api/stats/substitutions', async (req, res) => {
  try {
    const { date_from, date_to } = req.query
    const subs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_requests', limit: 10000,
    })

    let filtered = subs.rows || []
    if (date_from) filtered = filtered.filter(s => s.created_at >= date_from)
    if (date_to) filtered = filtered.filter(s => s.created_at <= date_to)

    const total = filtered.length
    const approved = filtered.filter(s => s.status === 'approved').length
    const pending = filtered.filter(s => s.status === 'pending' || s.status === 'pending_workflow').length
    const rejected = filtered.filter(s => s.status === 'rejected').length
    const swapCount = filtered.filter(s => s.type === 'swap').length
    const subCount = filtered.filter(s => s.type === 'sub').length

    res.json({
      total, approved, pending, rejected,
      swap_count: swapCount, sub_count: subCount,
      approval_rate: total > 0 ? (approved / total * 100).toFixed(1) : 0,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Daily snapshot summary for dashboard
app.get('/api/stats/daily-summary', async (req, res) => {
  try {
    const { date } = req.query
    const targetDate = date || new Date().toISOString().split('T')[0]

    const snapshots = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'snapshots',
      where: { date: targetDate },
      limit: 10000,
    })

    const rows = snapshots.rows || []
    const totalClasses = rows.length
    const normalCount = rows.filter(r => r.status === 'normal').length
    const substitutedCount = rows.filter(r => r.status === 'substituted').length
    const swappedCount = rows.filter(r => r.status === 'swapped').length
    const uniqueTeachers = new Set(rows.map(r => r.teacher_id)).size
    const uniqueClassrooms = new Set(rows.map(r => r.classroom_id)).size

    res.json({
      date: targetDate,
      total_classes: totalClasses,
      normal: normalCount,
      substituted: substitutedCount,
      swapped: swappedCount,
      unique_teachers: uniqueTeachers,
      unique_classrooms: uniqueClassrooms,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Export: generate CSV-like data for teacher workload
app.get('/api/export/teacher-workload', async (req, res) => {
  try {
    const { date_from, date_to } = req.query
    const where = {}
    if (date_from && date_to) {
      where.date_gte = date_from
      where.date_lte = date_to
    }

    const snapshots = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'snapshots', where, limit: 10000,
    })
    const teachersRes = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'teachers_pool', limit: 500,
    })
    const teachersMap = Object.fromEntries((teachersRes.rows || []).map(t => [t.id, t.name]))

    const teacherStats = {}
    for (const snap of (snapshots.rows || [])) {
      if (!teacherStats[snap.teacher_id]) {
        teacherStats[snap.teacher_id] = { total: 0, substituted: 0, swapped: 0 }
      }
      teacherStats[snap.teacher_id].total++
      if (snap.status === 'substituted') teacherStats[snap.teacher_id].substituted++
      if (snap.status === 'swapped') teacherStats[snap.teacher_id].swapped++
    }

    const csvRows = [['教师姓名', '总课时', '代课课时', '调课课时']]
    for (const [tid, stats] of Object.entries(teacherStats)) {
      csvRows.push([teachersMap[parseInt(tid)] || tid, stats.total, stats.substituted, stats.swapped])
    }

    res.json({ format: 'csv', data: csvRows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.start()
