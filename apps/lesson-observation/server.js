import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'lesson-observation', port: 8084 })

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
  observation_appointments: [
    { name: 'serial_number', type: 'text' },
    { name: 'organizer_id', type: 'integer' },
    { name: 'organizer_name', type: 'text', nullable: true },
    { name: 'topic', type: 'text' },
    { name: 'teacher_id', type: 'integer' },
    { name: 'teacher_name', type: 'text', nullable: true },
    { name: 'observer_ids', type: 'jsonb' },
    { name: 'observer_names', type: 'jsonb', nullable: true },
    { name: 'date', type: 'date' },
    { name: 'period', type: 'text' },           // 'AM' | 'PM'
    { name: 'slot_index', type: 'integer' },
    { name: 'classroom_id', type: 'integer' },
    { name: 'classroom_name', type: 'text', nullable: true },
    { name: 'subject', type: 'text' },
    { name: 'time_description', type: 'text', nullable: true }, // auto-generated
    { name: 'has_attachment', type: 'boolean' },
    { name: 'attachment_urls', type: 'jsonb', nullable: true },
    { name: 'status', type: 'text' },           // 'pending' | 'approved' | 'rejected' | 'cancelled'
    { name: 'workflow_instance_id', type: 'integer', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: true },
    { name: 'approved_at', type: 'timestamp', nullable: true },
  ],
  observation_tasks: [
    { name: 'appointment_id', type: 'integer' },
    { name: 'serial_number', type: 'text' },
    { name: 'assignee_id', type: 'integer' },
    { name: 'assignee_name', type: 'text', nullable: true },
    { name: 'task_type', type: 'text' },        // 'observation' | 'discussion'
    { name: 'status', type: 'text' },           // 'pending' | 'completed'
    { name: 'completed_at', type: 'timestamp', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: true },
  ],
  evaluation_scales: [
    { name: 'name', type: 'text' },
    { name: 'description', type: 'text', nullable: true },
    { name: 'dimensions', type: 'jsonb' },      // array of { name, description, max_score }
    { name: 'is_default', type: 'boolean' },
    { name: 'created_at', type: 'timestamp', nullable: true },
  ],
  evaluation_records: [
    { name: 'appointment_id', type: 'integer' },
    { name: 'serial_number', type: 'text', nullable: true },
    { name: 'evaluator_id', type: 'integer' },
    { name: 'evaluator_name', type: 'text', nullable: true },
    { name: 'teacher_name', type: 'text', nullable: true },
    { name: 'topic', type: 'text', nullable: true },
    { name: 'date', type: 'date', nullable: true },
    { name: 'period', type: 'text', nullable: true },
    { name: 'slot_index', type: 'integer', nullable: true },
    { name: 'lesson_type', type: 'text', nullable: true },   // 课型
    { name: 'scale_id', type: 'integer', nullable: true },
    { name: 'dimension_comments', type: 'jsonb' },  // rich text for each dimension
    { name: 'scores', type: 'jsonb' },              // array of { dimension, score }
    { name: 'total_score', type: 'numeric' },
    { name: 'highlights', type: 'text', nullable: true },
    { name: 'suggestions', type: 'text', nullable: true },
    { name: 'photo_urls', type: 'jsonb', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: true },
  ],
  discussion_records: [
    { name: 'appointment_id', type: 'integer' },
    { name: 'serial_number', type: 'text', nullable: true },
    { name: 'topic', type: 'text', nullable: true },
    { name: 'date', type: 'date' },
    { name: 'organizer_id', type: 'integer' },
    { name: 'organizer_name', type: 'text', nullable: true },
    { name: 'teacher_id', type: 'integer', nullable: true },
    { name: 'teacher_name', type: 'text', nullable: true },
    { name: 'classroom_name', type: 'text', nullable: true },
    { name: 'subject', type: 'text', nullable: true },
    { name: 'discussion_minutes', type: 'integer', nullable: true }, // 课后第几分钟开始
    { name: 'participants', type: 'jsonb' },
    { name: 'recorders', type: 'jsonb', nullable: true },
    { name: 'self_evaluation', type: 'text', nullable: true },   // 授课老师自评
    { name: 'content', type: 'text' },
    { name: 'suggestions', type: 'text', nullable: true },
    { name: 'photo_urls', type: 'jsonb', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: true },
  ],
  collective_prep_records: [
    { name: 'date', type: 'date' },
    { name: 'topic', type: 'text' },
    { name: 'subject', type: 'text' },
    { name: 'grade', type: 'text', nullable: true },
    { name: 'location', type: 'text', nullable: true },
    { name: 'leader_ids', type: 'jsonb' },
    { name: 'leader_names', type: 'jsonb', nullable: true },
    { name: 'participant_ids', type: 'jsonb' },
    { name: 'participant_names', type: 'jsonb', nullable: true },
    { name: 'content', type: 'text' },
    { name: 'photo_urls', type: 'jsonb', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: true },
  ],
  announcements: [
    { name: 'content', type: 'text' },
    { name: 'author_id', type: 'integer', nullable: true },
    { name: 'is_active', type: 'boolean' },
    { name: 'created_at', type: 'timestamp', nullable: true },
  ],
}

// --- Workflow definition for observation appointment approval ---
const OBSERVATION_WORKFLOW_DEF = {
  name: '听课预约审批',
  description: '教研组长发起听课预约，审批通过后自动派发听课任务',
  variables: {
    topic: 'string',
    teacher_id: 'number',
    observer_count: 'number',
    date: 'string',
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
  for (const [tableName, columns] of Object.entries(TABLES)) {
    try {
      await app.mcp.call('data.create_table', { orgId: app.orgId, tableName, columns })
      console.log(`[init] Table '${tableName}' ready`)
    } catch (e) {
      console.log(`[init] Table '${tableName}' already exists`)
    }
  }

  // Register workflow definition
  try {
    const wfResult = await app.mcp.call('workflow.define', {
      orgId: app.orgId,
      definition: OBSERVATION_WORKFLOW_DEF,
    })
    app.observationWorkflowId = wfResult.id
    console.log(`[init] Observation workflow registered: ${wfResult.id}`)
  } catch (e) {
    console.log(`[init] Workflow already defined or error: ${e.message}`)
  }

  // Create default evaluation scale if none exists
  try {
    const scales = await app.mcp.call('data.query', {
      orgId: app.orgId, tableName: 'evaluation_scales', limit: 1,
    })
    if (!scales.rows || scales.rows.length === 0) {
      await app.mcp.call('data.insert', {
        orgId: app.orgId, tableName: 'evaluation_scales',
        data: {
          name: '通用评课量表',
          description: '适用于常规听课评课的标准化量表',
          is_default: true,
          dimensions: JSON.stringify([
            { name: '教学目标达成度', description: '教学目标是否明确、可测量，达成情况如何', max_score: 20 },
            { name: '教学内容设计', description: '内容选择是否恰当，结构是否合理，重难点是否突出', max_score: 20 },
            { name: '教学方法与手段', description: '方法是否灵活多样，是否恰当运用信息技术', max_score: 20 },
            { name: '师生互动', description: '学生参与度、课堂氛围、师生互动质量', max_score: 20 },
            { name: '教学效果', description: '学生知识掌握、能力提升、情感体验', max_score: 20 },
          ]),
          created_at: new Date().toISOString(),
        },
      })
    }
  } catch (e) {
    console.log(`[init] Default scale creation error: ${e.message}`)
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
      if (k !== 'limit' && k !== 'offset' && k !== 'orderBy' && k !== 'search') where[k] = v
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

// --- Announcements ---
app.get('/api/announcements', (req, res) => listRecords(req, res, 'announcements'))
app.get('/api/announcements/latest', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'announcements',
      where: { is_active: true },
      orderBy: 'created_at DESC',
      limit: 1,
    })
    res.json(result.rows?.[0] || null)
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.post('/api/announcements', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['content'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'announcements')
})
app.put('/api/announcements/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'announcements'))
app.delete('/api/announcements/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'announcements'))

// --- Appointments ---
app.get('/api/appointments', async (req, res) => {
  try {
    const where = {}
    if (req.query.status) where.status = req.query.status
    if (req.query.teacher_id) where.teacher_id = parseInt(req.query.teacher_id)
    if (req.query.organizer_id) where.organizer_id = parseInt(req.query.organizer_id)
    if (req.query.date) where.date = req.query.date
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'observation_appointments', where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.get('/api/appointments/:id', (req, res) => getRecord(req, res, 'observation_appointments'))

// Create appointment with workflow + auto task dispatch
app.post('/api/appointments', async (req, res) => {
  try {
    const { topic, teacher_id, teacher_name, observer_ids, observer_names,
            date, period, slot_index, classroom_id, classroom_name, subject,
            has_attachment, attachment_urls, organizer_id, organizer_name } = req.body

    // Validation
    const err = validateRequired(req.body, ['topic', 'teacher_id', 'observer_ids', 'date', 'period', 'slot_index'])
    if (err) return res.status(400).json({ error: err })

    const observers = typeof observer_ids === 'string' ? JSON.parse(observer_ids) : observer_ids
    if (!Array.isArray(observers) || observers.length === 0) {
      return res.status(400).json({ error: '必须选择至少一位听课教师' })
    }

    // Generate serial number
    const serialNumber = `OBS-${Date.now()}`

    // Auto-generate time description
    const periodText = period === 'AM' ? '上午' : '下午'
    const timeDescription = `${date}${periodText}第${slot_index}节课`

    // Start workflow
    let workflowInstanceId = null
    try {
      const wfResult = await app.mcp.call('workflow.start', {
        orgId: app.orgId,
        definitionId: app.observationWorkflowId,
        variables: { topic, teacher_id, observer_count: observers.length, date },
        createdBy: organizer_id || req.userId,
      })
      workflowInstanceId = wfResult.instanceId
    } catch (wfErr) {
      console.log(`[workflow] Start failed: ${wfErr.message}`)
    }

    // Create appointment
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'observation_appointments',
      data: {
        serial_number: serialNumber,
        organizer_id: organizer_id || req.userId,
        organizer_name: organizer_name || '',
        topic,
        teacher_id: parseInt(teacher_id),
        teacher_name: teacher_name || '',
        observer_ids: JSON.stringify(observers),
        observer_names: observer_names ? JSON.stringify(typeof observer_names === 'string' ? JSON.parse(observer_names) : observer_names) : null,
        date,
        period,
        slot_index: parseInt(slot_index),
        classroom_id: classroom_id ? parseInt(classroom_id) : null,
        classroom_name: classroom_name || '',
        subject: subject || '',
        time_description: timeDescription,
        has_attachment: !!has_attachment,
        attachment_urls: attachment_urls ? JSON.stringify(attachment_urls) : null,
        status: workflowInstanceId ? 'pending_workflow' : 'pending',
        workflow_instance_id: workflowInstanceId,
        created_at: new Date().toISOString(),
      },
    })

    res.json({
      id: result.id,
      serial_number: serialNumber,
      time_description: timeDescription,
      workflow_instance_id: workflowInstanceId,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Approve appointment -> auto-dispatch tasks (if no attachment)
app.post('/api/appointments/:id/approve', requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const apptResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'observation_appointments', where: { id }, limit: 1,
    })
    if (!apptResult.rows || apptResult.rows.length === 0) {
      return res.status(404).json({ error: '预约不存在' })
    }
    const appt = apptResult.rows[0]
    if (appt.status === 'approved') {
      return res.status(400).json({ error: '该预约已经通过审批' })
    }

    // Update status
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'observation_appointments', where: { id },
      data: { status: 'approved', approved_at: new Date().toISOString() },
    })

    // Auto-dispatch tasks ONLY if no attachment (常规听课)
    // 带附件的预约视为资料审阅型公开课，不强制任务跟踪
    if (!appt.has_attachment) {
      const observerIds = typeof appt.observer_ids === 'string'
        ? JSON.parse(appt.observer_ids) : appt.observer_ids || []
      const observerNames = typeof appt.observer_names === 'string'
        ? JSON.parse(appt.observer_names) : appt.observer_names || []

      for (let i = 0; i < observerIds.length; i++) {
        const observerId = observerIds[i]
        const observerName = observerNames?.[i] || ''

        // Create observation task
        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'observation_tasks',
          data: {
            appointment_id: id,
            serial_number: appt.serial_number,
            assignee_id: observerId,
            assignee_name: observerName,
            task_type: 'observation',
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        })

        // Create discussion task
        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'observation_tasks',
          data: {
            appointment_id: id,
            serial_number: appt.serial_number,
            assignee_id: observerId,
            assignee_name: observerName,
            task_type: 'discussion',
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        })
      }
    }

    // Also approve via workflow if linked
    if (appt.workflow_instance_id) {
      try {
        const tasks = await app.mcp.call('workflow.list_tasks', {
          orgId: req.orgId, instanceId: appt.workflow_instance_id, status: 'pending',
        })
        if (tasks.tasks && tasks.tasks.length > 0) {
          await app.mcp.call('workflow.approve', {
            orgId: req.orgId,
            taskId: tasks.tasks[0].id,
            userId: req.userId,
            comment: req.body.comment || '审批通过',
          })
        }
      } catch (wfErr) {
        console.log(`[workflow] Approve failed: ${wfErr.message}`)
      }
    }

    res.json({ success: true, tasks_dispatched: !appt.has_attachment })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Reject appointment
app.post('/api/appointments/:id/reject', requireRole('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'observation_appointments', where: { id },
      data: { status: 'rejected' },
    })

    // Reject via workflow if linked
    const apptResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'observation_appointments', where: { id }, limit: 1,
    })
    const appt = apptResult.rows?.[0]
    if (appt?.workflow_instance_id) {
      try {
        const tasks = await app.mcp.call('workflow.list_tasks', {
          orgId: req.orgId, instanceId: appt.workflow_instance_id, status: 'pending',
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
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/appointments/:id', (req, res) => updateRecord(req, res, 'observation_appointments'))
app.delete('/api/appointments/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'observation_appointments'))

// --- Tasks ---
app.get('/api/tasks', async (req, res) => {
  try {
    const where = {}
    if (req.query.assignee_id) where.assignee_id = parseInt(req.query.assignee_id)
    if (req.query.task_type) where.task_type = req.query.task_type
    if (req.query.status) where.status = req.query.status
    if (req.query.appointment_id) where.appointment_id = parseInt(req.query.appointment_id)
    if (req.query.serial_number) where.serial_number = req.query.serial_number
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'observation_tasks', where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '200'),
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Complete task (回勾)
app.put('/api/tasks/:id/complete', async (req, res) => {
  try {
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'observation_tasks',
      where: { id: parseInt(req.params.id) },
      data: { status: 'completed', completed_at: new Date().toISOString() },
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/tasks/:id', (req, res) => updateRecord(req, res, 'observation_tasks'))

// --- Evaluation Scales ---
app.get('/api/scales', (req, res) => listRecords(req, res, 'evaluation_scales'))
app.get('/api/scales/:id', (req, res) => getRecord(req, res, 'evaluation_scales'))
app.post('/api/scales', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['name', 'dimensions'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'evaluation_scales')
})
app.put('/api/scales/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'evaluation_scales'))
app.delete('/api/scales/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'evaluation_scales'))

// --- Evaluation Records ---
app.get('/api/evaluations', async (req, res) => {
  try {
    const where = {}
    if (req.query.appointment_id) where.appointment_id = parseInt(req.query.appointment_id)
    if (req.query.evaluator_id) where.evaluator_id = parseInt(req.query.evaluator_id)
    if (req.query.serial_number) where.serial_number = req.query.serial_number
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_records', where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Create evaluation with auto total score calculation
app.post('/api/evaluations', async (req, res) => {
  try {
    const { appointment_id, evaluator_id, evaluator_name, scores, dimension_comments,
            total_score, highlights, suggestions, lesson_type, photo_urls } = req.body

    const err = validateRequired(req.body, ['appointment_id', 'evaluator_id'])
    if (err) return res.status(400).json({ error: err })

    // Auto-calculate total score from scores array
    const scoresArr = typeof scores === 'string' ? JSON.parse(scores) : (scores || [])
    let calculatedTotal = 0
    if (Array.isArray(scoresArr)) {
      calculatedTotal = scoresArr.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0)
    }
    const finalTotal = total_score || calculatedTotal

    // Get appointment info for enrichment
    const apptResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'observation_appointments',
      where: { id: parseInt(appointment_id) }, limit: 1,
    })
    const appt = apptResult.rows?.[0]

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'evaluation_records',
      data: {
        appointment_id: parseInt(appointment_id),
        serial_number: appt?.serial_number || '',
        evaluator_id: parseInt(evaluator_id),
        evaluator_name: evaluator_name || '',
        teacher_name: appt?.teacher_name || '',
        topic: appt?.topic || '',
        date: appt?.date || null,
        period: appt?.period || null,
        slot_index: appt?.slot_index || null,
        lesson_type: lesson_type || '',
        scale_id: req.body.scale_id ? parseInt(req.body.scale_id) : null,
        dimension_comments: dimension_comments ? JSON.stringify(typeof dimension_comments === 'string' ? JSON.parse(dimension_comments) : dimension_comments) : null,
        scores: JSON.stringify(scoresArr),
        total_score: finalTotal,
        highlights: highlights || '',
        suggestions: suggestions || '',
        photo_urls: photo_urls ? JSON.stringify(photo_urls) : null,
        created_at: new Date().toISOString(),
      },
    })

    res.json({ id: result.id, total_score: finalTotal })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/evaluations/:id', (req, res) => updateRecord(req, res, 'evaluation_records'))

// --- Discussion Records ---
app.get('/api/discussions', async (req, res) => {
  try {
    const where = {}
    if (req.query.appointment_id) where.appointment_id = parseInt(req.query.appointment_id)
    if (req.query.serial_number) where.serial_number = req.query.serial_number
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'discussion_records', where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/discussions', async (req, res) => {
  try {
    const { appointment_id, topic, date, organizer_id, organizer_name,
            teacher_id, teacher_name, classroom_name, subject,
            discussion_minutes, participants, recorders,
            self_evaluation, content, suggestions, photo_urls } = req.body

    const err = validateRequired(req.body, ['appointment_id', 'date', 'content'])
    if (err) return res.status(400).json({ error: err })

    // Get appointment info
    const apptResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'observation_appointments',
      where: { id: parseInt(appointment_id) }, limit: 1,
    })
    const appt = apptResult.rows?.[0]

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'discussion_records',
      data: {
        appointment_id: parseInt(appointment_id),
        serial_number: appt?.serial_number || '',
        topic: topic || appt?.topic || '',
        date,
        organizer_id: organizer_id || req.userId,
        organizer_name: organizer_name || '',
        teacher_id: teacher_id || appt?.teacher_id,
        teacher_name: teacher_name || appt?.teacher_name || '',
        classroom_name: classroom_name || appt?.classroom_name || '',
        subject: subject || appt?.subject || '',
        discussion_minutes: discussion_minutes ? parseInt(discussion_minutes) : null,
        participants: JSON.stringify(participants || []),
        recorders: recorders ? JSON.stringify(recorders) : null,
        self_evaluation: self_evaluation || '',
        content,
        suggestions: suggestions || '',
        photo_urls: photo_urls ? JSON.stringify(photo_urls) : null,
        created_at: new Date().toISOString(),
      },
    })

    res.json({ id: result.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Collective Prep Records ---
app.get('/api/prep-records', async (req, res) => {
  try {
    const where = {}
    if (req.query.subject) where.subject = req.query.subject
    if (req.query.grade) where.grade = req.query.grade
    if (req.query.date) where.date = req.query.date
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'collective_prep_records', where,
      orderBy: req.query.orderBy || 'date DESC',
      limit: parseInt(req.query.limit || '100'),
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/prep-records', async (req, res) => {
  try {
    const { date, topic, subject, grade, location,
            leader_ids, leader_names, participant_ids, participant_names,
            content, photo_urls } = req.body

    const err = validateRequired(req.body, ['date', 'topic', 'subject', 'content'])
    if (err) return res.status(400).json({ error: err })

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'collective_prep_records',
      data: {
        date,
        topic,
        subject,
        grade: grade || '',
        location: location || '',
        leader_ids: JSON.stringify(leader_ids || []),
        leader_names: leader_names ? JSON.stringify(leader_names) : null,
        participant_ids: JSON.stringify(participant_ids || []),
        participant_names: participant_names ? JSON.stringify(participant_names) : null,
        content,
        photo_urls: photo_urls ? JSON.stringify(photo_urls) : null,
        created_at: new Date().toISOString(),
      },
    })

    res.json({ id: result.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Statistics & Reports ---

// Completion rate stats
app.get('/api/stats/completion', async (req, res) => {
  try {
    const { date_from, date_to, assignee_id } = req.query
    const where = {}
    if (assignee_id) where.assignee_id = parseInt(assignee_id)

    const tasks = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'observation_tasks', where, limit: 10000,
    })

    let rows = tasks.rows || []
    if (date_from) rows = rows.filter(t => t.created_at >= date_from)
    if (date_to) rows = rows.filter(t => t.created_at <= date_to)

    const total = rows.length
    const completed = rows.filter(t => t.status === 'completed').length
    const observationTotal = rows.filter(t => t.task_type === 'observation').length
    const observationCompleted = rows.filter(t => t.task_type === 'observation' && t.status === 'completed').length
    const discussionTotal = rows.filter(t => t.task_type === 'discussion').length
    const discussionCompleted = rows.filter(t => t.task_type === 'discussion' && t.status === 'completed').length

    // By assignee breakdown
    const byAssignee = {}
    for (const t of rows) {
      if (!byAssignee[t.assignee_id]) {
        byAssignee[t.assignee_id] = { assignee_id: t.assignee_id, assignee_name: t.assignee_name, total: 0, completed: 0 }
      }
      byAssignee[t.assignee_id].total++
      if (t.status === 'completed') byAssignee[t.assignee_id].completed++
    }

    res.json({
      total, completed,
      rate: total > 0 ? (completed / total * 100).toFixed(1) : 0,
      observation: { total: observationTotal, completed: observationCompleted },
      discussion: { total: discussionTotal, completed: discussionCompleted },
      by_assignee: Object.values(byAssignee).map(a => ({
        ...a,
        rate: a.total > 0 ? (a.completed / a.total * 100).toFixed(1) : 0,
      })),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Evaluation score statistics
app.get('/api/stats/evaluation-scores', async (req, res) => {
  try {
    const { date_from, date_to, teacher_id } = req.query
    const evaluations = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_records', limit: 10000,
    })

    let rows = evaluations.rows || []
    if (date_from) rows = rows.filter(e => e.created_at >= date_from)
    if (date_to) rows = rows.filter(e => e.created_at <= date_to)

    // Overall stats
    const scores = rows.map(e => parseFloat(e.total_score) || 0).filter(s => s > 0)
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0
    const minScore = scores.length > 0 ? Math.min(...scores) : 0

    // By teacher
    const byTeacher = {}
    for (const e of rows) {
      const key = e.teacher_name || e.teacher_id || 'unknown'
      if (!byTeacher[key]) byTeacher[key] = { teacher: key, scores: [] }
      byTeacher[key].scores.push(parseFloat(e.total_score) || 0)
    }

    res.json({
      total_evaluations: rows.length,
      avg_score: avgScore,
      max_score: maxScore,
      min_score: minScore,
      by_teacher: Object.values(byTeacher).map(t => ({
        teacher: t.teacher,
        count: t.scores.length,
        avg: (t.scores.reduce((a, b) => a + b, 0) / t.scores.length).toFixed(1),
      })),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Overall教研 stats
app.get('/api/stats/overview', async (req, res) => {
  try {
    const [appts, tasks, evals, discussions, preps] = await Promise.all([
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'observation_appointments', limit: 10000 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'observation_tasks', limit: 10000 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'evaluation_records', limit: 10000 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'discussion_records', limit: 10000 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'collective_prep_records', limit: 10000 }),
    ])

    const apptRows = appts.rows || []
    const taskRows = tasks.rows || []

    res.json({
      appointments: {
        total: apptRows.length,
        approved: apptRows.filter(a => a.status === 'approved').length,
        pending: apptRows.filter(a => a.status === 'pending' || a.status === 'pending_workflow').length,
        rejected: apptRows.filter(a => a.status === 'rejected').length,
      },
      tasks: {
        total: taskRows.length,
        completed: taskRows.filter(t => t.status === 'completed').length,
        pending: taskRows.filter(t => t.status === 'pending').length,
        observation: taskRows.filter(t => t.task_type === 'observation').length,
        discussion: taskRows.filter(t => t.task_type === 'discussion').length,
      },
      evaluations: { total: (evals.rows || []).length },
      discussions: { total: (discussions.rows || []).length },
      collective_prep: { total: (preps.rows || []).length },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Export: observation records for a teacher
app.get('/api/export/teacher-records/:teacherId', async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId)
    const appts = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'observation_appointments',
      where: { teacher_id: teacherId, status: 'approved' },
      orderBy: 'date DESC',
      limit: 1000,
    })

    const csvRows = [['日期', '时间', '课题', '听课人', '科目', '班级', '状态']]
    for (const a of (appts.rows || [])) {
      const observers = typeof a.observer_names === 'string' ? JSON.parse(a.observer_names) : (a.observer_names || [])
      csvRows.push([
        a.date, a.time_description || '', a.topic, observers.join('/'),
        a.subject || '', a.classroom_name || '', a.status,
      ])
    }

    res.json({ format: 'csv', data: csvRows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
