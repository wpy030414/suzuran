import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'psychological-testing', port: 8094 })

const frontendDist = join(__dirname, 'frontend', 'dist')

// ─── 静态文件服务 ───────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════
// 数据表定义
// ═══════════════════════════════════════════════════════════
const TABLES = {
  questionnaires: [
    { name: 'title', type: 'text' },
    { name: 'description', type: 'text' },
    { name: 'questions', type: 'jsonb' },
    { name: 'scoring_rules', type: 'jsonb' },
    { name: 'status', type: 'text' },
    { name: 'dimension_tags', type: 'jsonb', nullable: true },
    { name: 'question_groups', type: 'jsonb', nullable: true },
    { name: 'blind_mode', type: 'boolean', default: true },
    { name: 'total_students', type: 'integer', default: 0 },
    { name: 'created_by', type: 'integer', nullable: true }
  ],
  questionnaire_dimensions: [
    { name: 'questionnaire_id', type: 'integer' },
    { name: 'dimension_name', type: 'text' },
    { name: 'question_ids', type: 'jsonb' },
    { name: 'direction', type: 'text' }
  ],
  cursor: [
    { name: 'singleton_key', type: 'text' },
    { name: 'value', type: 'integer', default: 0 }
  ],
  cursor_drift_records: [
    { name: 'cursor_value', type: 'integer' },
    { name: 'advanced_by', type: 'integer' },
    { name: 'automation', type: 'text' },
    { name: 'operator_id', type: 'integer', nullable: true },
    { name: 'note', type: 'text', nullable: true },
    { name: 'created_at', type: 'timestamp' }
  ],
  test_sessions: [
    { name: 'questionnaire_id', type: 'integer' },
    { name: 'question_group_index', type: 'integer', nullable: true },
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text', nullable: true },
    { name: 'grade', type: 'text', nullable: true },
    { name: 'class_name', type: 'text', nullable: true },
    { name: 'cursor_value_at_start', type: 'integer', nullable: true },
    { name: 'start_time', type: 'timestamp' },
    { name: 'end_time', type: 'timestamp', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'dimension_scores', type: 'jsonb', nullable: true }
  ],
  test_answers: [
    { name: 'session_id', type: 'integer' },
    { name: 'question_id', type: 'integer' },
    { name: 'answer', type: 'text' },
    { name: 'score', type: 'numeric', nullable: true }
  ],
  test_results: [
    { name: 'session_id', type: 'integer' },
    { name: 'total_score', type: 'numeric' },
    { name: 'result_level', type: 'text' },
    { name: 'recommendations', type: 'text' },
    { name: 'dimension_scores', type: 'jsonb', nullable: true },
    { name: 'risk_level', type: 'text', nullable: true },
    { name: 'completed_at', type: 'timestamp' }
  ]
}

// ═══════════════════════════════════════════════════════════
// 角色权限矩阵（PRD 4.2.6）
// ═══════════════════════════════════════════════════════════
const ROLE_PERMISSIONS = {
  admin: {
    manage_questionnaires: true,
    manage_cursor: true,
    view_drift_records: true,
    take_test: true,
    view_own_results: true,
    view_all_results: true,
    review_reports: true,
    view_statistics: true,
    view_full_data: true,
    delete_questionnaires: true
  },
  psychological_teacher: {
    manage_questionnaires: true,
    manage_cursor: true,
    view_drift_records: true,
    take_test: true,
    view_own_results: true,
    view_all_results: true,
    review_reports: true,
    view_statistics: true,
    view_full_data: true,
    delete_questionnaires: false
  },
  teacher: {
    manage_questionnaires: false,
    manage_cursor: false,
    view_drift_records: false,
    take_test: true,
    view_own_results: true,
    view_all_results: false,
    review_reports: false,
    view_statistics: false,
    view_full_data: false,
    delete_questionnaires: false
  },
  student: {
    manage_questionnaires: false,
    manage_cursor: false,
    view_drift_records: false,
    take_test: true,
    view_own_results: true,
    view_all_results: false,
    review_reports: false,
    view_statistics: false,
    view_full_data: false,
    delete_questionnaires: false
  }
}

// ═══════════════════════════════════════════════════════════
// 初始化
// ═══════════════════════════════════════════════════════════
app.onStart(async () => {
  for (const [tableName, columns] of Object.entries(TABLES)) {
    try {
      await app.mcp.call('data.create_table', { orgId: app.orgId, tableName, columns })
      console.log(`[init] Table '${tableName}' ready`)
    } catch (e) {
      console.log(`[init] Table '${tableName}' already exists`)
    }
  }
  // 确保游标单例存在
  try {
    const existing = await app.mcp.call('data.query', {
      orgId: app.orgId, tableName: 'cursor', where: { singleton_key: 'global' }, limit: 1
    })
    if (!existing.rows || existing.rows.length === 0) {
      await app.mcp.call('data.insert', {
        orgId: app.orgId, tableName: 'cursor',
        data: { singleton_key: 'global', value: 0 }
      })
      console.log('[init] Global cursor initialized at 0')
    }
  } catch (e) {
    console.log('[init] Cursor init:', e.message)
  }
})

// ═══════════════════════════════════════════════════════════
// 通用 CRUD 辅助
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// 权限与角色
// ═══════════════════════════════════════════════════════════

/** 获取用户角色 */
function getUserRole(req) {
  return req.headers['x-user-role'] || req.query.role || 'student'
}

/** 获取用户 ID */
function getUserId(req) {
  return req.headers['x-user-id'] || req.query.user_id || null
}

/** 检查角色权限 */
function checkPermission(role, action) {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.student
  return perms[action] || false
}

/** 权限中间件（按 action） */
function requirePermission(action) {
  return (req, res, next) => {
    const role = getUserRole(req)
    if (!checkPermission(role, action)) {
      return res.status(403).json({ error: '权限不足，无法执行此操作' })
    }
    req.userRole = role
    req.userId = getUserId(req)
    next()
  }
}

/** 权限中间件（按最低角色级别） */
function requireMinRole(minRole) {
  const LEVELS = { admin: 3, psychological_teacher: 2, teacher: 1, student: 0 }
  return (req, res, next) => {
    const role = getUserRole(req)
    const roleLevel = LEVELS[role] ?? 0
    const minLevel = LEVELS[minRole] ?? 0
    if (roleLevel < minLevel) {
      return res.status(403).json({ error: `权限不足，需要 ${minRole} 及以上角色` })
    }
    req.userRole = role
    req.userId = getUserId(req)
    next()
  }
}

// ═══════════════════════════════════════════════════════════
// 数据验证函数
// ═══════════════════════════════════════════════════════════

/** 安全解析 JSON，支持字符串和对象 */
function safeParseJSON(val) {
  if (!val) return null
  if (typeof val === 'object') return val
  if (Array.isArray(val)) return val
  try { return JSON.parse(String(val)) } catch { return null }
}

/** 验证问卷标题 */
function validateTitle(title) {
  if (!title || String(title).trim() === '') {
    return { valid: false, message: '标题不能为空' }
  }
  if (String(title).length > 200) {
    return { valid: false, message: '标题不能超过 200 个字符' }
  }
  return { valid: true }
}

/** 验证题目数组 */
function validateQuestions(questions) {
  const parsed = safeParseJSON(questions)
  if (!Array.isArray(parsed)) {
    return { valid: false, message: '题目必须是数组', parsed: null }
  }
  if (parsed.length === 0) {
    return { valid: false, message: '题目数组不能为空', parsed: null }
  }
  if (parsed.length > 500) {
    return { valid: false, message: '题目数量不能超过 500', parsed: null }
  }
  // 验证每题结构
  for (let i = 0; i < parsed.length; i++) {
    const q = parsed[i]
    if (!q.text && !q.content) {
      return { valid: false, message: `第 ${i + 1} 题缺少题干（text 字段）`, parsed: null }
    }
    if (q.direction && !['forward', 'reverse'].includes(q.direction)) {
      return { valid: false, message: `第 ${i + 1} 题的 direction 必须为 forward 或 reverse`, parsed: null }
    }
    // 自动分配 id（如果缺失）
    if (q.id === undefined) q.id = i + 1
  }
  return { valid: true, parsed }
}

/** 验证评分规则 */
function validateScoringRules(rules) {
  const parsed = safeParseJSON(rules)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, message: '评分规则必须是有效的 JSON 对象', parsed: null }
  }
  return { valid: true, parsed }
}

/** 验证答案数组 */
function validateAnswers(answers) {
  if (!Array.isArray(answers)) {
    return { valid: false, message: '答案必须是数组' }
  }
  if (answers.length === 0) {
    return { valid: false, message: '答案不能为空' }
  }
  for (let i = 0; i < answers.length; i++) {
    const ans = answers[i]
    if (ans.question_id === undefined || ans.question_id === null) {
      return { valid: false, message: `第 ${i + 1} 条答案缺少 question_id` }
    }
    if (ans.answer === undefined || ans.answer === null) {
      return { valid: false, message: `第 ${i + 1} 条答案缺少 answer` }
    }
    if (!['是', '否'].includes(ans.answer)) {
      return { valid: false, message: `第 ${i + 1} 条答案必须为"是"或"否"` }
    }
  }
  return { valid: true }
}

/** 验证学生列表 */
function validateStudentList(students) {
  if (!Array.isArray(students)) {
    return { valid: false, message: '学生列表必须是数组' }
  }
  if (students.length === 0) {
    return { valid: false, message: '学生列表不能为空' }
  }
  for (let i = 0; i < students.length; i++) {
    if (!students[i].id) {
      return { valid: false, message: `第 ${i + 1} 个学生缺少 id` }
    }
  }
  return { valid: true }
}

// ═══════════════════════════════════════════════════════════
// 业务辅助函数
// ═══════════════════════════════════════════════════════════

/** 从题目数组中提取维度标签 */
function extractDimensionTags(questions) {
  const tags = new Set()
  for (const q of questions) {
    if (q.dimension) tags.add(q.dimension)
  }
  return [...tags]
}

/** 从题目数组中按维度分组 */
function buildQuestionGroups(questions) {
  const groups = {}
  for (const q of questions) {
    const dim = q.dimension || '未分类'
    if (!groups[dim]) groups[dim] = []
    groups[dim].push(q.id ?? questions.indexOf(q))
  }
  return groups
}

/** Fisher-Yates 洗牌算法 */
function shuffleArray(arr) {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * 计算单题得分（PRD XL-R4）
 * 正向题（forward/正面）：答"是"得 1 分，答"否"得 0 分
 * 反向题（reverse/负面）：答"否"得 1 分，答"是"得 0 分
 */
function calculateQuestionScore(direction, answer) {
  if (direction === 'forward') {
    return answer === '是' ? 1 : 0
  } else {
    return answer === '否' ? 1 : 0
  }
}

/** 计算风险等级 */
function calculateRiskLevel(dimensionScores, scoringRules) {
  if (!dimensionScores || Object.keys(dimensionScores).length === 0) return 'normal'

  const thresholds = scoringRules?.risk_thresholds || { mild: 3, moderate: 5, severe: 8 }
  let maxLevel = 'normal'
  const levelOrder = ['normal', 'mild', 'moderate', 'severe']

  for (const [, score] of Object.entries(dimensionScores)) {
    const s = typeof score === 'number' ? score : 0
    if (s >= (thresholds.severe || 8)) {
      if (levelOrder.indexOf('severe') > levelOrder.indexOf(maxLevel)) maxLevel = 'severe'
    } else if (s >= (thresholds.moderate || 5)) {
      if (levelOrder.indexOf('moderate') > levelOrder.indexOf(maxLevel)) maxLevel = 'moderate'
    } else if (s >= (thresholds.mild || 3)) {
      if (levelOrder.indexOf('mild') > levelOrder.indexOf(maxLevel)) maxLevel = 'mild'
    }
  }

  return maxLevel
}

/** 确定结果等级 */
function determineResultLevel(totalScore, riskLevel, scoringRules) {
  if (scoringRules.threshold_high && totalScore > scoringRules.threshold_high) return 'high'
  if (scoringRules.threshold_medium && totalScore > scoringRules.threshold_medium) return 'medium'
  if (riskLevel !== 'normal') return riskLevel
  return 'normal'
}

/** 获取全局游标值 */
async function getGlobalCursor(orgId) {
  const result = await app.mcp.call('data.query', {
    orgId, tableName: 'cursor', where: { singleton_key: 'global' }, limit: 1
  })
  if (result.rows && result.rows.length > 0) {
    return { id: result.rows[0].id, value: result.rows[0].value || 0 }
  }
  // 不存在则创建
  const inserted = await app.mcp.call('data.insert', {
    orgId, tableName: 'cursor', data: { singleton_key: 'global', value: 0 }
  })
  return { id: inserted.id, value: 0 }
}

/** 获取活跃问卷列表（用于游标取模） */
async function getActiveQuestionnaires(orgId) {
  const result = await app.mcp.call('data.query', {
    orgId, tableName: 'questionnaires', where: { status: 'active' },
    orderBy: 'created_at ASC', limit: 1000
  })
  return result.rows || []
}

/** 构建 question_id -> direction 映射 */
function buildQuestionDirectionMap(questions, dimensions) {
  const map = {}
  // 先从维度表获取
  for (const dim of dimensions) {
    const qIds = safeParseJSON(dim.question_ids) || []
    for (const qid of qIds) {
      map[qid] = dim.direction
    }
  }
  // 题目自身的 direction 属性覆盖维度（更精确）
  for (const q of questions) {
    if (q.direction) {
      map[q.id] = q.direction
    }
  }
  return map
}

// ═══════════════════════════════════════════════════════════
// 问卷管理 API
// ═══════════════════════════════════════════════════════════

/** 问卷列表 */
app.get('/api/questionnaires', async (req, res) => {
  try {
    const role = getUserRole(req)
    const where = {}

    // 学生/教师只能看到已激活的问卷
    if (role === 'student' || role === 'teacher') {
      where.status = 'active'
    }

    // 支持按状态过滤
    if (req.query.status) where.status = req.query.status

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'questionnaires', where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })

    // 对学生/教师隐藏内部字段
    const rows = (result.rows || []).map(q => {
      if (role === 'student' || role === 'teacher') {
        const { scoring_rules, dimension_tags, question_groups, ...rest } = q
        return rest
      }
      return q
    })

    res.json({ rows, count: rows.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 问卷详情 */
app.get('/api/questionnaires/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'questionnaires',
      where: { id: parseInt(req.params.id) }, limit: 1
    })
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '问卷不存在' })
    }
    const q = result.rows[0]

    // 学生/教师不能看到未激活问卷的详情
    if ((role === 'student' || role === 'teacher') && q.status !== 'active') {
      return res.status(403).json({ error: '该问卷尚未开放' })
    }

    // 对学生/教师隐藏内部字段
    if (role === 'student' || role === 'teacher') {
      const { scoring_rules, dimension_tags, question_groups, ...rest } = q
      return res.json(rest)
    }

    res.json(q)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 创建问卷（含自动维度提取） */
app.post('/api/questionnaires', requirePermission('manage_questionnaires'), async (req, res) => {
  try {
    const { title, description, questions, scoring_rules, blind_mode, question_groups, status } = req.body

    // ── 数据验证 ──
    const titleCheck = validateTitle(title)
    if (!titleCheck.valid) return res.status(400).json({ error: titleCheck.message })

    const qCheck = validateQuestions(questions)
    if (!qCheck.valid) return res.status(400).json({ error: qCheck.message })
    const parsedQuestions = qCheck.parsed

    const rCheck = validateScoringRules(scoring_rules)
    if (!rCheck.valid) return res.status(400).json({ error: rCheck.message })
    const parsedRules = rCheck.parsed

    // ── 状态验证 ──
    const validStatuses = ['draft', 'active', 'archived']
    const finalStatus = status || 'draft'
    if (!validStatuses.includes(finalStatus)) {
      return res.status(400).json({ error: `状态必须为 ${validStatuses.join('、')} 之一` })
    }

    // ── 提取维度标签 ──
    const dimensionTags = extractDimensionTags(parsedQuestions)

    // ── 构建题目分组（如果未提供则自动构建）──
    const finalGroups = safeParseJSON(question_groups) || buildQuestionGroups(parsedQuestions)

    // ── 插入问卷 ──
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'questionnaires',
      data: {
        title: String(title).trim(),
        description: description || '',
        questions: JSON.stringify(parsedQuestions),
        scoring_rules: JSON.stringify(parsedRules),
        status: finalStatus,
        dimension_tags: JSON.stringify(dimensionTags),
        question_groups: JSON.stringify(finalGroups),
        blind_mode: blind_mode !== false,
        total_students: 0,
        created_by: parseInt(getUserId(req)) || null
      }
    })

    // ── 自动创建维度记录 ──
    for (const [dimName, qIds] of Object.entries(finalGroups)) {
      let direction = 'forward'
      const questionsInDim = parsedQuestions.filter(q => (q.dimension || '未分类') === dimName)
      if (questionsInDim.some(q => q.direction === 'reverse')) direction = 'reverse'

      await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'questionnaire_dimensions',
        data: {
          questionnaire_id: result.id,
          dimension_name: dimName,
          question_ids: JSON.stringify(qIds),
          direction
        }
      })
    }

    res.json({
      id: result.id,
      title: String(title).trim(),
      description,
      questions: parsedQuestions,
      scoring_rules: parsedRules,
      dimension_tags: dimensionTags,
      question_groups: finalGroups,
      status: finalStatus,
      blind_mode: blind_mode !== false
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 更新问卷 */
app.put('/api/questionnaires/:id', requirePermission('manage_questionnaires'), async (req, res) => {
  try {
    const qId = parseInt(req.params.id)

    // 验证问卷存在
    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'questionnaires', where: { id: qId }, limit: 1
    })
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: '问卷不存在' })
    }

    // 状态验证
    if (req.body.status) {
      const validStatuses = ['draft', 'active', 'archived']
      if (!validStatuses.includes(req.body.status)) {
        return res.status(400).json({ error: `状态必须为 ${validStatuses.join('、')} 之一` })
      }
    }

    // 如果更新了题目，重新提取维度
    if (req.body.questions) {
      const qCheck = validateQuestions(req.body.questions)
      if (!qCheck.valid) return res.status(400).json({ error: qCheck.message })
      const parsedQuestions = qCheck.parsed

      req.body.dimension_tags = JSON.stringify(extractDimensionTags(parsedQuestions))
      const groups = safeParseJSON(req.body.question_groups) || buildQuestionGroups(parsedQuestions)
      req.body.question_groups = JSON.stringify(groups)

      // 更新维度记录：先删后建
      await app.mcp.call('data.delete', {
        orgId: req.orgId, tableName: 'questionnaire_dimensions',
        where: { questionnaire_id: qId }
      })
      for (const [dimName, qIds] of Object.entries(groups)) {
        let direction = 'forward'
        const questionsInDim = parsedQuestions.filter(q => (q.dimension || '未分类') === dimName)
        if (questionsInDim.some(q => q.direction === 'reverse')) direction = 'reverse'

        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'questionnaire_dimensions',
          data: {
            questionnaire_id: qId,
            dimension_name: dimName,
            question_ids: JSON.stringify(qIds),
            direction
          }
        })
      }
    }

    if (req.body.scoring_rules) {
      const rCheck = validateScoringRules(req.body.scoring_rules)
      if (!rCheck.valid) return res.status(400).json({ error: rCheck.message })
      req.body.scoring_rules = JSON.stringify(rCheck.parsed)
    }

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'questionnaires',
      where: { id: qId }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 删除问卷（仅管理员） */
app.delete('/api/questionnaires/:id', requirePermission('delete_questionnaires'), async (req, res) => {
  try {
    const qId = parseInt(req.params.id)

    // 检查是否有进行中的测试会话
    const sessions = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_sessions',
      where: { questionnaire_id: qId, status: 'in_progress' }, limit: 1
    })
    if (sessions.rows && sessions.rows.length > 0) {
      return res.status(400).json({ error: '该问卷存在进行中的测试，无法删除' })
    }

    // 删除关联维度记录
    await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'questionnaire_dimensions',
      where: { questionnaire_id: qId }
    })
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'questionnaires', where: { id: qId }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── 盲测模式：题目乱序，隐藏维度标签（PRD XL-R3） ───
app.get('/api/questionnaires/:id/blind', async (req, res) => {
  try {
    const qId = parseInt(req.params.id)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'questionnaires', where: { id: qId }, limit: 1
    })
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '问卷不存在' })
    }

    const q = result.rows[0]
    if (q.status !== 'active') {
      return res.status(403).json({ error: '该问卷尚未开放' })
    }

    const questions = safeParseJSON(q.questions) || []

    // 盲测模式：移除维度与方向信息，防止学生揣摩"好答案"
    const blindQuestions = questions.map(({ dimension, direction, ...rest }) => rest)
    const finalQuestions = q.blind_mode ? shuffleArray(blindQuestions) : blindQuestions

    res.json({
      id: q.id,
      title: q.title,
      description: q.description,
      questions: finalQuestions,
      blind_mode: q.blind_mode
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 获取问卷维度列表 */
app.get('/api/questionnaires/:id/dimensions', async (req, res) => {
  try {
    const role = getUserRole(req)
    // 学生不能查看维度信息（盲测保护）
    if (role === 'student') {
      return res.status(403).json({ error: '维度信息对学生不可见' })
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'questionnaire_dimensions',
      where: { questionnaire_id: parseInt(req.params.id) }
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════════════
// 游标管理 API（PRD XL-R1, XL-R2, 流程 XL-F2）
// ═══════════════════════════════════════════════════════════

/** 获取当前游标值 */
app.get('/api/cursor', requirePermission('view_drift_records'), async (req, res) => {
  try {
    const cursor = await getGlobalCursor(req.orgId)
    const activeQs = await getActiveQuestionnaires(req.orgId)

    res.json({
      value: cursor.value,
      active_questionnaire_count: activeQs.length,
      assigned_group_index: activeQs.length > 0
        ? Math.abs(cursor.value) % activeQs.length
        : null,
      assigned_questionnaire: activeQs.length > 0
        ? { id: activeQs[Math.abs(cursor.value) % activeQs.length].id, title: activeQs[Math.abs(cursor.value) % activeQs.length].title }
        : null
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 推进游标（PRD 流程 XL-F2：轮次飘移） */
app.post('/api/cursor/advance', requirePermission('manage_cursor'), async (req, res) => {
  try {
    const { steps, automation, note } = req.body
    const advanceBy = parseInt(steps) || 1

    if (advanceBy < 1 || advanceBy > 100) {
      return res.status(400).json({ error: '推进步数必须在 1-100 之间' })
    }

    // 获取当前游标
    const cursor = await getGlobalCursor(req.orgId)
    const oldValue = cursor.value
    const newValue = oldValue + advanceBy

    // 更新游标
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'cursor',
      where: { id: cursor.id },
      data: { value: newValue }
    })

    // 记录轮次飘移
    const driftRecord = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'cursor_drift_records',
      data: {
        cursor_value: newValue,
        advanced_by: advanceBy,
        automation: automation || 'manual',
        operator_id: parseInt(getUserId(req)) || null,
        note: note || null,
        created_at: new Date().toISOString()
      }
    })

    // 计算新游标指向的问卷
    const activeQs = await getActiveQuestionnaires(req.orgId)
    const newIndex = Math.abs(newValue) % (activeQs.length || 1)

    res.json({
      success: true,
      old_value: oldValue,
      new_value: newValue,
      advanced_by: advanceBy,
      drift_record_id: driftRecord.id,
      assigned_group_index: activeQs.length > 0 ? newIndex : null,
      assigned_questionnaire: activeQs.length > 0
        ? { id: activeQs[newIndex].id, title: activeQs[newIndex].title }
        : null
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 手动设置游标值 */
app.put('/api/cursor', requirePermission('manage_cursor'), async (req, res) => {
  try {
    const { value, note } = req.body
    if (value === undefined || value === null) {
      return res.status(400).json({ error: '必须指定游标值' })
    }
    const newValue = parseInt(value)
    if (isNaN(newValue) || newValue < 0) {
      return res.status(400).json({ error: '游标值必须为非负整数' })
    }

    const cursor = await getGlobalCursor(req.orgId)
    const oldValue = cursor.value

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'cursor',
      where: { id: cursor.id },
      data: { value: newValue }
    })

    // 记录漂移
    await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'cursor_drift_records',
      data: {
        cursor_value: newValue,
        advanced_by: newValue - oldValue,
        automation: 'manual_set',
        operator_id: parseInt(getUserId(req)) || null,
        note: note || `手动设置游标: ${oldValue} -> ${newValue}`,
        created_at: new Date().toISOString()
      }
    })

    res.json({ success: true, old_value: oldValue, new_value: newValue })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 获取轮次飘移历史 */
app.get('/api/cursor/drift-records', requirePermission('view_drift_records'), async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'cursor_drift_records',
      orderBy: 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════════════
// 游标分发机制（PRD XL-R1: Q[|p| mod |Q|]）
// ═══════════════════════════════════════════════════════════
app.post('/api/questionnaires/distribute', requirePermission('manage_questionnaires'), async (req, res) => {
  try {
    const { students, questionnaire_id } = req.body

    // 验证学生列表
    const sCheck = validateStudentList(students || [])
    if (!sCheck.valid) return res.status(400).json({ error: sCheck.message })

    // 获取全局游标
    const cursor = await getGlobalCursor(req.orgId)
    const activeQs = await getActiveQuestionnaires(req.orgId)

    if (activeQs.length === 0) {
      return res.status(400).json({ error: '没有激活的问卷可供分发' })
    }

    // 确定目标问卷：指定问卷 或 游标取模
    let targetQuestionnaire
    if (questionnaire_id) {
      targetQuestionnaire = activeQs.find(q => q.id === parseInt(questionnaire_id))
      if (!targetQuestionnaire) {
        return res.status(400).json({ error: '指定的问卷不存在或未激活' })
      }
    } else {
      // PRD XL-R1: 游标值取模决定问题组
      const groupIndex = Math.abs(cursor.value) % activeQs.length
      targetQuestionnaire = activeQs[groupIndex]
    }

    const sessions = []
    for (const student of students) {
      const sessionResult = await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'test_sessions',
        data: {
          questionnaire_id: targetQuestionnaire.id,
          question_group_index: Math.abs(cursor.value) % activeQs.length,
          student_id: parseInt(student.id),
          student_name: student.name || '',
          grade: student.grade || '',
          class_name: student.class_name || '',
          cursor_value_at_start: cursor.value,
          start_time: new Date().toISOString(),
          status: 'pending',
          dimension_scores: null
        }
      })

      sessions.push({
        session_id: sessionResult.id,
        student_id: student.id,
        student_name: student.name,
        questionnaire_id: targetQuestionnaire.id,
        group_index: Math.abs(cursor.value) % activeQs.length
      })
    }

    // 更新问卷的累计学生数
    const newTotal = (targetQuestionnaire.total_students || 0) + students.length
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'questionnaires',
      where: { id: targetQuestionnaire.id },
      data: { total_students: newTotal }
    })

    res.json({
      success: true,
      cursor_value: cursor.value,
      assigned_questionnaire: {
        id: targetQuestionnaire.id,
        title: targetQuestionnaire.title,
        group_index: Math.abs(cursor.value) % activeQs.length
      },
      distributed_count: sessions.length,
      sessions
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════════════
// 测试会话 API
// ═══════════════════════════════════════════════════════════

/** 会话列表（权限过滤） */
app.get('/api/sessions', async (req, res) => {
  try {
    const role = getUserRole(req)
    const userId = getUserId(req)
    const where = {}

    // 权限控制：学生只能看自己的
    if (role === 'student' || role === 'teacher') {
      where.student_id = parseInt(userId) || 0
    }

    // 支持按问卷、状态过滤
    if (req.query.questionnaire_id) where.questionnaire_id = parseInt(req.query.questionnaire_id)
    if (req.query.status) where.status = req.query.status
    if (req.query.grade) where.grade = req.query.grade
    if (req.query.class_name) where.class_name = req.query.class_name

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_sessions', where,
      orderBy: req.query.orderBy || 'start_time DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 创建测试会话（学生开始答题） */
app.post('/api/sessions', requirePermission('take_test'), async (req, res) => {
  try {
    const role = getUserRole(req)
    const userId = getUserId(req)
    const { questionnaire_id, student_id, student_name, grade, class_name } = req.body

    // 验证问卷存在且激活
    if (!questionnaire_id) {
      return res.status(400).json({ error: '必须指定问卷' })
    }

    const qResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'questionnaires',
      where: { id: parseInt(questionnaire_id), status: 'active' }, limit: 1
    })
    if (!qResult.rows || qResult.rows.length === 0) {
      return res.status(400).json({ error: '问卷不存在或未激活' })
    }

    // 学生只能为自己创建
    const finalStudentId = (role === 'student') ? (parseInt(userId) || parseInt(student_id)) : parseInt(student_id)
    if (!finalStudentId) {
      return res.status(400).json({ error: '必须指定学生' })
    }

    // 检查是否已有进行中的同一问卷会话（防重复）
    const existingSession = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_sessions',
      where: { student_id: finalStudentId, questionnaire_id: parseInt(questionnaire_id), status: 'in_progress' },
      limit: 1
    })
    if (existingSession.rows && existingSession.rows.length > 0) {
      return res.status(400).json({
        error: '您已有正在进行的测试，请先完成或放弃',
        existing_session_id: existingSession.rows[0].id
      })
    }

    // 获取当前游标值（记录在会话中，用于审计）
    const cursor = await getGlobalCursor(req.orgId)
    const activeQs = await getActiveQuestionnaires(req.orgId)
    const groupIndex = activeQs.length > 0 ? Math.abs(cursor.value) % activeQs.length : null

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'test_sessions',
      data: {
        questionnaire_id: parseInt(questionnaire_id),
        question_group_index: groupIndex,
        student_id: finalStudentId,
        student_name: student_name || '',
        grade: grade || '',
        class_name: class_name || '',
        cursor_value_at_start: cursor.value,
        start_time: new Date().toISOString(),
        status: 'in_progress',
        dimension_scores: null
      }
    })

    res.json({
      id: result.id,
      questionnaire_id: parseInt(questionnaire_id),
      question_group_index: groupIndex,
      student_id: finalStudentId,
      student_name, grade, class_name,
      cursor_value_at_start: cursor.value,
      status: 'in_progress'
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 更新会话状态（如放弃测试） */
app.put('/api/sessions/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id)
    const role = getUserRole(req)
    const userId = getUserId(req)

    // 验证会话存在
    const existing = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_sessions', where: { id: sessionId }, limit: 1
    })
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: '测试会话不存在' })
    }

    const session = existing.rows[0]

    // 学生只能操作自己的会话
    if ((role === 'student' || role === 'teacher') && String(session.student_id) !== String(userId)) {
      return res.status(403).json({ error: '只能操作自己的测试' })
    }

    // 只允许更新状态（如放弃）
    if (req.body.status === 'abandoned' && session.status === 'in_progress') {
      req.body.end_time = new Date().toISOString()
    } else if (req.body.status && !['in_progress', 'abandoned'].includes(req.body.status)) {
      return res.status(400).json({ error: '只能通过提交答案来完成测试，或使用放弃操作' })
    }

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'test_sessions',
      where: { id: sessionId }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 删除会话（仅管理员） */
app.delete('/api/sessions/:id', requirePermission('view_all_results'), async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id)

    // 同时删除关联的答案和结果
    await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'test_answers', where: { session_id: sessionId }
    })
    await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'test_results', where: { session_id: sessionId }
    })
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'test_sessions', where: { id: sessionId }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════════════
// 答题提交与计分 API（PRD XL-R4）
// ═══════════════════════════════════════════════════════════
app.post('/api/sessions/:id/submit', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id)
    const role = getUserRole(req)
    const userId = getUserId(req)
    const { answers } = req.body

    // ── 验证答案 ──
    const aCheck = validateAnswers(answers || [])
    if (!aCheck.valid) return res.status(400).json({ error: aCheck.message })

    // ── 获取会话 ──
    const sessionResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_sessions',
      where: { id: sessionId }, limit: 1
    })
    if (!sessionResult.rows || sessionResult.rows.length === 0) {
      return res.status(404).json({ error: '测试会话不存在' })
    }
    const session = sessionResult.rows[0]

    // 权限校验：学生只能提交自己的
    if ((role === 'student' || role === 'teacher') && String(session.student_id) !== String(userId)) {
      return res.status(403).json({ error: '只能提交自己的测试' })
    }

    if (session.status === 'completed') {
      return res.status(400).json({ error: '该测试已完成，不可重复提交' })
    }

    // ── 获取问卷 ──
    const questResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'questionnaires',
      where: { id: session.questionnaire_id }, limit: 1
    })
    if (!questResult.rows || questResult.rows.length === 0) {
      return res.status(404).json({ error: '关联问卷不存在' })
    }
    const questionnaire = questResult.rows[0]
    const scoringRules = safeParseJSON(questionnaire.scoring_rules) || {}
    const questions = safeParseJSON(questionnaire.questions) || []

    // ── 获取维度信息 ──
    const dimResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'questionnaire_dimensions',
      where: { questionnaire_id: session.questionnaire_id }
    })
    const dimensions = dimResult.rows || []

    // ── 构建方向映射 ──
    const questionDirectionMap = buildQuestionDirectionMap(questions, dimensions)

    // ── 计分（PRD XL-R4） ──
    let totalScore = 0
    const dimensionScores = {}

    for (const ans of answers) {
      const direction = questionDirectionMap[ans.question_id] || 'forward'
      const score = calculateQuestionScore(direction, ans.answer)

      // 保存每条答案
      await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'test_answers',
        data: { session_id: sessionId, question_id: ans.question_id, answer: ans.answer, score }
      })

      totalScore += score

      // 按维度累计分数
      for (const dim of dimensions) {
        const qIds = safeParseJSON(dim.question_ids) || []
        if (qIds.includes(ans.question_id)) {
          const dimName = dim.dimension_name
          if (!dimensionScores[dimName]) dimensionScores[dimName] = 0
          dimensionScores[dimName] += score
        }
      }
    }

    // 如果没有维度信息，使用总分作为唯一维度
    if (dimensions.length === 0) {
      dimensionScores['总分'] = totalScore
    }

    // ── 确定风险等级与结果等级 ──
    const riskLevel = calculateRiskLevel(dimensionScores, scoringRules)
    const resultLevel = determineResultLevel(totalScore, riskLevel, scoringRules)
    const recommendations = scoringRules.recommendations?.[resultLevel]
      || scoringRules.recommendations?.[riskLevel]
      || ''

    // ── 保存结果 ──
    const resultRecord = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'test_results',
      data: {
        session_id: sessionId,
        total_score: totalScore,
        result_level: resultLevel,
        recommendations,
        dimension_scores: JSON.stringify(dimensionScores),
        risk_level: riskLevel,
        completed_at: new Date().toISOString()
      }
    })

    // ── 更新会话状态 ──
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'test_sessions',
      where: { id: sessionId },
      data: {
        status: 'completed',
        end_time: new Date().toISOString(),
        dimension_scores: JSON.stringify(dimensionScores)
      }
    })

    res.json({
      success: true,
      result_id: resultRecord.id,
      total_score: totalScore,
      result_level: resultLevel,
      risk_level: riskLevel,
      dimension_scores: dimensionScores,
      recommendations,
      answer_count: answers.length
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════════════
// 测试结果 API
// ═══════════════════════════════════════════════════════════

/** 结果列表（权限过滤） */
app.get('/api/results', async (req, res) => {
  try {
    const role = getUserRole(req)
    const userId = getUserId(req)
    const where = {}

    if (role === 'student' || role === 'teacher') {
      // 学生只能看自己的结果（通过 session 关联）
      const sessionResult = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'test_sessions',
        where: { student_id: parseInt(userId) || 0 }
      })
      const sessionIds = (sessionResult.rows || []).map(s => s.id)
      if (sessionIds.length === 0) {
        return res.json({ rows: [], count: 0 })
      }
      // 用 session_id 列表过滤
      where.session_id = sessionIds[0] // 简化处理
    }

    if (req.query.session_id) where.session_id = parseInt(req.query.session_id)
    if (req.query.risk_level) where.risk_level = req.query.risk_level
    if (req.query.result_level) where.result_level = req.query.result_level

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_results', where,
      orderBy: req.query.orderBy || 'completed_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
}

/** 结果详情 */
app.get('/api/results/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    const userId = getUserId(req)

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_results',
      where: { id: parseInt(req.params.id) }, limit: 1
    })
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '结果不存在' })
    }
    const r = result.rows[0]

    // 权限校验：学生只能看自己的
    if (role === 'student' || role === 'teacher') {
      const sessionResult = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'test_sessions',
        where: { id: r.session_id }, limit: 1
      })
      if (!sessionResult.rows || sessionResult.rows.length === 0) {
        return res.status(404).json({ error: '关联会话不存在' })
      }
      if (String(sessionResult.rows[0].student_id) !== String(userId)) {
        return res.status(403).json({ error: '只能查看自己的测试结果' })
      }
    }

    // 附带会话信息
    const sessionResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_sessions',
      where: { id: r.session_id }, limit: 1
    })
    const session = sessionResult.rows?.[0] || {}

    res.json({
      ...r,
      session_info: {
        student_id: session.student_id,
        student_name: session.student_name,
        grade: session.grade,
        class_name: session.class_name,
        questionnaire_id: session.questionnaire_id
      }
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 获取某会话的答案明细 */
app.get('/api/sessions/:id/answers', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id)
    const role = getUserRole(req)
    const userId = getUserId(req)

    // 权限校验
    if (role === 'student' || role === 'teacher') {
      const sessionResult = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'test_sessions',
        where: { id: sessionId }, limit: 1
      })
      if (!sessionResult.rows || sessionResult.rows.length === 0) {
        return res.status(404).json({ error: '会话不存在' })
      }
      if (String(sessionResult.rows[0].student_id) !== String(userId)) {
        return res.status(403).json({ error: '只能查看自己的答案' })
      }
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_answers',
      where: { session_id: sessionId },
      orderBy: 'question_id ASC',
      limit: 1000
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════════════
// 统计 API
// ═══════════════════════════════════════════════════════════

/** 按维度统计（PRD 4.2.6 审阅报表） */
app.get('/api/statistics/by-dimension', requirePermission('view_statistics'), async (req, res) => {
  try {
    const { questionnaire_id, grade, class_name } = req.query

    // 获取相关会话
    const sessionWhere = { status: 'completed' }
    if (questionnaire_id) sessionWhere.questionnaire_id = parseInt(questionnaire_id)
    if (grade) sessionWhere.grade = grade
    if (class_name) sessionWhere.class_name = class_name

    const sessionsData = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_sessions', where: sessionWhere, limit: 10000
    })
    const sessions = sessionsData.rows || []
    const sessionIds = sessions.map(s => s.id)

    if (sessionIds.length === 0) {
      return res.json({ dimensions: {}, risk_distribution: {}, total: 0 })
    }

    // 获取所有相关结果（按 session_id 逐个匹配）
    const allResults = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_results', limit: 10000
    })
    const results = (allResults.rows || []).filter(r => sessionIds.includes(r.session_id))

    // 按维度统计平均分
    const dimensionTotals = {}
    const dimensionCounts = {}
    const riskDistribution = { normal: 0, mild: 0, moderate: 0, severe: 0 }

    for (const r of results) {
      const scores = safeParseJSON(r.dimension_scores) || {}
      for (const [dim, score] of Object.entries(scores)) {
        if (!dimensionTotals[dim]) { dimensionTotals[dim] = 0; dimensionCounts[dim] = 0 }
        dimensionTotals[dim] += (typeof score === 'number' ? score : 0)
        dimensionCounts[dim]++
      }
      const risk = r.risk_level || r.result_level || 'normal'
      if (riskDistribution[risk] !== undefined) riskDistribution[risk]++
      else { riskDistribution[risk] = (riskDistribution[risk] || 0) + 1 }
    }

    const dimensions = {}
    for (const dim of Object.keys(dimensionTotals)) {
      dimensions[dim] = {
        average: dimensionCounts[dim] > 0
          ? Math.round(dimensionTotals[dim] / dimensionCounts[dim] * 100) / 100
          : 0,
        max: 0, min: Infinity,
        count: dimensionCounts[dim]
      }
    }

    // 计算各维度最高/最低分
    for (const r of results) {
      const scores = safeParseJSON(r.dimension_scores) || {}
      for (const [dim, score] of Object.entries(scores)) {
        const s = typeof score === 'number' ? score : 0
        if (s > dimensions[dim].max) dimensions[dim].max = s
        if (s < dimensions[dim].min) dimensions[dim].min = s
      }
    }
    for (const dim of Object.keys(dimensions)) {
      if (dimensions[dim].min === Infinity) dimensions[dim].min = 0
    }

    res.json({ dimensions, risk_distribution: riskDistribution, total: results.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 按年级统计 */
app.get('/api/statistics/by-grade', requirePermission('view_statistics'), async (req, res) => {
  try {
    const { questionnaire_id } = req.query

    const sessionWhere = { status: 'completed' }
    if (questionnaire_id) sessionWhere.questionnaire_id = parseInt(questionnaire_id)

    const allSessions = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_sessions', where: sessionWhere, limit: 10000
    })
    const sessions = allSessions.rows || []
    const sessionMap = {}
    for (const s of sessions) { sessionMap[s.id] = s }

    const resultsData = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_results', limit: 10000
    })
    const results = (resultsData.rows || []).filter(r => sessionMap[r.session_id])

    // 按年级分组
    const gradeStats = {}
    for (const r of results) {
      const session = sessionMap[r.session_id]
      const grade = session.grade || '未知年级'
      if (!gradeStats[grade]) {
        gradeStats[grade] = { count: 0, total_score: 0, risk: { normal: 0, mild: 0, moderate: 0, severe: 0 } }
      }
      gradeStats[grade].count++
      gradeStats[grade].total_score += (parseFloat(r.total_score) || 0)
      const risk = r.risk_level || r.result_level || 'normal'
      gradeStats[grade].risk[risk] = (gradeStats[grade].risk[risk] || 0) + 1
    }

    for (const grade of Object.keys(gradeStats)) {
      const g = gradeStats[grade]
      g.average_score = g.count > 0 ? Math.round(g.total_score / g.count * 100) / 100 : 0
    }

    res.json({ grades: gradeStats, total: results.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 按班级统计 */
app.get('/api/statistics/by-class', requirePermission('view_statistics'), async (req, res) => {
  try {
    const { questionnaire_id, grade } = req.query

    const sessionWhere = { status: 'completed' }
    if (grade) sessionWhere.grade = grade
    if (questionnaire_id) sessionWhere.questionnaire_id = parseInt(questionnaire_id)

    const allSessions = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_sessions', where: sessionWhere, limit: 10000
    })
    const sessions = allSessions.rows || []
    const sessionMap = {}
    for (const s of sessions) { sessionMap[s.id] = s }

    const resultsData = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_results', limit: 10000
    })
    const results = (resultsData.rows || []).filter(r => sessionMap[r.session_id])

    // 按班级分组
    const classStats = {}
    for (const r of results) {
      const session = sessionMap[r.session_id]
      const className = session.class_name || '未知班级'
      if (!classStats[className]) {
        classStats[className] = { count: 0, total_score: 0, risk: { normal: 0, mild: 0, moderate: 0, severe: 0 } }
      }
      classStats[className].count++
      classStats[className].total_score += (parseFloat(r.total_score) || 0)
      const risk = r.risk_level || r.result_level || 'normal'
      classStats[className].risk[risk] = (classStats[className].risk[risk] || 0) + 1
    }

    for (const cls of Object.keys(classStats)) {
      const c = classStats[cls]
      c.average_score = c.count > 0 ? Math.round(c.total_score / c.count * 100) / 100 : 0
    }

    res.json({ classes: classStats, total: results.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 风险概览 */
app.get('/api/statistics/risk-overview', requirePermission('view_statistics'), async (req, res) => {
  try {
    const resultsData = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_results', limit: 10000
    })
    const results = resultsData.rows || []

    const overview = { normal: 0, mild: 0, moderate: 0, severe: 0 }
    const dimensionRisk = {}

    for (const r of results) {
      const risk = r.risk_level || r.result_level || 'normal'
      if (overview[risk] !== undefined) overview[risk]++
      else overview[risk] = (overview[risk] || 0) + 1

      // 按维度统计风险分布
      const scores = safeParseJSON(r.dimension_scores) || {}
      for (const [dim, score] of Object.entries(scores)) {
        if (!dimensionRisk[dim]) dimensionRisk[dim] = { normal: 0, mild: 0, moderate: 0, severe: 0 }
        const s = typeof score === 'number' ? score : 0
        let level = 'normal'
        if (s >= 8) level = 'severe'
        else if (s >= 5) level = 'moderate'
        else if (s >= 3) level = 'mild'
        dimensionRisk[dim][level]++
      }
    }

    res.json({
      total: results.length,
      risk_counts: overview,
      dimension_risk: dimensionRisk
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 综合统计概览 */
app.get('/api/statistics/overview', requirePermission('view_statistics'), async (req, res) => {
  try {
    const [questionnaires, sessions, results, cursorData] = await Promise.all([
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'questionnaires', limit: 1000 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'test_sessions', limit: 10000 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'test_results', limit: 10000 }),
      app.mcp.call('data.query', { orgId: req.orgId, tableName: 'cursor', where: { singleton_key: 'global' }, limit: 1 })
    ])

    const qRows = questionnaires.rows || []
    const sRows = sessions.rows || []
    const rRows = results.rows || []
    const cursor = cursorData.rows?.[0] || { value: 0 }

    // 问卷统计
    const questionnaireStats = {
      total: qRows.length,
      active: qRows.filter(q => q.status === 'active').length,
      draft: qRows.filter(q => q.status === 'draft').length,
      archived: qRows.filter(q => q.status === 'archived').length
    }

    // 会话统计
    const sessionStats = {
      total: sRows.length,
      pending: sRows.filter(s => s.status === 'pending').length,
      in_progress: sRows.filter(s => s.status === 'in_progress').length,
      completed: sRows.filter(s => s.status === 'completed').length,
      abandoned: sRows.filter(s => s.status === 'abandoned').length
    }

    // 完成率
    const completionRate = sRows.length > 0
      ? Math.round(sessionStats.completed / sRows.length * 10000) / 100
      : 0

    // 风险分布
    const riskDistribution = { normal: 0, mild: 0, moderate: 0, severe: 0 }
    for (const r of rRows) {
      const risk = r.risk_level || r.result_level || 'normal'
      if (riskDistribution[risk] !== undefined) riskDistribution[risk]++
      else riskDistribution[risk] = (riskDistribution[risk] || 0) + 1
    }

    // 按年级参与统计
    const gradeParticipation = {}
    for (const s of sRows) {
      const grade = s.grade || '未知年级'
      if (!gradeParticipation[grade]) {
        gradeParticipation[grade] = { total: 0, completed: 0 }
      }
      gradeParticipation[grade].total++
      if (s.status === 'completed') gradeParticipation[grade].completed++
    }

    res.json({
      questionnaire_stats: questionnaireStats,
      session_stats: sessionStats,
      completion_rate: completionRate,
      total_results: rRows.length,
      risk_distribution: riskDistribution,
      cursor_value: cursor.value,
      grade_participation: gradeParticipation
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/** 问卷审阅报表（PRD FR-XL-06） */
app.get('/api/statistics/review', requirePermission('review_reports'), async (req, res) => {
  try {
    const { questionnaire_id, grade, class_name, risk_level, sort_by } = req.query

    // 获取完成的会话
    const sessionWhere = { status: 'completed' }
    if (questionnaire_id) sessionWhere.questionnaire_id = parseInt(questionnaire_id)
    if (grade) sessionWhere.grade = grade
    if (class_name) sessionWhere.class_name = class_name

    const sessionsData = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_sessions', where: sessionWhere, limit: 10000
    })
    const sessions = sessionsData.rows || []
    const sessionMap = {}
    for (const s of sessions) { sessionMap[s.id] = s }

    // 获取结果
    const resultsData = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'test_results', limit: 10000
    })
    let results = (resultsData.rows || []).filter(r => sessionMap[r.session_id])

    // 按风险等级过滤
    if (risk_level) {
      results = results.filter(r => (r.risk_level || r.result_level) === risk_level)
    }

    // 组装审阅数据
    const reviewItems = results.map(r => {
      const session = sessionMap[r.session_id] || {}
      return {
        result_id: r.id,
        session_id: r.session_id,
        student_id: session.student_id,
        student_name: session.student_name,
        grade: session.grade,
        class_name: session.class_name,
        questionnaire_id: session.questionnaire_id,
        total_score: parseFloat(r.total_score) || 0,
        result_level: r.result_level,
        risk_level: r.risk_level,
        dimension_scores: safeParseJSON(r.dimension_scores),
        recommendations: r.recommendations,
        completed_at: r.completed_at
      }
    })

    // 排序
    if (sort_by === 'total_score_asc') {
      reviewItems.sort((a, b) => a.total_score - b.total_score)
    } else if (sort_by === 'total_score_desc') {
      reviewItems.sort((a, b) => b.total_score - a.total_score)
    } else {
      // 默认按完成时间倒序
      reviewItems.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    }

    res.json({
      items: reviewItems,
      total: reviewItems.length,
      filters: { questionnaire_id, grade, class_name, risk_level }
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
