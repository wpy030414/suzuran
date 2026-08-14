import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'teacher-evaluation', port: 8085 })

const frontendDist = join(__dirname, 'frontend', 'dist')

// ─── Static file serving ───────────────────────────────────────────────────────

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

// ─── Schema ────────────────────────────────────────────────────────────────────

const TABLES = {
  evaluation_groups: [
    { name: 'name', type: 'text' },
    { name: 'evaluation_type', type: 'text' },   // 'peer' | 'global'
    { name: 'evaluator_ids', type: 'jsonb' },     // who can evaluate (global: specific reviewers)
    { name: 'evaluatee_ids', type: 'jsonb' },     // who is evaluated (peer: group members)
  ],
  activities: [
    { name: 'name', type: 'text' },
    { name: 'start_date', type: 'date' },
    { name: 'end_date', type: 'date' },
    { name: 'status', type: 'text' },             // 'active' | 'completed'
  ],
  indicator_sets: [
    { name: 'perspective', type: 'text' },
    { name: 'indicators', type: 'jsonb' },
  ],
  evaluation_assignments: [
    { name: 'activity_id', type: 'integer' },
    { name: 'group_id', type: 'integer' },
    { name: 'evaluator_id', type: 'integer' },
    { name: 'evaluatee_id', type: 'integer' },
    { name: 'perspective', type: 'text' },
    { name: 'activity_title', type: 'text' },
    { name: 'status', type: 'text' },
  ],
  evaluation_scores: [
    { name: 'assignment_id', type: 'integer' },
    { name: 'indicator_code', type: 'text' },
    { name: 'score', type: 'numeric' },
    { name: 'comment', type: 'text', nullable: true },
  ],
  evaluation_results: [
    { name: 'activity_id', type: 'integer' },
    { name: 'evaluatee_id', type: 'integer' },
    { name: 'perspective', type: 'text' },
    { name: 'total_score', type: 'numeric' },
    { name: 'dimension_scores', type: 'jsonb' },
    { name: 'evaluator_count', type: 'integer' },
  ],
}

// ─── Seed data ─────────────────────────────────────────────────────────────────

const SEED_INDICATOR_SETS = [
  {
    perspective: 'peer',
    indicators: [
      { code: 'B1', name: '工作量', max: 3 },
      { code: 'B2', name: '职业道德', max: 4 },
      { code: 'B3', name: '德育工作', max: 7 },
      { code: 'B5', name: '教学常规', max: 8 },
      { code: 'B6', name: '专业发展', max: 3 },
      { code: 'B7', name: '教学效果', max: 1 },
      { code: 'B8', name: '育人成效', max: 3 },
    ],
  },
  {
    perspective: 'group_review',
    indicators: [
      { code: 'B1', name: '工作量', max: 7 },
      { code: 'B2', name: '职业道德', max: 6 },
      { code: 'B7', name: '教学效果', max: 2 },
      { code: 'B8', name: '育人效果', max: 4 },
      { code: 'B9-B12', name: '工作成效', max: 10 },
    ],
  },
  {
    perspective: 'admin_review',
    indicators: [
      { code: 'B4', name: '班主任工作', max: 3 },
      { code: 'B5-1', name: '教学常规', max: 14 },
      { code: 'B5-2', name: '教学常规', max: 18 },
      { code: 'B6', name: '专业发展', max: 7 },
    ],
  },
]

// ─── Startup: create tables + seed indicator sets ──────────────────────────────

app.onStart(async () => {
  // Create tables
  for (const [tableName, columns] of Object.entries(TABLES)) {
    try {
      await app.mcp.call('data.create_table', { orgId: app.orgId, tableName, columns })
      console.log(`[init] Table '${tableName}' ready`)
    } catch (e) {
      console.log(`[init] Table '${tableName}' already exists`)
    }
  }

  // Seed indicator sets if empty
  try {
    const existing = await app.mcp.call('data.query', {
      orgId: app.orgId, tableName: 'indicator_sets', where: {}, limit: 1,
    })
    if (!existing.rows || existing.rows.length === 0) {
      for (const seed of SEED_INDICATOR_SETS) {
        await app.mcp.call('data.insert', {
          orgId: app.orgId, tableName: 'indicator_sets',
          data: { perspective: seed.perspective, indicators: JSON.stringify(seed.indicators) },
        })
      }
      console.log('[init] Seeded 3 indicator sets')
    } else {
      console.log('[init] Indicator sets already seeded')
    }
  } catch (e) {
    console.log('[init] Seed check failed:', e.message)
  }
})

// ─── Permission middleware ──────────────────────────────────────────────────────

const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  GROUP_MEMBER: '考核组成员',
  DEPT_STAFF: '政教处/教导处',
  PRINCIPAL: '校长',
}

function getRole(req) {
  return req.headers['x-user-role'] || ROLES.TEACHER
}

function withRole(allowedRoles, handler) {
  return async (req, res) => {
    const role = getRole(req)
    if (role !== ROLES.ADMIN && !allowedRoles.includes(role)) {
      return res.status(403).json({ error: '权限不足，无法执行此操作' })
    }
    req.userRole = role
    return handler(req, res)
  }
}

// ─── Helper: generic CRUD ──────────────────────────────────────────────────────

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

// ─── Helper: load indicator sets into a map ────────────────────────────────────

async function loadIndicatorMap(orgId) {
  const sets = await app.mcp.call('data.query', {
    orgId, tableName: 'indicator_sets', where: {}, limit: 10,
  })
  const map = {}
  for (const row of (sets.rows || [])) {
    const indicators = typeof row.indicators === 'string' ? JSON.parse(row.indicators) : row.indicators
    map[row.perspective] = indicators
  }
  return map
}

// ─── Helper: fetch all rows with pagination ────────────────────────────────────

async function fetchAllRows(orgId, tableName, where = {}) {
  const rows = []
  let offset = 0
  const pageSize = 100
  while (true) {
    const result = await app.mcp.call('data.query', {
      orgId, tableName, where, limit: pageSize, offset,
    })
    const batch = result.rows || []
    rows.push(...batch)
    if (batch.length < pageSize) break
    offset += pageSize
  }
  return rows
}

// ─── Routes: Groups ────────────────────────────────────────────────────────────

app.get('/api/groups', (req, res) => listRecords(req, res, 'evaluation_groups'))
app.post('/api/groups', withRole([ROLES.ADMIN], (req, res) => createRecord(req, res, 'evaluation_groups')))
app.put('/api/groups/:id', withRole([ROLES.ADMIN], (req, res) => updateRecord(req, res, 'evaluation_groups')))
app.delete('/api/groups/:id', withRole([ROLES.ADMIN], (req, res) => deleteRecord(req, res, 'evaluation_groups')))

// ─── Routes: Activities ────────────────────────────────────────────────────────

app.get('/api/activities', (req, res) => listRecords(req, res, 'activities'))
app.post('/api/activities', withRole([ROLES.ADMIN], (req, res) => createRecord(req, res, 'activities')))
app.put('/api/activities/:id', withRole([ROLES.ADMIN], (req, res) => updateRecord(req, res, 'activities')))
app.delete('/api/activities/:id', withRole([ROLES.ADMIN], (req, res) => deleteRecord(req, res, 'activities')))

// ─── Routes: Indicator Sets ────────────────────────────────────────────────────

app.get('/api/indicator-sets', (req, res) => listRecords(req, res, 'indicator_sets'))

app.get('/api/indicator-sets/by-perspective', async (req, res) => {
  try {
    const perspective = req.query.perspective
    if (!perspective) return res.status(400).json({ error: '缺少 perspective 参数' })
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'indicator_sets', where: { perspective }, limit: 1,
    })
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '未找到该视角的指标集' })
    }
    const row = result.rows[0]
    const indicators = typeof row.indicators === 'string' ? JSON.parse(row.indicators) : row.indicators
    res.json({ id: row.id, perspective: row.perspective, indicators })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/indicator-sets', withRole([ROLES.ADMIN], (req, res) => createRecord(req, res, 'indicator_sets')))
app.put('/api/indicator-sets/:id', withRole([ROLES.ADMIN], (req, res) => updateRecord(req, res, 'indicator_sets')))
app.delete('/api/indicator-sets/:id', withRole([ROLES.ADMIN], (req, res) => deleteRecord(req, res, 'indicator_sets')))

// ─── Routes: Assignments ───────────────────────────────────────────────────────

app.get('/api/assignments', (req, res) => listRecords(req, res, 'evaluation_assignments'))

app.post('/api/assignments', async (req, res) => {
  try {
    const { evaluator_id, evaluatee_id, perspective, activity_id, group_id } = req.body

    // Auto-detect group if not provided
    let resolvedGroupId = group_id
    if (!resolvedGroupId) {
      const groups = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'evaluation_groups', where: {}, limit: 100,
      })
      for (const g of (groups.rows || [])) {
        const evaluatorIds = typeof g.evaluator_ids === 'string' ? JSON.parse(g.evaluator_ids) : (g.evaluator_ids || [])
        const evaluateeIds = typeof g.evaluatee_ids === 'string' ? JSON.parse(g.evaluatee_ids) : (g.evaluatee_ids || [])
        if (evaluatorIds.includes(evaluator_id) || evaluateeIds.includes(evaluator_id)) {
          if (g.evaluation_type === 'peer' || g.evaluation_type === perspective) {
            resolvedGroupId = g.id
            break
          }
        }
      }
    }

    // Look up activity title for redundancy
    let activityTitle = req.body.activity_title || ''
    if (!activityTitle && activity_id) {
      const actResult = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'activities', where: { id: parseInt(activity_id) }, limit: 1,
      })
      if (actResult.rows && actResult.rows.length > 0) {
        activityTitle = actResult.rows[0].name
      }
    }

    const data = {
      activity_id: parseInt(activity_id),
      group_id: resolvedGroupId ? parseInt(resolvedGroupId) : null,
      evaluator_id: parseInt(evaluator_id),
      evaluatee_id: parseInt(evaluatee_id),
      perspective,
      activity_title: activityTitle,
      status: req.body.status || 'pending',
    }

    const result = await app.mcp.call('data.insert', { orgId: req.orgId, tableName: 'evaluation_assignments', data })
    res.json({ id: result.id, ...data, suggested_group_id: resolvedGroupId })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/assignments/:id', (req, res) => updateRecord(req, res, 'evaluation_assignments'))
app.delete('/api/assignments/:id', (req, res) => deleteRecord(req, res, 'evaluation_assignments'))

// ─── Routes: My Groups ─────────────────────────────────────────────────────────

app.get('/api/my-groups', async (req, res) => {
  try {
    const evaluatorId = parseInt(req.query.evaluator_id)
    if (!evaluatorId) return res.status(400).json({ error: '缺少 evaluator_id 参数' })

    const groups = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_groups', where: {}, limit: 100,
    })

    const myGroups = []
    for (const g of (groups.rows || [])) {
      const evaluatorIds = typeof g.evaluator_ids === 'string' ? JSON.parse(g.evaluator_ids) : (g.evaluator_ids || [])
      const evaluateeIds = typeof g.evaluatee_ids === 'string' ? JSON.parse(g.evaluatee_ids) : (g.evaluatee_ids || [])
      const isEvaluator = evaluatorIds.includes(evaluatorId)
      const isEvaluatee = evaluateeIds.includes(evaluatorId)
      if (isEvaluator || isEvaluatee) {
        myGroups.push({
          id: g.id,
          name: g.name,
          evaluation_type: g.evaluation_type,
          role: isEvaluator && isEvaluatee ? 'both' : isEvaluator ? 'evaluator' : 'evaluatee',
          evaluator_ids: evaluatorIds,
          evaluatee_ids: evaluateeIds,
        })
      }
    }
    res.json({ groups: myGroups })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Routes: Scores ────────────────────────────────────────────────────────────

app.get('/api/scores', (req, res) => listRecords(req, res, 'evaluation_scores'))

app.post('/api/scores', async (req, res) => {
  try {
    const { assignment_id, indicator_code, score, comment } = req.body
    const numericScore = parseFloat(score)

    // Validate assignment exists and is pending
    const assignResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_assignments',
      where: { id: parseInt(assignment_id) }, limit: 1,
    })
    if (!assignResult.rows || assignResult.rows.length === 0) {
      return res.status(404).json({ error: '评价分配不存在' })
    }
    const assignment = assignResult.rows[0]
    if (assignment.status === 'completed') {
      return res.status(400).json({ error: '该评价已完成，无法继续打分' })
    }

    // Validate score against indicator max
    const indicatorMap = await loadIndicatorMap(req.orgId)
    const perspective = assignment.perspective
    const indicators = indicatorMap[perspective]
    if (!indicators) {
      return res.status(400).json({ error: `未找到视角 ${perspective} 的指标集` })
    }
    const indicator = indicators.find(i => i.code === indicator_code)
    if (!indicator) {
      return res.status(400).json({ error: `指标 ${indicator_code} 不属于视角 ${perspective}` })
    }
    if (numericScore < 0 || numericScore > indicator.max) {
      return res.status(400).json({
        error: `分数必须在 0 到 ${indicator.max} 之间（指标 ${indicator_code} ${indicator.name}）`,
      })
    }

    // Check for existing score (upsert)
    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_scores',
      where: { assignment_id: parseInt(assignment_id), indicator_code }, limit: 1,
    })

    if (existing.rows && existing.rows.length > 0) {
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'evaluation_scores',
        where: { id: existing.rows[0].id },
        data: { score: numericScore, comment: comment || '' },
      })
      res.json({ id: existing.rows[0].id, assignment_id, indicator_code, score: numericScore, comment })
    } else {
      const data = {
        assignment_id: parseInt(assignment_id),
        indicator_code,
        score: numericScore,
        comment: comment || '',
      }
      const result = await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'evaluation_scores', data,
      })
      res.json({ id: result.id, ...data })
    }
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Batch score submission: submit all indicators for an assignment at once
app.post('/api/scores/batch', async (req, res) => {
  try {
    const { assignment_id, scores } = req.body  // scores: [{indicator_code, score, comment}]

    // Validate assignment
    const assignResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_assignments',
      where: { id: parseInt(assignment_id) }, limit: 1,
    })
    if (!assignResult.rows || assignResult.rows.length === 0) {
      return res.status(404).json({ error: '评价分配不存在' })
    }
    const assignment = assignResult.rows[0]
    if (assignment.status === 'completed') {
      return res.status(400).json({ error: '该评价已完成，无法继续打分' })
    }

    // Validate all scores
    const indicatorMap = await loadIndicatorMap(req.orgId)
    const indicators = indicatorMap[assignment.perspective]
    if (!indicators) {
      return res.status(400).json({ error: `未找到视角 ${assignment.perspective} 的指标集` })
    }

    for (const s of scores) {
      const indicator = indicators.find(i => i.code === s.indicator_code)
      if (!indicator) {
        return res.status(400).json({ error: `指标 ${s.indicator_code} 不属于视角 ${assignment.perspective}` })
      }
      const numericScore = parseFloat(s.score)
      if (numericScore < 0 || numericScore > indicator.max) {
        return res.status(400).json({
          error: `分数必须在 0 到 ${indicator.max} 之间（指标 ${s.indicator_code} ${indicator.name}）`,
        })
      }
    }

    // Save scores (upsert each)
    const saved = []
    for (const s of scores) {
      const numericScore = parseFloat(s.score)
      const existing = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'evaluation_scores',
        where: { assignment_id: parseInt(assignment_id), indicator_code: s.indicator_code }, limit: 1,
      })
      if (existing.rows && existing.rows.length > 0) {
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'evaluation_scores',
          where: { id: existing.rows[0].id },
          data: { score: numericScore, comment: s.comment || '' },
        })
        saved.push({ id: existing.rows[0].id, assignment_id, indicator_code: s.indicator_code, score: numericScore })
      } else {
        const result = await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'evaluation_scores',
          data: { assignment_id: parseInt(assignment_id), indicator_code: s.indicator_code, score: numericScore, comment: s.comment || '' },
        })
        saved.push({ id: result.id, assignment_id, indicator_code: s.indicator_code, score: numericScore })
      }
    }

    // Mark assignment as completed
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'evaluation_assignments',
      where: { id: parseInt(assignment_id) },
      data: { status: 'completed' },
    })

    res.json({ success: true, scores: saved })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/scores/:id', (req, res) => updateRecord(req, res, 'evaluation_scores'))
app.delete('/api/scores/:id', (req, res) => deleteRecord(req, res, 'evaluation_scores'))

// ─── Routes: Results ───────────────────────────────────────────────────────────

app.get('/api/results', (req, res) => listRecords(req, res, 'evaluation_results'))
app.post('/api/results', withRole([ROLES.ADMIN], (req, res) => createRecord(req, res, 'evaluation_results')))
app.put('/api/results/:id', withRole([ROLES.ADMIN], (req, res) => updateRecord(req, res, 'evaluation_results')))
app.delete('/api/results/:id', withRole([ROLES.ADMIN], (req, res) => deleteRecord(req, res, 'evaluation_results')))

// ─── Routes: Results by activity ───────────────────────────────────────────────

app.get('/api/results/by-activity', async (req, res) => {
  try {
    const activityId = parseInt(req.query.activity_id)
    if (!activityId) return res.status(400).json({ error: '缺少 activity_id 参数' })

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_results',
      where: { activity_id: activityId }, limit: 500,
    })

    const rows = (result.rows || []).map(r => {
      const dims = typeof r.dimension_scores === 'string' ? JSON.parse(r.dimension_scores) : (r.dimension_scores || {})
      return { ...r, dimension_scores: dims }
    })

    res.json({ results: rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Routes: Results ranking ───────────────────────────────────────────────────

app.get('/api/results/ranking', async (req, res) => {
  try {
    const activityId = parseInt(req.query.activity_id)
    if (!activityId) return res.status(400).json({ error: '缺少 activity_id 参数' })
    const sortBy = req.query.sort || 'total_score'

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_results',
      where: { activity_id: activityId }, limit: 500,
    })

    let rows = (result.rows || []).map(r => {
      const dims = typeof r.dimension_scores === 'string' ? JSON.parse(r.dimension_scores) : (r.dimension_scores || {})
      return { ...r, dimension_scores: dims, total_score: parseFloat(r.total_score) || 0 }
    })

    if (sortBy === 'total_score') {
      rows.sort((a, b) => b.total_score - a.total_score)
    } else if (sortBy === 'evaluatee_id') {
      rows.sort((a, b) => a.evaluatee_id - b.evaluatee_id)
    }

    // Add rank
    rows = rows.map((r, i) => ({ ...r, rank: i + 1 }))

    res.json({ ranking: rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Routes: Results export (CSV) ──────────────────────────────────────────────

app.get('/api/results/export', async (req, res) => {
  try {
    const activityId = parseInt(req.query.activity_id)
    if (!activityId) return res.status(400).json({ error: '缺少 activity_id 参数' })

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_results',
      where: { activity_id: activityId }, limit: 500,
    })

    const rows = (result.rows || []).map(r => {
      const dims = typeof r.dimension_scores === 'string' ? JSON.parse(r.dimension_scores) : (r.dimension_scores || {})
      return { ...r, dimension_scores: dims, total_score: parseFloat(r.total_score) || 0 }
    })

    rows.sort((a, b) => b.total_score - a.total_score)

    // Build CSV
    const headers = ['排名', '被评价人ID', 'B1工作量', 'B2职业道德', 'B3德育工作', 'B4班主任工作', 'B5教学常规', 'B6专业发展', 'B7教学效果', 'B8育人成效', 'B9-B12工作成效', '总分']
    const csvRows = [headers.join(',')]

    rows.forEach((r, i) => {
      const dims = r.dimension_scores || {}
      const csvRow = [
        i + 1,
        r.evaluatee_id,
        (dims.b1 || 0).toFixed(2),
        (dims.b2 || 0).toFixed(2),
        (dims.b3 || 0).toFixed(2),
        (dims.b4 || 0).toFixed(2),
        (dims.b5 || 0).toFixed(2),
        (dims.b6 || 0).toFixed(2),
        (dims.b7 || 0).toFixed(2),
        (dims.b8 || 0).toFixed(2),
        (dims.b9 || 0).toFixed(2),
        r.total_score.toFixed(2),
      ]
      csvRows.push(csvRow.join(','))
    })

    const csvContent = '﻿' + csvRows.join('\r\n')  // UTF-8 BOM for Excel
    res.json({ csv_content: csvContent, row_count: rows.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Routes: Evaluation summary ────────────────────────────────────────────────

app.get('/api/evaluation-summary', async (req, res) => {
  try {
    const evaluatorId = parseInt(req.query.evaluator_id)
    if (!evaluatorId) return res.status(400).json({ error: '缺少 evaluator_id 参数' })

    const assignments = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_assignments',
      where: { evaluator_id: evaluatorId }, limit: 500,
    })

    const rows = assignments.rows || []
    const total = rows.length
    const completed = rows.filter(r => r.status === 'completed').length
    const pending = rows.filter(r => r.status === 'pending').length

    // Group by activity
    const byActivity = {}
    for (const r of rows) {
      const key = r.activity_title || `活动#${r.activity_id}`
      if (!byActivity[key]) byActivity[key] = { total: 0, completed: 0, pending: 0 }
      byActivity[key].total++
      if (r.status === 'completed') byActivity[key].completed++
      else byActivity[key].pending++
    }

    // Group by perspective
    const byPerspective = {}
    for (const r of rows) {
      if (!byPerspective[r.perspective]) byPerspective[r.perspective] = { total: 0, completed: 0, pending: 0 }
      byPerspective[r.perspective].total++
      if (r.status === 'completed') byPerspective[r.perspective].completed++
      else byPerspective[r.perspective].pending++
    }

    res.json({
      evaluator_id: evaluatorId,
      total_assignments: total,
      completed,
      pending,
      by_activity: byActivity,
      by_perspective: byPerspective,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Routes: Activity progress ─────────────────────────────────────────────────

app.get('/api/activities/:id/progress', async (req, res) => {
  try {
    const activityId = parseInt(req.params.id)

    const assignments = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_assignments',
      where: { activity_id: activityId }, limit: 1000,
    })

    const rows = assignments.rows || []
    const total = rows.length
    const completed = rows.filter(r => r.status === 'completed').length
    const pending = total - completed

    // By perspective
    const perspectives = {}
    for (const r of rows) {
      const p = r.perspective
      if (!perspectives[p]) perspectives[p] = { total: 0, completed: 0 }
      perspectives[p].total++
      if (r.status === 'completed') perspectives[p].completed++
    }

    res.json({
      activity_id: activityId,
      total_assignments: total,
      completed,
      pending,
      progress_percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      by_perspective: perspectives,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── Routes: Aggregate (ENHANCED) ──────────────────────────────────────────────

app.post('/api/activities/:id/aggregate', async (req, res) => {
  try {
    const activityId = parseInt(req.params.id)

    // Fetch all completed assignments for this activity
    const assignments = await fetchAllRows(req.orgId, 'evaluation_assignments', {
      activity_id: activityId, status: 'completed',
    })

    if (assignments.length === 0) {
      return res.json({ success: true, count: 0, message: '没有已完成的评价分配' })
    }

    // Fetch all scores
    const allScores = await fetchAllRows(req.orgId, 'evaluation_scores', {})

    // Build score map: assignment_id -> [{indicator_code, score}]
    const scoreMap = {}
    for (const score of allScores) {
      if (!scoreMap[score.assignment_id]) scoreMap[score.assignment_id] = []
      scoreMap[score.assignment_id].push({
        indicator_code: score.indicator_code,
        score: parseFloat(score.score) || 0,
      })
    }

    // Group by evaluatee and perspective, collecting per-evaluator scores
    // Structure: evaluateeId -> perspective -> [ {evaluatorId, scores: {code: value}} ]
    const grouped = {}
    for (const assignment of assignments) {
      const key = `${assignment.evaluatee_id}_${assignment.perspective}`
      if (!grouped[key]) {
        grouped[key] = {
          activity_id: activityId,
          evaluatee_id: assignment.evaluatee_id,
          perspective: assignment.perspective,
          evaluators: [],
        }
      }
      const scores = scoreMap[assignment.id] || []
      const scoreObj = {}
      for (const s of scores) {
        scoreObj[s.indicator_code] = s.score
      }
      grouped[key].evaluators.push({
        evaluator_id: assignment.evaluator_id,
        scores: scoreObj,
      })
    }

    // Calculate per-perspective aggregated scores per evaluatee
    // Structure: evaluateeId -> {perspective -> {code: value}}
    const perspectiveResults = {}

    for (const [key, data] of Object.entries(grouped)) {
      const eid = data.evaluatee_id
      const persp = data.perspective
      if (!perspectiveResults[eid]) perspectiveResults[eid] = {}

      if (persp === 'peer') {
        // Average each dimension across all peer evaluators
        const count = data.evaluators.length
        const avgScores = {}
        for (const ev of data.evaluators) {
          for (const [code, score] of Object.entries(ev.scores)) {
            avgScores[code] = (avgScores[code] || 0) + score
          }
        }
        for (const code of Object.keys(avgScores)) {
          avgScores[code] = avgScores[code] / count
        }
        perspectiveResults[eid][persp] = { scores: avgScores, count }
      } else {
        // group_review & admin_review: sum dimensions across evaluators
        const sumScores = {}
        for (const ev of data.evaluators) {
          for (const [code, score] of Object.entries(ev.scores)) {
            sumScores[code] = (sumScores[code] || 0) + score
          }
        }
        perspectiveResults[eid][persp] = { scores: sumScores, count: data.evaluators.length }
      }
    }

    // Map to unified b1-b9 dimensions
    const finalResults = []
    for (const [eidStr, perspectives] of Object.entries(perspectiveResults)) {
      const eid = parseInt(eidStr)
      const peer = perspectives.peer?.scores || {}
      const group = perspectives.group_review?.scores || {}
      const admin = perspectives.admin_review?.scores || {}

      const dims = {
        b1: (peer.B1 || 0) + (group.B1 || 0),
        b2: (peer.B2 || 0) + (group.B2 || 0),
        b3: peer.B3 || 0,
        b4: admin.B4 || 0,
        b5: (peer.B5 || 0) + (admin['B5-1'] || 0) + (admin['B5-2'] || 0),
        b6: (peer.B6 || 0) + (admin.B6 || 0),
        b7: (peer.B7 || 0) + (group.B7 || 0),
        b8: (peer.B8 || 0) + (group.B8 || 0),
        b9: group['B9-B12'] || 0,
      }

      // Round to 2 decimal places
      for (const k of Object.keys(dims)) {
        dims[k] = Math.round(dims[k] * 100) / 100
      }

      const totalScore = Math.round(
        (dims.b1 + dims.b2 + dims.b3 + dims.b4 + dims.b5 + dims.b6 + dims.b7 + dims.b8 + dims.b9) * 100
      ) / 100

      // Count total evaluators across all perspectives
      const evaluatorCount =
        (perspectives.peer?.count || 0) +
        (perspectives.group_review?.count || 0) +
        (perspectives.admin_review?.count || 0)

      finalResults.push({
        activity_id: activityId,
        evaluatee_id: eid,
        perspective: 'unified',
        total_score: totalScore,
        dimension_scores: dims,
        evaluator_count: evaluatorCount,
      })
    }

    // Delete old results for this activity, then save new ones
    const oldResults = await fetchAllRows(req.orgId, 'evaluation_results', { activity_id: activityId })
    for (const old of oldResults) {
      await app.mcp.call('data.delete', {
        orgId: req.orgId, tableName: 'evaluation_results', where: { id: old.id },
      })
    }

    for (const result of finalResults) {
      await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'evaluation_results',
        data: {
          activity_id: result.activity_id,
          evaluatee_id: result.evaluatee_id,
          perspective: result.perspective,
          total_score: result.total_score,
          dimension_scores: JSON.stringify(result.dimension_scores),
          evaluator_count: result.evaluator_count,
        },
      })
    }

    res.json({ success: true, count: finalResults.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
