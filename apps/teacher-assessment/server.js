import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'teacher-assessment', port: 8087 })

// ─── Static File Serving ───────────────────────────────────────────────────────
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

// ─── Permission Middleware ─────────────────────────────────────────────────────
const ROLES = { admin: 4, director: 3, grade_head: 2, teacher: 1 }

function requireRole(minRole) {
  return (req, res, next) => {
    const role = req.headers['x-user-role'] || 'teacher'
    const level = ROLES[role] || 0
    const minLevel = ROLES[minRole] || 0
    if (level < minLevel) {
      res.status(403).json({ error: '权限不足，需要角色: ' + minRole })
      return false
    }
    req.userRole = role
    if (next) return next()
    return true
  }
}

function checkRole(req, res, minRole) {
  const role = req.headers['x-user-role'] || 'teacher'
  const level = ROLES[role] || 0
  const minLevel = ROLES[minRole] || 0
  return level >= minLevel
}

// ─── Table Definitions ─────────────────────────────────────────────────────────
const TABLES = {
  assessment_orgs: [
    { name: 'name', type: 'text' },
    { name: 'type', type: 'text' },
    { name: 'parent_id', type: 'integer', nullable: true },
  ],
  assessment_teachers: [
    { name: 'user_id', type: 'integer' },
    { name: 'assessment_org_id', type: 'integer' },
    { name: 'position', type: 'text' },
    { name: 'title', type: 'text' },
  ],
  positions: [
    { name: 'name', type: 'text' },
    { name: 'description', type: 'text', nullable: true },
  ],
  time_periods: [
    { name: 'name', type: 'text' },
    { name: 'type', type: 'text' },
    { name: 'start_date', type: 'date' },
    { name: 'end_date', type: 'date' },
  ],
  weekly_events: [
    { name: 'period_id', type: 'integer' },
    { name: 'day_of_week', type: 'integer' },
    { name: 'time_slot_id', type: 'integer' },
    { name: 'space_id', type: 'integer' },
    { name: 'teacher_ids', type: 'jsonb' },
    { name: 'description', type: 'text' },
    { name: 'recorded_by', type: 'integer' },
  ],
  award_registrations: [
    { name: 'teacher_id', type: 'integer' },
    { name: 'level', type: 'text' },
    { name: 'rank', type: 'text' },
    { name: 'title', type: 'text' },
    { name: 'description', type: 'text', nullable: true },
    { name: 'attachment_url', type: 'text', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'workflow_instance_id', type: 'integer', nullable: true },
    { name: 'scope', type: 'text', nullable: true },
    { name: 'category_id', type: 'integer', nullable: true },
    { name: 'award_date', type: 'date', nullable: true },
    { name: 'certificate_url', type: 'text', nullable: true },
    { name: 'level_rank', type: 'text', nullable: true },
    { name: 'reject_reason', type: 'text', nullable: true },
  ],
  semester_assessments: [
    { name: 'teacher_id', type: 'integer' },
    { name: 'period_id', type: 'integer' },
    { name: 'teaching_standard_score', type: 'numeric' },
    { name: 'teaching_activity_score', type: 'numeric' },
    { name: 'self_score', type: 'numeric', nullable: true },
    { name: 'review_score', type: 'numeric', nullable: true },
  ],
  annual_assessments: [
    { name: 'teacher_id', type: 'integer' },
    { name: 'period_id', type: 'integer' },
    { name: 'de_score', type: 'numeric' },
    { name: 'neng_score', type: 'numeric' },
    { name: 'qin_score', type: 'numeric' },
    { name: 'ji_score', type: 'numeric' },
    { name: 'bonus_score', type: 'numeric' },
    { name: 'deduction_score', type: 'numeric' },
    { name: 'total_score', type: 'numeric' },
    { name: 'self_comment', type: 'text', nullable: true },
    { name: 'review_comment', type: 'text', nullable: true },
    { name: 'self_total', type: 'numeric', nullable: true },
    { name: 'review_total', type: 'numeric', nullable: true },
  ],
  assessment_scopes: [
    { name: 'name', type: 'text' },
    { name: 'campus', type: 'text' },
    { name: 'grade_range', type: 'jsonb' },
  ],
  duty_assignments: [
    { name: 'teacher_id', type: 'integer' },
    { name: 'assessment_org_id', type: 'integer' },
    { name: 'period', type: 'text' },
  ],
  award_categories: [
    { name: 'name', type: 'text' },
    { name: 'scope', type: 'text' },
    { name: 'description', type: 'text', nullable: true },
  ],
  deduction_categories: [
    { name: 'name', type: 'text' },
    { name: 'description', type: 'text', nullable: true },
  ],
  semester_assessment_items: [
    { name: 'assessment_id', type: 'integer' },
    { name: 'category', type: 'text' },
    { name: 'item_name', type: 'text' },
    { name: 'max_score', type: 'numeric' },
    { name: 'self_score', type: 'numeric', nullable: true },
    { name: 'review_score', type: 'numeric', nullable: true },
    { name: 'award_ids', type: 'jsonb', nullable: true },
  ],
  annual_assessment_items: [
    { name: 'assessment_id', type: 'integer' },
    { name: 'category', type: 'text' },
    { name: 'item_name', type: 'text' },
    { name: 'max_score', type: 'numeric', nullable: true },
    { name: 'self_score', type: 'numeric', nullable: true },
    { name: 'review_score', type: 'numeric', nullable: true },
    { name: 'evidence_url', type: 'text', nullable: true },
  ],
}

// ─── Seed Data ─────────────────────────────────────────────────────────────────
const SEED_DEDUCTION_CATEGORIES = [
  '体罚', '同事之间无原则纠纷', '乱收费', '从事有偿家教', '出现安全事故',
  '集体财产受到损失', '无故缺席', '全年病假3天事假2天以上', '迟到早退中途溜号', '旷课',
]

const SEED_AWARD_CATEGORIES = [
  { name: '教学基本功大赛', scope: 'semester', description: '校级教学技能比赛' },
  { name: '优质课评选', scope: 'semester', description: '优质课评比获奖' },
  { name: '课件制作比赛', scope: 'semester', description: '多媒体课件评选' },
  { name: '论文评选', scope: 'semester', description: '教育教学论文获奖' },
  { name: '辅导学生获奖', scope: 'semester', description: '指导学生竞赛获奖' },
  { name: '年度考核优秀', scope: 'annual', description: '年度考核获评优秀' },
  { name: '科研成果奖', scope: 'annual', description: '科研项目或成果获奖' },
  { name: '荣誉称号', scope: 'annual', description: '获得各级荣誉称号' },
  { name: '课题结题', scope: 'annual', description: '课题顺利结题' },
  { name: ' publications 发表', scope: 'annual', description: '发表学术论文' },
]

// ─── Table Init & Seed ─────────────────────────────────────────────────────────
app.onStart(async () => {
  for (const [tableName, columns] of Object.entries(TABLES)) {
    try {
      await app.mcp.call('data.create_table', { orgId: app.orgId, tableName, columns })
      console.log(`[init] Table '${tableName}' ready`)
    } catch (e) {
      console.log(`[init] Table '${tableName}' already exists`)
    }
  }

  // Seed deduction categories
  try {
    const existing = await app.mcp.call('data.query', {
      orgId: app.orgId, tableName: 'deduction_categories', where: {}, limit: 1,
    })
    if (!existing.rows || existing.rows.length === 0) {
      for (const name of SEED_DEDUCTION_CATEGORIES) {
        await app.mcp.call('data.insert', {
          orgId: app.orgId, tableName: 'deduction_categories',
          data: { name, description: null },
        })
      }
      console.log('[seed] Deduction categories seeded')
    }
  } catch (e) {
    console.log('[seed] Deduction categories seed skipped:', e.message)
  }

  // Seed award categories
  try {
    const existing = await app.mcp.call('data.query', {
      orgId: app.orgId, tableName: 'award_categories', where: {}, limit: 1,
    })
    if (!existing.rows || existing.rows.length === 0) {
      for (const cat of SEED_AWARD_CATEGORIES) {
        await app.mcp.call('data.insert', {
          orgId: app.orgId, tableName: 'award_categories', data: cat,
        })
      }
      console.log('[seed] Award categories seeded')
    }
  } catch (e) {
    console.log('[seed] Award categories seed skipped:', e.message)
  }
})

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', appId: req.appId, orgId: req.orgId })
})

// ─── Generic CRUD Helpers ──────────────────────────────────────────────────────
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

// ─── Validation Helpers ────────────────────────────────────────────────────────
function validateScore(value, fieldName) {
  const num = parseFloat(value)
  if (isNaN(num)) return `${fieldName} 必须为数字`
  if (num < 0 || num > 100) return `${fieldName} 必须在 0-100 之间`
  return null
}

function validateRequired(body, fields) {
  const missing = []
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      missing.push(f)
    }
  }
  if (missing.length > 0) return `缺少必填字段: ${missing.join(', ')}`
  return null
}

// ─── Assessment Orgs ───────────────────────────────────────────────────────────
app.get('/api/orgs', (req, res) => listRecords(req, res, 'assessment_orgs'))
app.post('/api/orgs', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  createRecord(req, res, 'assessment_orgs')
})
app.put('/api/orgs/:id', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  updateRecord(req, res, 'assessment_orgs')
})
app.delete('/api/orgs/:id', (req, res) => {
  if (!checkRole(req, res, 'admin')) return
  deleteRecord(req, res, 'assessment_orgs')
})

// ─── Assessment Teachers ───────────────────────────────────────────────────────
app.get('/api/teachers', (req, res) => listRecords(req, res, 'assessment_teachers'))
app.post('/api/teachers', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  createRecord(req, res, 'assessment_teachers')
})
app.put('/api/teachers/:id', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  updateRecord(req, res, 'assessment_teachers')
})
app.delete('/api/teachers/:id', (req, res) => {
  if (!checkRole(req, res, 'admin')) return
  deleteRecord(req, res, 'assessment_teachers')
})

// ─── Positions ─────────────────────────────────────────────────────────────────
app.get('/api/positions', (req, res) => listRecords(req, res, 'positions'))
app.post('/api/positions', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  createRecord(req, res, 'positions')
})
app.put('/api/positions/:id', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  updateRecord(req, res, 'positions')
})
app.delete('/api/positions/:id', (req, res) => {
  if (!checkRole(req, res, 'admin')) return
  deleteRecord(req, res, 'positions')
})

// ─── Time Periods ──────────────────────────────────────────────────────────────
app.get('/api/periods', (req, res) => listRecords(req, res, 'time_periods'))
app.post('/api/periods', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  createRecord(req, res, 'time_periods')
})
app.put('/api/periods/:id', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  updateRecord(req, res, 'time_periods')
})
app.delete('/api/periods/:id', (req, res) => {
  if (!checkRole(req, res, 'admin')) return
  deleteRecord(req, res, 'time_periods')
})

// ─── Weekly Events ─────────────────────────────────────────────────────────────
app.get('/api/weekly-events', (req, res) => listRecords(req, res, 'weekly_events'))
app.post('/api/weekly-events', (req, res) => {
  if (!checkRole(req, res, 'grade_head')) return
  createRecord(req, res, 'weekly_events')
})
app.put('/api/weekly-events/:id', (req, res) => {
  if (!checkRole(req, res, 'grade_head')) return
  updateRecord(req, res, 'weekly_events')
})
app.delete('/api/weekly-events/:id', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  deleteRecord(req, res, 'weekly_events')
})

// ─── Award Categories ──────────────────────────────────────────────────────────
app.get('/api/award-categories', async (req, res) => {
  try {
    const where = {}
    if (req.query.scope) where.scope = req.query.scope
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'award_categories', where,
      limit: parseInt(req.query.limit || '100'),
      offset: 0,
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/award-categories', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  const err = validateRequired(req.body, ['name', 'scope'])
  if (err) return res.status(400).json({ error: err })
  if (!['semester', 'annual'].includes(req.body.scope)) {
    return res.status(400).json({ error: 'scope 必须为 semester 或 annual' })
  }
  createRecord(req, res, 'award_categories')
})

app.put('/api/award-categories/:id', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  updateRecord(req, res, 'award_categories')
})

app.delete('/api/award-categories/:id', (req, res) => {
  if (!checkRole(req, res, 'admin')) return
  deleteRecord(req, res, 'award_categories')
})

// ─── Deduction Categories ──────────────────────────────────────────────────────
app.get('/api/deduction-categories', (req, res) => listRecords(req, res, 'deduction_categories'))
app.post('/api/deduction-categories', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  createRecord(req, res, 'deduction_categories')
})
app.put('/api/deduction-categories/:id', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  updateRecord(req, res, 'deduction_categories')
})
app.delete('/api/deduction-categories/:id', (req, res) => {
  if (!checkRole(req, res, 'admin')) return
  deleteRecord(req, res, 'deduction_categories')
})

// ─── Award Registrations (Enhanced) ───────────────────────────────────────────
app.get('/api/awards', (req, res) => listRecords(req, res, 'award_registrations'))

app.post('/api/awards', async (req, res) => {
  if (!checkRole(req, res, 'teacher')) return
  const body = req.body
  const err = validateRequired(body, ['teacher_id', 'level', 'rank', 'title'])
  if (err) return res.status(400).json({ error: err })

  // Auto-generate level_rank
  const level_rank = (body.level || '') + (body.rank || '')

  try {
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'award_registrations',
      data: {
        teacher_id: parseInt(body.teacher_id),
        level: body.level,
        rank: body.rank,
        title: body.title,
        description: body.description || null,
        attachment_url: body.attachment_url || null,
        status: 'pending',
        workflow_instance_id: null,
        scope: body.scope || null,
        category_id: body.category_id ? parseInt(body.category_id) : null,
        award_date: body.award_date || null,
        certificate_url: body.certificate_url || null,
        level_rank,
        reject_reason: null,
      },
    })
    res.json({
      id: result.id, teacher_id: parseInt(body.teacher_id),
      level: body.level, rank: body.rank, title: body.title,
      level_rank, status: 'pending', scope: body.scope || null,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/awards/:id', (req, res) => updateRecord(req, res, 'award_registrations'))
app.delete('/api/awards/:id', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  deleteRecord(req, res, 'award_registrations')
})

// Approve award
app.post('/api/awards/:id/approve', async (req, res) => {
  if (!checkRole(req, res, 'director')) return
  try {
    const id = parseInt(req.params.id)
    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'award_registrations',
      where: { id }, data: { status: 'approved', reject_reason: null },
    })
    res.json({ success: true, id, status: 'approved' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Reject award
app.post('/api/awards/:id/reject', async (req, res) => {
  if (!checkRole(req, res, 'director')) return
  try {
    const id = parseInt(req.params.id)
    const reason = req.body?.reject_reason || ''
    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'award_registrations',
      where: { id }, data: { status: 'rejected', reject_reason: reason },
    })
    res.json({ success: true, id, status: 'rejected', reject_reason: reason })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Semester Assessments ──────────────────────────────────────────────────────
app.get('/api/semester-assessments', (req, res) => listRecords(req, res, 'semester_assessments'))

app.post('/api/semester-assessments', async (req, res) => {
  if (!checkRole(req, res, 'director')) return
  const body = req.body
  const err = validateRequired(body, ['teacher_id', 'period_id'])
  if (err) return res.status(400).json({ error: err })

  try {
    // Create the assessment record
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'semester_assessments',
      data: {
        teacher_id: parseInt(body.teacher_id),
        period_id: parseInt(body.period_id),
        teaching_standard_score: 0,
        teaching_activity_score: 0,
        self_score: null,
        review_score: null,
      },
    })
    const assessmentId = result.id

    // Create pre-set items: teaching_standard
    const standardItems = [
      { category: 'teaching_standard', item_name: '成长手册', max_score: 90 },
      { category: 'teaching_standard', item_name: '听课记录', max_score: 10 },
    ]
    for (const item of standardItems) {
      await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'semester_assessment_items',
        data: {
          assessment_id: assessmentId,
          category: item.category,
          item_name: item.item_name,
          max_score: item.max_score,
          self_score: null,
          review_score: null,
          award_ids: null,
        },
      })
    }

    // Auto-pull semester-scope award categories as teaching_activity items
    const awardCats = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'award_categories',
      where: { scope: 'semester' }, limit: 100,
    })
    if (awardCats.rows) {
      for (const cat of awardCats.rows) {
        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'semester_assessment_items',
          data: {
            assessment_id: assessmentId,
            category: 'teaching_activity',
            item_name: cat.name,
            max_score: 10,
            self_score: null,
            review_score: null,
            award_ids: JSON.stringify([cat.id]),
          },
        })
      }
    }

    res.json({ id: assessmentId, teacher_id: parseInt(body.teacher_id), period_id: parseInt(body.period_id) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/semester-assessments/:id', (req, res) => updateRecord(req, res, 'semester_assessments'))
app.delete('/api/semester-assessments/:id', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  deleteRecord(req, res, 'semester_assessments')
})

// Get semester assessment items
app.get('/api/semester-assessments/:id/items', async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.id)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'semester_assessment_items',
      where: { assessment_id: assessmentId },
      limit: 100,
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Update a single semester assessment item
app.put('/api/semester-assessments/:id/items/:itemId', async (req, res) => {
  if (!checkRole(req, res, 'director')) return
  try {
    const itemId = parseInt(req.params.itemId)
    const data = {}
    const body = req.body

    if (body.self_score !== undefined) {
      const err = validateScore(body.self_score, '自评分')
      if (err) return res.status(400).json({ error: err })
      data.self_score = parseFloat(body.self_score)
    }
    if (body.review_score !== undefined) {
      const err = validateScore(body.review_score, '考评分')
      if (err) return res.status(400).json({ error: err })
      data.review_score = parseFloat(body.review_score)
    }

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'semester_assessment_items',
      where: { id: itemId }, data,
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Calculate semester assessment totals
app.post('/api/semester-assessments/:id/calculate', async (req, res) => {
  if (!checkRole(req, res, 'director')) return
  try {
    const assessmentId = parseInt(req.params.id)

    // Get all items
    const items = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'semester_assessment_items',
      where: { assessment_id: assessmentId }, limit: 100,
    })

    let selfTotal = 0
    let reviewTotal = 0
    if (items.rows) {
      for (const item of items.rows) {
        selfTotal += parseFloat(item.self_score || 0)
        reviewTotal += parseFloat(item.review_score || 0)
      }
    }

    // Calculate category subtotals
    let standardSelf = 0, standardReview = 0, activitySelf = 0, activityReview = 0
    if (items.rows) {
      for (const item of items.rows) {
        if (item.category === 'teaching_standard') {
          standardSelf += parseFloat(item.self_score || 0)
          standardReview += parseFloat(item.review_score || 0)
        } else if (item.category === 'teaching_activity') {
          activitySelf += parseFloat(item.self_score || 0)
          activityReview += parseFloat(item.review_score || 0)
        }
      }
    }

    // Update the assessment record
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'semester_assessments',
      where: { id: assessmentId },
      data: {
        teaching_standard_score: standardReview,
        teaching_activity_score: activityReview,
        self_score: selfTotal,
        review_score: reviewTotal,
      },
    })

    res.json({
      success: true,
      self_total: selfTotal,
      review_total: reviewTotal,
      teaching_standard: { self: standardSelf, review: standardReview },
      teaching_activity: { self: activitySelf, review: activityReview },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Annual Assessments ────────────────────────────────────────────────────────
app.get('/api/annual-assessments', (req, res) => listRecords(req, res, 'annual_assessments'))

app.post('/api/annual-assessments', async (req, res) => {
  if (!checkRole(req, res, 'director')) return
  const body = req.body
  const err = validateRequired(body, ['teacher_id', 'period_id'])
  if (err) return res.status(400).json({ error: err })

  // Validate basic score limits
  const de = parseFloat(body.de_score || 0)
  const neng = parseFloat(body.neng_score || 0)
  const qin = parseFloat(body.qin_score || 0)
  const ji = parseFloat(body.ji_score || 0)
  if (de > 30) return res.status(400).json({ error: '德 不能超过 30 分' })
  if (neng > 20) return res.status(400).json({ error: '能 不能超过 20 分' })
  if (qin > 20) return res.status(400).json({ error: '勤 不能超过 20 分' })
  if (ji > 30) return res.status(400).json({ error: '绩 不能超过 30 分' })

  try {
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'annual_assessments',
      data: {
        teacher_id: parseInt(body.teacher_id),
        period_id: parseInt(body.period_id),
        de_score: de, neng_score: neng, qin_score: qin, ji_score: ji,
        bonus_score: 0, deduction_score: 0, total_score: 0,
        self_comment: body.self_comment || null,
        review_comment: body.review_comment || null,
        self_total: null, review_total: null,
      },
    })
    const assessmentId = result.id

    // Create basic items (德能勤绩)
    const basicItems = [
      { category: 'basic', item_name: '德', max_score: 30, self_score: de, review_score: de },
      { category: 'basic', item_name: '能', max_score: 20, self_score: neng, review_score: neng },
      { category: 'basic', item_name: '勤', max_score: 20, self_score: qin, review_score: qin },
      { category: 'basic', item_name: '绩', max_score: 30, self_score: ji, review_score: ji },
    ]
    for (const item of basicItems) {
      await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'annual_assessment_items',
        data: {
          assessment_id: assessmentId, category: item.category,
          item_name: item.item_name, max_score: item.max_score,
          self_score: item.self_score, review_score: item.review_score,
          evidence_url: null,
        },
      })
    }

    // Auto-pull annual-scope award categories as bonus items
    const awardCats = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'award_categories',
      where: { scope: 'annual' }, limit: 100,
    })
    if (awardCats.rows) {
      for (const cat of awardCats.rows) {
        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'annual_assessment_items',
          data: {
            assessment_id: assessmentId, category: 'bonus',
            item_name: cat.name, max_score: null,
            self_score: 0, review_score: 0, evidence_url: null,
          },
        })
      }
    }

    // Pre-set 10 deduction categories
    const deductions = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'deduction_categories', where: {}, limit: 100,
    })
    if (deductions.rows) {
      for (const cat of deductions.rows) {
        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'annual_assessment_items',
          data: {
            assessment_id: assessmentId, category: 'deduction',
            item_name: cat.name, max_score: null,
            self_score: 0, review_score: 0, evidence_url: null,
          },
        })
      }
    }

    res.json({ id: assessmentId, teacher_id: parseInt(body.teacher_id), period_id: parseInt(body.period_id) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/annual-assessments/:id', (req, res) => updateRecord(req, res, 'annual_assessments'))
app.delete('/api/annual-assessments/:id', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  deleteRecord(req, res, 'annual_assessments')
})

// Get annual assessment items
app.get('/api/annual-assessments/:id/items', async (req, res) => {
  try {
    const assessmentId = parseInt(req.params.id)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'annual_assessment_items',
      where: { assessment_id: assessmentId }, limit: 100,
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Update a single annual assessment item
app.put('/api/annual-assessments/:id/items/:itemId', async (req, res) => {
  if (!checkRole(req, res, 'director')) return
  try {
    const itemId = parseInt(req.params.itemId)
    const data = {}
    const body = req.body

    if (body.self_score !== undefined) {
      const err = validateScore(body.self_score, '自评分')
      if (err) return res.status(400).json({ error: err })
      data.self_score = parseFloat(body.self_score)
    }
    if (body.review_score !== undefined) {
      const err = validateScore(body.review_score, '考评分')
      if (err) return res.status(400).json({ error: err })
      data.review_score = parseFloat(body.review_score)
    }
    if (body.evidence_url !== undefined) {
      data.evidence_url = body.evidence_url
    }

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'annual_assessment_items',
      where: { id: itemId }, data,
    })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Calculate annual assessment totals
app.post('/api/annual-assessments/:id/calculate', async (req, res) => {
  if (!checkRole(req, res, 'director')) return
  try {
    const assessmentId = parseInt(req.params.id)

    // Get all items
    const items = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'annual_assessment_items',
      where: { assessment_id: assessmentId }, limit: 100,
    })

    let basicSelf = 0, basicReview = 0
    let bonusSelf = 0, bonusReview = 0
    let deductionSelf = 0, deductionReview = 0

    if (items.rows) {
      for (const item of items.rows) {
        const s = parseFloat(item.self_score || 0)
        const r = parseFloat(item.review_score || 0)
        if (item.category === 'basic') {
          basicSelf += s
          basicReview += r
        } else if (item.category === 'bonus') {
          bonusSelf += s
          bonusReview += r
        } else if (item.category === 'deduction') {
          deductionSelf += s
          deductionReview += r
        }
      }
    }

    const selfTotal = basicSelf + bonusSelf - deductionSelf
    const reviewTotal = basicReview + bonusReview - deductionReview

    // Update the assessment record
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'annual_assessments',
      where: { id: assessmentId },
      data: {
        bonus_score: bonusReview,
        deduction_score: deductionReview,
        total_score: reviewTotal,
        self_total: selfTotal,
        review_total: reviewTotal,
      },
    })

    res.json({
      success: true,
      self_total: selfTotal,
      review_total: reviewTotal,
      basic: { self: basicSelf, review: basicReview },
      bonus: { self: bonusSelf, review: bonusReview },
      deduction: { self: deductionSelf, review: deductionReview },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Statistics ────────────────────────────────────────────────────────────────
app.get('/api/stats/semester', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'semester_assessments', where: {}, limit: 1000,
    })
    const rows = result.rows || []
    const count = rows.length
    let sumSelf = 0, sumReview = 0
    const ranges = { '0-60': 0, '60-70': 0, '70-80': 0, '80-90': 0, '90-100': 0 }

    for (const r of rows) {
      const review = parseFloat(r.review_score || 0)
      const self = parseFloat(r.self_score || 0)
      sumSelf += self
      sumReview += review
      if (review >= 90) ranges['90-100']++
      else if (review >= 80) ranges['80-90']++
      else if (review >= 70) ranges['70-80']++
      else if (review >= 60) ranges['60-70']++
      else ranges['0-60']++
    }

    res.json({
      count,
      avg_self: count > 0 ? (sumSelf / count).toFixed(1) : 0,
      avg_review: count > 0 ? (sumReview / count).toFixed(1) : 0,
      distribution: ranges,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/stats/annual', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'annual_assessments', where: {}, limit: 1000,
    })
    const rows = result.rows || []
    const count = rows.length
    let sumSelf = 0, sumReview = 0
    const ranges = { '0-60': 0, '60-70': 0, '70-80': 0, '80-90': 0, '90-100': 0 }

    for (const r of rows) {
      const review = parseFloat(r.review_total || r.total_score || 0)
      const self = parseFloat(r.self_total || 0)
      sumSelf += self
      sumReview += review
      if (review >= 90) ranges['90-100']++
      else if (review >= 80) ranges['80-90']++
      else if (review >= 70) ranges['70-80']++
      else if (review >= 60) ranges['60-70']++
      else ranges['0-60']++
    }

    res.json({
      count,
      avg_self: count > 0 ? (sumSelf / count).toFixed(1) : 0,
      avg_review: count > 0 ? (sumReview / count).toFixed(1) : 0,
      distribution: ranges,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Ranking ───────────────────────────────────────────────────────────────────
app.get('/api/ranking/annual', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'annual_assessments', where: {},
      orderBy: 'total_score DESC', limit: 100,
    })
    const rows = result.rows || []
    const ranking = rows.map((r, i) => ({
      rank: i + 1,
      teacher_id: r.teacher_id,
      total_score: parseFloat(r.total_score || 0),
      self_total: parseFloat(r.self_total || 0),
      review_total: parseFloat(r.review_total || 0),
      de_score: parseFloat(r.de_score || 0),
      neng_score: parseFloat(r.neng_score || 0),
      qin_score: parseFloat(r.qin_score || 0),
      ji_score: parseFloat(r.ji_score || 0),
    }))
    res.json({ rows: ranking })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Assessment Scopes ─────────────────────────────────────────────────────────
app.get('/api/scopes', (req, res) => listRecords(req, res, 'assessment_scopes'))
app.post('/api/scopes', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  createRecord(req, res, 'assessment_scopes')
})
app.put('/api/scopes/:id', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  updateRecord(req, res, 'assessment_scopes')
})
app.delete('/api/scopes/:id', (req, res) => {
  if (!checkRole(req, res, 'admin')) return
  deleteRecord(req, res, 'assessment_scopes')
})

// ─── Duty Assignments ──────────────────────────────────────────────────────────
app.get('/api/duty-assignments', (req, res) => listRecords(req, res, 'duty_assignments'))
app.post('/api/duty-assignments', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  createRecord(req, res, 'duty_assignments')
})
app.put('/api/duty-assignments/:id', (req, res) => {
  if (!checkRole(req, res, 'director')) return
  updateRecord(req, res, 'duty_assignments')
})
app.delete('/api/duty-assignments/:id', (req, res) => {
  if (!checkRole(req, res, 'admin')) return
  deleteRecord(req, res, 'duty_assignments')
})

app.start()
