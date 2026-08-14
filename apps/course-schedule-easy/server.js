import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'course-schedule-easy', port: 8081 })

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
  ],
  classrooms: [
    { name: 'campus_id', type: 'integer' },
    { name: 'name', type: 'text' },
  ],
  subjects: [
    { name: 'name', type: 'text' },
  ],
  time_slots: [
    { name: 'campus_id', type: 'integer' },
    { name: 'name', type: 'text' },
    { name: 'sort_order', type: 'integer' },
  ],
  teachers_pool: [
    { name: 'user_id', type: 'integer' },
    { name: 'name', type: 'text' },
  ],
  base_schedules: [
    { name: 'campus_id', type: 'integer' },
    { name: 'classroom_id', type: 'integer' },
    { name: 'semester_start', type: 'date' },
    { name: 'semester_end', type: 'date' },
    { name: 'weekly_data', type: 'jsonb' },
  ],
  substitution_records: [
    { name: 'type', type: 'text' },           // 'swap' | 'sub'
    { name: 'status', type: 'text' },         // 'pending' | 'confirmed' | 'rejected' | 'cancelled'
    { name: 'classroom_id', type: 'integer' },
    { name: 'date', type: 'date' },
    { name: 'slot_index', type: 'integer' },
    { name: 'subject_id', type: 'integer', nullable: true },
    { name: 'original_teacher_id', type: 'integer' },
    { name: 'original_teacher_name', type: 'text', nullable: true },
    { name: 'replacement_teacher_id', type: 'integer' },
    { name: 'replacement_teacher_name', type: 'text', nullable: true },
    // Swap-specific fields
    { name: 'swap_classroom_id', type: 'integer', nullable: true },
    { name: 'swap_date', type: 'date', nullable: true },
    { name: 'swap_slot_index', type: 'integer', nullable: true },
    { name: 'swap_teacher_id', type: 'integer', nullable: true },
    { name: 'swap_teacher_name', type: 'text', nullable: true },
    // Audit
    { name: 'initiator_id', type: 'integer' },
    { name: 'initiator_name', type: 'text', nullable: true },
    { name: 'reason', type: 'text', nullable: true },
    { name: 'initiated_at', type: 'timestamp', nullable: true },
    { name: 'confirmed_at', type: 'timestamp', nullable: true },
    { name: 'rejected_at', type: 'timestamp', nullable: true },
    { name: 'cancelled_at', type: 'timestamp', nullable: true },
  ],
  import_logs: [
    { name: 'file_name', type: 'text' },
    { name: 'import_type', type: 'text' },    // 'master_data' | 'schedule'
    { name: 'status', type: 'text' },         // 'success' | 'partial' | 'failed'
    { name: 'error_details', type: 'text', nullable: true },
    { name: 'imported_count', type: 'integer', nullable: true },
    { name: 'total_count', type: 'integer', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: true },
  ],
  oobe_config: [
    { name: 'initialized', type: 'boolean' },
    { name: 'semester_start', type: 'date', nullable: true },
    { name: 'semester_end', type: 'date', nullable: true },
    { name: 'admin_password', type: 'text', nullable: true },
    { name: 'theme_color', type: 'text', nullable: true },
    { name: 'config_data', type: 'jsonb', nullable: true },
  ],
  inspections: [
    { name: 'campus_id', type: 'integer' },
    { name: 'slot_index', type: 'integer' },
    { name: 'date', type: 'date' },
    { name: 'inspector_id', type: 'integer' },
    { name: 'inspector_name', type: 'text', nullable: true },
    { name: 'records', type: 'jsonb' },
    { name: 'created_at', type: 'timestamp', nullable: true },
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
  // Initialize OOBE config if not exists
  try {
    const existing = await app.mcp.call('data.query', { orgId: app.orgId, tableName: 'oobe_config', limit: 1 })
    if (!existing.rows || existing.rows.length === 0) {
      await app.mcp.call('data.insert', {
        orgId: app.orgId, tableName: 'oobe_config',
        data: { initialized: false, admin_password: 'admin123', theme_color: '#009688' },
      })
    }
  } catch (e) { /* ignore */ }
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

function verifyAdminPassword(req, res) {
  // Check is done in the handler
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

// --- Campuses ---
app.get('/api/campuses', (req, res) => listRecords(req, res, 'campuses'))
app.post('/api/campuses', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['name'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'campuses')
})
app.put('/api/campuses/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'campuses'))
app.delete('/api/campuses/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'campuses'))

// --- Classrooms ---
app.get('/api/classrooms', (req, res) => listRecords(req, res, 'classrooms'))
app.post('/api/classrooms', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['campus_id', 'name'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'classrooms')
})
app.put('/api/classrooms/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'classrooms'))
app.delete('/api/classrooms/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'classrooms'))

// --- Subjects ---
app.get('/api/subjects', (req, res) => listRecords(req, res, 'subjects'))
app.post('/api/subjects', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['name'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'subjects')
})

// --- Time Slots ---
app.get('/api/time-slots', (req, res) => listRecords(req, res, 'time_slots'))
app.post('/api/time-slots', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['campus_id', 'name', 'sort_order'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'time_slots')
})

// --- Teachers Pool ---
app.get('/api/teachers', (req, res) => listRecords(req, res, 'teachers_pool'))
app.post('/api/teachers', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['user_id', 'name'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'teachers_pool')
})

// --- Base Schedules ---
app.get('/api/schedules', (req, res) => listRecords(req, res, 'base_schedules'))
app.post('/api/schedules', requireRole('admin'), async (req, res) => {
  const err = validateRequired(req.body, ['campus_id', 'classroom_id', 'semester_start', 'semester_end', 'weekly_data'])
  if (err) return res.status(400).json({ error: err })

  // Validate date range
  const s = new Date(req.body.semester_start)
  const e = new Date(req.body.semester_end)
  if (s >= e) return res.status(400).json({ error: '学期起始日期必须早于结束日期' })

  createRecord(req, res, 'base_schedules')
})
app.put('/api/schedules/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'base_schedules'))
app.delete('/api/schedules/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'base_schedules'))

// --- Real-time schedule view: base schedule + confirmed substitutions ---
// This is the core "real-time computation model" of the easy schedule app
app.get('/api/schedules/realtime', async (req, res) => {
  try {
    const { classroom_id, teacher_id, date, week_start } = req.query

    // Get base schedules
    const scheduleWhere = {}
    if (classroom_id) scheduleWhere.classroom_id = parseInt(classroom_id)
    const schedules = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'base_schedules',
      where: scheduleWhere, limit: 100,
    })

    // Get confirmed substitutions
    const subWhere = { status: 'confirmed' }
    if (date) subWhere.date = date
    if (week_start) {
      const ws = new Date(week_start)
      const we = new Date(ws)
      we.setDate(we.getDate() + 6)
      subWhere.date_gte = ws.toISOString().split('T')[0]
      subWhere.date_lte = we.toISOString().split('T')[0]
    }
    const subs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_records',
      where: subWhere, limit: 1000,
    })

    // Load reference data for enrichment
    const [teachersRes, subjectsRes, classroomsRes, slotsRes] = await Promise.all([
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'teachers_pool', limit: 500 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'subjects', limit: 100 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'classrooms', limit: 200 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'time_slots', limit: 200 }),
    ])
    const teachersMap = Object.fromEntries((teachersRes.rows || []).map(t => [t.id, t.name]))
    const subjectsMap = Object.fromEntries((subjectsRes.rows || []).map(s => [s.id, s.name]))
    const classroomsMap = Object.fromEntries((classroomsRes.rows || []).map(c => [c.id, c.name]))
    const slotsMap = Object.fromEntries((slotsRes.rows || []).map(s => [s.sort_order, s.name]))

    // If teacher_id is specified, aggregate across all classrooms
    if (teacher_id) {
      const tid = parseInt(teacher_id)
      const teacherSlots = {} // slot_index -> { date -> { ... } }

      for (const schedule of (schedules.rows || [])) {
        const weeklyData = typeof schedule.weekly_data === 'string'
          ? JSON.parse(schedule.weekly_data) : schedule.weekly_data
        if (!weeklyData) continue

        for (const [dayKey, daySlots] of Object.entries(weeklyData)) {
          for (const slot of (daySlots || [])) {
            if (slot.teacher_id === tid) {
              const slotKey = `${slot.slot_index}_${dayKey}`
              if (!teacherSlots[slotKey]) {
                teacherSlots[slotKey] = {
                  slot_index: slot.slot_index,
                  dayKey,
                  classroom_id: schedule.classroom_id,
                  classroom_name: classroomsMap[schedule.classroom_id] || '',
                  subject_id: slot.subject_id,
                  subject_name: subjectsMap[slot.subject_id] || '',
                  teacher_id: tid,
                  teacher_name: teachersMap[tid] || '',
                  substituted: false,
                }
              }
            }

            // Check if substitution applies
            const confirmedSubs = (subs.rows || []).filter(s =>
              s.classroom_id === schedule.classroom_id &&
              s.slot_index === slot.slot_index
            )
            for (const sub of confirmedSubs) {
              if (sub.type === 'sub' && sub.replacement_teacher_id === tid) {
                // This teacher is the replacement
                teacherSlots[`${slot.slot_index}_${dayKey}_sub_${sub.id}`] = {
                  slot_index: slot.slot_index,
                  dayKey,
                  classroom_id: schedule.classroom_id,
                  classroom_name: classroomsMap[schedule.classroom_id] || '',
                  subject_id: slot.subject_id,
                  subject_name: subjectsMap[slot.subject_id] || '',
                  teacher_id: tid,
                  teacher_name: teachersMap[tid] || '',
                  substituted: true,
                  original_teacher_id: sub.original_teacher_id,
                  original_teacher_name: sub.original_teacher_name || teachersMap[sub.original_teacher_id] || '',
                  sub_type: '代',
                }
              }
              if (sub.type === 'swap' && sub.swap_teacher_id === tid) {
                teacherSlots[`${slot.slot_index}_${dayKey}_swap_${sub.id}`] = {
                  slot_index: slot.slot_index,
                  dayKey,
                  classroom_id: sub.swap_classroom_id || schedule.classroom_id,
                  classroom_name: classroomsMap[sub.swap_classroom_id] || '',
                  subject_id: slot.subject_id,
                  subject_name: subjectsMap[slot.subject_id] || '',
                  teacher_id: tid,
                  teacher_name: teachersMap[tid] || '',
                  substituted: true,
                  original_teacher_id: sub.original_teacher_id,
                  original_teacher_name: sub.original_teacher_name || '',
                  sub_type: '调',
                }
              }
            }
          }
        }
      }

      return res.json({ rows: Object.values(teacherSlots), mode: 'teacher' })
    }

    // Classroom mode: apply substitutions on base schedule
    const result = (schedules.rows || []).map(schedule => {
      const weeklyData = typeof schedule.weekly_data === 'string'
        ? JSON.parse(schedule.weekly_data) : schedule.weekly_data
      if (!weeklyData) return { ...schedule, daySlots: {} }

      const classroomSubs = (subs.rows || []).filter(s =>
        s.classroom_id === schedule.classroom_id
      )

      // Deep copy and apply substitutions
      const modifiedData = JSON.parse(JSON.stringify(weeklyData))
      for (const [dayKey, daySlots] of Object.entries(modifiedData)) {
        if (!Array.isArray(daySlots)) continue
        modifiedData[dayKey] = daySlots.map(slot => {
          const sub = classroomSubs.find(s =>
            s.slot_index === slot.slot_index && s.date === date
          )
          if (sub) {
            return {
              ...slot,
              original_teacher_id: slot.teacher_id,
              original_teacher_name: teachersMap[slot.teacher_id] || '',
              teacher_id: sub.replacement_teacher_id,
              teacher_name: teachersMap[sub.replacement_teacher_id] || sub.replacement_teacher_name || '',
              substituted: true,
              sub_type: sub.type === 'swap' ? '调' : '代',
            }
          }
          return { ...slot, teacher_name: teachersMap[slot.teacher_id] || '', subject_name: subjectsMap[slot.subject_id] || '' }
        })
      }

      return {
        ...schedule,
        classroom_name: classroomsMap[schedule.classroom_id] || '',
        weeklyData: modifiedData,
      }
    })

    res.json({ rows: result, mode: 'classroom' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Substitution Records ---
app.get('/api/substitutions', async (req, res) => {
  try {
    const where = {}
    if (req.query.status) where.status = req.query.status
    if (req.query.initiator_id) where.initiator_id = parseInt(req.query.initiator_id)
    if (req.query.type) where.type = req.query.type
    if (req.query.classroom_id) where.classroom_id = parseInt(req.query.classroom_id)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_records', where,
      orderBy: req.query.orderBy || 'initiated_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0'),
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.get('/api/substitutions/:id', (req, res) => getRecord(req, res, 'substitution_records'))

// Create substitution with validation + uniqueness check
app.post('/api/substitutions', async (req, res) => {
  try {
    const { type, classroom_id, date, slot_index, original_teacher_id, replacement_teacher_id,
            swap_classroom_id, swap_date, swap_slot_index, swap_teacher_id, reason, initiator_id } = req.body

    // Validation
    const err = validateRequired(req.body, ['type', 'classroom_id', 'date', 'slot_index', 'original_teacher_id', 'replacement_teacher_id'])
    if (err) return res.status(400).json({ error: err })

    // Cannot substitute for yourself
    if (original_teacher_id === replacement_teacher_id) {
      return res.status(400).json({ error: '不能给自己的课代课' })
    }

    // Swap type requires swap target fields
    if (type === 'swap') {
      const swapErr = validateRequired(req.body, ['swap_classroom_id', 'swap_date', 'swap_slot_index', 'swap_teacher_id'])
      if (swapErr) return res.status(400).json({ error: `调课需要对方课程信息: ${swapErr}` })

      // The swap teacher must not be the initiator
      if (swap_teacher_id === initiator_id) {
        return res.status(400).json({ error: '对方课程不能是您自己的课' })
      }
      // The original must be the initiator's class
      if (original_teacher_id !== initiator_id) {
        return res.status(400).json({ error: '己方课程必须是您本人的课' })
      }
    }

    // Uniqueness check: no other confirmed substitution for the same slot
    const existingConfirmed = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_records',
      where: {
        classroom_id: parseInt(classroom_id),
        date,
        slot_index: parseInt(slot_index),
        status: 'confirmed',
      },
      limit: 1,
    })
    if (existingConfirmed.rows && existingConfirmed.rows.length > 0) {
      return res.status(409).json({
        error: '该课格已存在已确认的调代记录',
        conflict: existingConfirmed.rows[0],
      })
    }

    // Get teacher names
    const [origRes, replRes] = await Promise.all([
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'teachers_pool', where: { id: original_teacher_id }, limit: 1 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'teachers_pool', where: { id: replacement_teacher_id }, limit: 1 }),
    ])

    const data = {
      type,
      status: 'pending',
      classroom_id: parseInt(classroom_id),
      date,
      slot_index: parseInt(slot_index),
      original_teacher_id: parseInt(original_teacher_id),
      original_teacher_name: origRes.rows?.[0]?.name || '',
      replacement_teacher_id: parseInt(replacement_teacher_id),
      replacement_teacher_name: replRes.rows?.[0]?.name || '',
      initiator_id: initiator_id || replacement_teacher_id,
      initiator_name: replRes.rows?.[0]?.name || '',
      reason: reason || '',
      initiated_at: new Date().toISOString(),
    }

    if (type === 'swap') {
      const swapTeacherRes = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'teachers_pool', where: { id: swap_teacher_id }, limit: 1,
      })
      data.swap_classroom_id = parseInt(swap_classroom_id)
      data.swap_date = swap_date
      data.swap_slot_index = parseInt(swap_slot_index)
      data.swap_teacher_id = parseInt(swap_teacher_id)
      data.swap_teacher_name = swapTeacherRes.rows?.[0]?.name || ''
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'substitution_records', data,
    })
    res.json({ id: result.id, ...data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Confirm substitution (peer-to-peer state machine)
app.post('/api/substitutions/:id/confirm', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const subResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_records', where: { id }, limit: 1,
    })
    if (!subResult.rows || subResult.rows.length === 0) {
      return res.status(404).json({ error: '调代记录不存在' })
    }
    const sub = subResult.rows[0]
    if (sub.status !== 'pending') {
      return res.status(400).json({ error: `当前状态为 ${sub.status}，无法确认` })
    }

    // Verify the confirmer is the correct person
    const confirmerId = req.body.confirmer_id || req.userId
    if (sub.type === 'sub' && sub.original_teacher_id !== confirmerId) {
      return res.status(403).json({ error: '只有原教师可以确认代课' })
    }
    if (sub.type === 'swap' && sub.swap_teacher_id !== confirmerId) {
      return res.status(403).json({ error: '只有对调教师可以确认调课' })
    }

    // Uniqueness check before confirming
    const existingConfirmed = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_records',
      where: {
        classroom_id: sub.classroom_id,
        date: sub.date,
        slot_index: sub.slot_index,
        status: 'confirmed',
      },
      limit: 1,
    })
    if (existingConfirmed.rows && existingConfirmed.rows.length > 0) {
      return res.status(409).json({
        error: '该课格已被其他调代记录占用',
        conflict: existingConfirmed.rows[0],
      })
    }

    // For swap, also check the target slot
    if (sub.type === 'swap' && sub.swap_classroom_id) {
      const existingSwap = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'substitution_records',
        where: {
          classroom_id: sub.swap_classroom_id,
          date: sub.swap_date,
          slot_index: sub.swap_slot_index,
          status: 'confirmed',
        },
        limit: 1,
      })
      if (existingSwap.rows && existingSwap.rows.length > 0) {
        return res.status(409).json({
          error: '对调课格已被其他调代记录占用',
          conflict: existingSwap.rows[0],
        })
      }
    }

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'substitution_records', where: { id },
      data: { status: 'confirmed', confirmed_at: new Date().toISOString() },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Reject substitution
app.post('/api/substitutions/:id/reject', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const subResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_records', where: { id }, limit: 1,
    })
    if (!subResult.rows || subResult.rows.length === 0) {
      return res.status(404).json({ error: '调代记录不存在' })
    }
    if (subResult.rows[0].status !== 'pending') {
      return res.status(400).json({ error: '只能拒绝待确认的记录' })
    }

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'substitution_records', where: { id },
      data: { status: 'rejected', rejected_at: new Date().toISOString() },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Cancel substitution (by initiator)
app.post('/api/substitutions/:id/cancel', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const subResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_records', where: { id }, limit: 1,
    })
    if (!subResult.rows || subResult.rows.length === 0) {
      return res.status(404).json({ error: '调代记录不存在' })
    }
    const sub = subResult.rows[0]
    if (sub.status === 'rejected' || sub.status === 'cancelled') {
      return res.status(400).json({ error: `当前状态为 ${sub.status}，无法撤销` })
    }

    // Only initiator can cancel
    const cancelerId = req.body.canceler_id || req.userId
    if (sub.initiator_id !== cancelerId) {
      return res.status(403).json({ error: '只有发起人可以撤销' })
    }

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'substitution_records', where: { id },
      data: { status: 'cancelled', cancelled_at: new Date().toISOString() },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Import Logs ---
app.get('/api/import-logs', requireRole('admin'), (req, res) => listRecords(req, res, 'import_logs'))
app.post('/api/import-logs', requireRole('admin'), (req, res) => createRecord(req, res, 'import_logs'))

// --- OOBE Config ---
app.get('/api/config', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', { orgId: req.orgId, tableName: 'oobe_config', limit: 1 })
    res.json(result.rows?.[0] || { initialized: false })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/config', requireRole('admin'), async (req, res) => {
  try {
    const existing = await app.mcp.call('data.query', { orgId: req.orgId, tableName: 'oobe_config', limit: 1 })
    if (existing.rows?.length > 0) {
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'oobe_config',
        where: { id: existing.rows[0].id }, data: req.body,
      })
    } else {
      await app.mcp.call('data.insert', { orgId: req.orgId, tableName: 'oobe_config', data: req.body })
    }
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Admin password verification ---
app.post('/api/config/verify-password', async (req, res) => {
  try {
    const config = await app.mcp.call('data.query', { orgId: req.orgId, tableName: 'oobe_config', limit: 1 })
    const stored = config.rows?.[0]?.admin_password || 'admin123'
    if (req.body.password === stored) {
      res.json({ verified: true })
    } else {
      res.status(403).json({ verified: false, error: '口令错误' })
    }
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Inspection ---
app.get('/api/inspections', (req, res) => listRecords(req, res, 'inspections'))
app.post('/api/inspections', async (req, res) => {
  try {
    const { campus_id, slot_index, date, records, inspector_id, inspector_name } = req.body
    const err = validateRequired(req.body, ['campus_id', 'slot_index', 'date'])
    if (err) return res.status(400).json({ error: err })

    // Get real-time schedule for the given criteria
    const scheduleWhere = { campus_id: parseInt(campus_id) }
    const schedules = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'base_schedules', where: scheduleWhere, limit: 100,
    })

    // Get confirmed substitutions for the date
    const subs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_records',
      where: { status: 'confirmed', date },
      limit: 1000,
    })

    // Compute real-time classes
    const dayOfWeek = new Date(date).getDay()
    const dayKey = `day_${dayOfWeek}`
    const classes = []

    for (const schedule of (schedules.rows || [])) {
      const weeklyData = typeof schedule.weekly_data === 'string'
        ? JSON.parse(schedule.weekly_data) : schedule.weekly_data
      const daySlots = weeklyData?.[dayKey] || []
      const slot = daySlots.find(s => s.slot_index === parseInt(slot_index))
      if (!slot || !slot.subject_id || !slot.teacher_id) continue

      // Apply substitution if exists
      const sub = (subs.rows || []).find(s =>
        s.classroom_id === schedule.classroom_id && s.slot_index === parseInt(slot_index)
      )
      const teacherId = sub ? sub.replacement_teacher_id : slot.teacher_id

      classes.push({
        classroom_id: schedule.classroom_id,
        subject_id: slot.subject_id,
        teacher_id: teacherId,
        substituted: !!sub,
        sub_type: sub?.type === 'swap' ? '调' : (sub ? '代' : null),
      })
    }

    // Save inspection record if records provided
    if (records && Array.isArray(records)) {
      const result = await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'inspections',
        data: {
          campus_id: parseInt(campus_id),
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
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Statistics ---
app.get('/api/stats/substitutions', async (req, res) => {
  try {
    const subs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'substitution_records', limit: 10000,
    })
    const rows = subs.rows || []
    const total = rows.length
    const confirmed = rows.filter(s => s.status === 'confirmed').length
    const pending = rows.filter(s => s.status === 'pending').length
    const rejected = rows.filter(s => s.status === 'rejected').length
    const cancelled = rows.filter(s => s.status === 'cancelled').length

    res.json({ total, confirmed, pending, rejected, cancelled })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
