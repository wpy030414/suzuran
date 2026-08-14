import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'task-tracking', port: 8099 })

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

// ─── 数据表定义 ───
const TABLES = {
  task_tags: [
    { name: 'name', type: 'text' },
    { name: 'alias', type: 'text', nullable: true },
    { name: 'name_combination', type: 'text', nullable: true },
    { name: 'priority', type: 'integer' },
    { name: 'description', type: 'text', nullable: true }
  ],
  schools: [
    { name: 'name', type: 'text' },
    { name: 'alias', type: 'text', nullable: true },
    { name: 'name_combination', type: 'text', nullable: true },
    { name: 'address', type: 'text', nullable: true }
  ],
  projects: [
    { name: 'school_id', type: 'integer' },
    { name: 'tag_id', type: 'integer' },
    { name: 'name', type: 'text' },
    { name: 'parent_project_id', type: 'integer', nullable: true },
    { name: 'description', type: 'text', nullable: true }
  ],
  tasks: [
    { name: 'title', type: 'text' },
    { name: 'description', type: 'text', nullable: true },
    { name: 'summary', type: 'text', nullable: true },
    { name: 'assignee_id', type: 'integer' },
    { name: 'creator_id', type: 'integer' },
    { name: 'approver_id', type: 'integer', nullable: true },
    { name: 'project_id', type: 'integer', nullable: true },
    { name: 'school_id', type: 'integer', nullable: true },
    { name: 'school_name', type: 'text', nullable: true },
    { name: 'tag_ids', type: 'jsonb', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'priority', type: 'text' },
    { name: 'expected_completion', type: 'date', nullable: true },
    { name: 'is_field_trip', type: 'boolean' },
    { name: 'field_trip_date', type: 'date', nullable: true },
    { name: 'field_trip_period', type: 'text', nullable: true },
    { name: 'participants', type: 'jsonb', nullable: true },
    { name: 'blocked_reason', type: 'text', nullable: true },
    { name: 'workflow_instance_id', type: 'integer', nullable: true },
    { name: 'workflow_definition_id', type: 'integer', nullable: true },
    { name: 'created_at', type: 'timestamp' },
    { name: 'updated_at', type: 'timestamp' }
  ],
  task_comments: [
    { name: 'task_id', type: 'integer' },
    { name: 'user_id', type: 'integer' },
    { name: 'content', type: 'text' },
    { name: 'created_at', type: 'timestamp' }
  ],
  task_attachments: [
    { name: 'task_id', type: 'integer' },
    { name: 'file_url', type: 'text' },
    { name: 'file_name', type: 'text' },
    { name: 'uploaded_by', type: 'integer' },
    { name: 'created_at', type: 'timestamp' }
  ],
  task_assigners: [
    { name: 'user_id', type: 'integer' },
    { name: 'is_active', type: 'boolean' }
  ],
  notices: [
    { name: 'content', type: 'text' },
    { name: 'link', type: 'text', nullable: true },
    { name: 'expires_at', type: 'timestamp' },
    { name: 'is_permanent', type: 'boolean' },
    { name: 'created_by', type: 'integer' }
  ]
}

// ─── 合法状态转换表 ───
const VALID_TRANSITIONS = {
  pending:     ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['blocked', 'completed', 'pending'],
  blocked:     ['in_progress', 'pending', 'cancelled'],
  completed:   [],
  cancelled:   ['pending']
}

// ─── 角色权限矩阵 ───
const ROLE_PERMISSIONS = {
  admin:      { create_task: true, assign_task: true, approve_task: true, manage_config: true, view_all: true },
  teacher:    { create_task: true, assign_task: false, approve_task: false, manage_config: false, view_all: false },
  student:    { create_task: false, assign_task: false, approve_task: false, manage_config: false, view_all: false }
}

// ─── 初始化 ───
app.onStart(async () => {
  // 创建数据表
  for (const [tableName, columns] of Object.entries(TABLES)) {
    try {
      await app.mcp.call('data.create_table', { orgId: app.orgId, tableName, columns })
      console.log(`[init] Table '${tableName}' ready`)
    } catch (e) {
      console.log(`[init] Table '${tableName}' already exists`)
    }
  }

  // 初始化天眼任务审批工作流定义
  try {
    const existingDefs = await app.mcp.call('workflow.list_definitions', { orgId: app.orgId })
    const defs = existingDefs.definitions || []
    const hasTaskWorkflow = defs.some(d => d.name === 'task_approval')

    if (!hasTaskWorkflow) {
      const def = await app.mcp.call('workflow.define', {
        orgId: app.orgId,
        name: 'task_approval',
        description: '天眼任务审批流程：创建 → 审批 → 执行 → 完成',
        definition: {
          variables: ['task_id', 'title', 'assignee_id', 'is_field_trip', 'priority'],
          steps: [
            { name: 'start', type: 'start', next: 'review' },
            {
              name: 'review', type: 'approval',
              assignee: '{{approver_id}}',
              on_approve: 'execute', on_reject: 'start',
              next: 'condition_field_trip'
            },
            {
              name: 'condition_field_trip', type: 'condition',
              conditions: [{ field: 'is_field_trip', operator: 'eq', value: true }],
              on_approve: 'execute', on_reject: 'execute'
            },
            { name: 'execute', type: 'approval', assignee: '{{assignee_id}}', on_approve: 'end', on_reject: 'review' },
            { name: 'end', type: 'end' }
          ]
        }
      })
      console.log(`[init] Task approval workflow defined: id=${def.id}`)
    }
  } catch (e) {
    console.log(`[init] Workflow setup skipped: ${e.message}`)
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

// ─── 业务辅助函数 ───

/** 从富文本 JSON 中提取摘要（第 3~5 层节点的首个非空文本） */
function extractSummary(richTextJson) {
  if (!richTextJson) return ''
  try {
    const doc = typeof richTextJson === 'string' ? JSON.parse(richTextJson) : richTextJson
    const SKIP_TAGS = new Set(['root', 'p', 'span', 'img', 'br'])
    let result = ''

    function walk(node, depth) {
      if (result || depth > 5) return
      if (depth >= 3 && node.text && !SKIP_TAGS.has(node.type || node.tag)) {
        result = node.text.trim()
        return
      }
      const children = node.children || node.content || []
      for (const child of children) {
        walk(child, depth + 1)
        if (result) return
      }
    }
    walk(doc, 0)
    return result || ''
  } catch {
    return ''
  }
}

/** 拼接名称组合（主名称 + 别名） */
function buildNameCombination(name, alias) {
  if (!alias) return name
  const aliases = typeof alias === 'string' ? [alias] : (Array.isArray(alias) ? alias : [])
  return [name, ...aliases].filter(Boolean).join(' / ')
}

/** 验证状态转换合法性 */
function validateTransition(currentStatus, newStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus] || []
  return allowed.includes(newStatus)
}

/** 获取用户角色（简化版，从请求头或查询参数获取） */
function getUserRole(req) {
  return req.headers['x-user-role'] || req.query.role || 'student'
}

/** 检查角色权限 */
function checkPermission(role, action) {
  const perms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.student
  return perms[action] || false
}

/** 生成外勤预告文案 */
function buildFieldTripAnnouncement(task) {
  const participants = task.participants || []
  const memberNames = participants.map(p => p.name || `成员${p.id}`).join('、')
  const date = task.field_trip_date || ''
  const period = task.field_trip_period || ''
  const schoolName = task.school_name || '未知学校'

  const now = new Date()
  const tripDate = new Date(date)
  const diffDays = Math.floor((now - tripDate) / (1000 * 60 * 60 * 24))
  const prefix = diffDays > 1 ? '【已结束】' : ''

  return `${prefix}${memberNames}将于${date}${period}访问${schoolName}。`
}

// ═══════════════════════════════════════
// 学校管理 API
// ═══════════════════════════════════════
app.get('/api/schools', (req, res) => listRecords(req, res, 'schools'))

app.post('/api/schools', async (req, res) => {
  try {
    const { name, alias, address } = req.body
    if (!name) return res.status(400).json({ error: '学校名称不能为空' })

    const nameCombination = buildNameCombination(name, alias)
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'schools',
      data: { name, alias: JSON.stringify(alias), name_combination: nameCombination, address }
    })
    res.json({ id: result.id, name, name_combination: nameCombination })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/schools/:id', async (req, res) => {
  try {
    const { name, alias, address } = req.body
    const nameCombination = buildNameCombination(name, alias)
    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'schools',
      where: { id: parseInt(req.params.id) },
      data: { name, alias: JSON.stringify(alias), name_combination: nameCombination, address }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/schools/:id', (req, res) => deleteRecord(req, res, 'schools'))

// ═══════════════════════════════════════
// 任务标签 API
// ═══════════════════════════════════════
app.get('/api/tags', (req, res) => listRecords(req, res, 'task_tags'))

app.post('/api/tags', async (req, res) => {
  try {
    const { name, alias, priority, description, confirm_text } = req.body
    if (!name) return res.status(400).json({ error: '标签名称不能为空' })

    // 标签命名闸门：必须输入"我确认"
    if (confirm_text !== '我确认') {
      return res.status(400).json({ error: '您没有确认，无法提交！请在确认框中输入"我确认"' })
    }

    const nameCombination = buildNameCombination(name, alias)
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'task_tags',
      data: { name, alias: JSON.stringify(alias), name_combination: nameCombination, priority: priority || 0, description }
    })
    res.json({ id: result.id, name, name_combination: nameCombination })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/tags/:id', (req, res) => updateRecord(req, res, 'task_tags'))
app.delete('/api/tags/:id', (req, res) => deleteRecord(req, res, 'task_tags'))

// ═══════════════════════════════════════
// 项目管理 API
// ═══════════════════════════════════════
app.get('/api/projects', (req, res) => listRecords(req, res, 'projects'))

app.post('/api/projects', async (req, res) => {
  try {
    const { school_id, tag_id, name, parent_project_id, description } = req.body
    if (!school_id || !tag_id || !name) {
      return res.status(400).json({ error: '学校、标签和项目名称不能为空' })
    }
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'projects',
      data: { school_id: parseInt(school_id), tag_id: parseInt(tag_id), name, parent_project_id, description }
    })
    res.json({ id: result.id, ...req.body })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/projects/:id', (req, res) => updateRecord(req, res, 'projects'))
app.delete('/api/projects/:id', (req, res) => deleteRecord(req, res, 'projects'))

// ═══════════════════════════════════════
// 任务管理 API（核心业务逻辑）
// ═══════════════════════════════════════
app.get('/api/tasks', async (req, res) => {
  try {
    const where = {}
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy', 'status', 'assignee_id', 'project_id', 'school_id', 'is_field_trip'].includes(k)) {
        where[k] = v
      }
    }
    // 支持按状态过滤
    if (req.query.status) where.status = req.query.status
    if (req.query.assignee_id) where.assignee_id = parseInt(req.query.assignee_id)
    if (req.query.project_id) where.project_id = parseInt(req.query.project_id)
    if (req.query.school_id) where.school_id = parseInt(req.query.school_id)
    if (req.query.is_field_trip) where.is_field_trip = req.query.is_field_trip === 'true'

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'tasks', where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/tasks', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (!checkPermission(role, 'create_task')) {
      return res.status(403).json({ error: '您没有权限创建任务' })
    }

    const {
      title, description, assignee_id, creator_id, approver_id,
      project_id, school_id, school_name, tag_ids, priority,
      expected_completion, is_field_trip, field_trip_date,
      field_trip_period, participants
    } = req.body

    // 必填字段验证
    if (!title) return res.status(400).json({ error: '任务标题不能为空' })
    if (!assignee_id) return res.status(400).json({ error: '必须指定执行人' })
    if (!creator_id) return res.status(400).json({ error: '必须指定创建人' })
    if (is_field_trip && !field_trip_date) {
      return res.status(400).json({ error: '外勤任务必须指定占用日期' })
    }

    // 自动生成摘要
    const summary = extractSummary(description) || title.substring(0, 50)

    // 默认期望完成时间为次日
    const defaultCompletion = new Date()
    defaultCompletion.setDate(defaultCompletion.getDate() + 1)
    const completionDate = expected_completion || defaultCompletion.toISOString().split('T')[0]

    const now = new Date().toISOString()
    const taskData = {
      title, description, summary,
      assignee_id: parseInt(assignee_id),
      creator_id: parseInt(creator_id),
      approver_id: approver_id ? parseInt(approver_id) : null,
      project_id: project_id ? parseInt(project_id) : null,
      school_id: school_id ? parseInt(school_id) : null,
      school_name: school_name || '',
      tag_ids: JSON.stringify(tag_ids || []),
      status: 'pending',
      priority: priority || 'normal',
      expected_completion: completionDate,
      is_field_trip: !!is_field_trip,
      field_trip_date: field_trip_date || null,
      field_trip_period: field_trip_period || null,
      participants: JSON.stringify(participants || []),
      blocked_reason: null,
      workflow_instance_id: null,
      workflow_definition_id: null,
      created_at: now,
      updated_at: now
    }

    // 插入任务
    const taskResult = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'tasks', data: taskData
    })

    // 启动审批工作流
    try {
      // 查找天眼任务审批工作流定义
      const defs = await app.mcp.call('workflow.list_definitions', { orgId: req.orgId })
      const taskDef = (defs.definitions || []).find(d => d.name === 'task_approval')

      if (taskDef) {
        const instance = await app.mcp.call('workflow.start', {
          orgId: req.orgId,
          definitionId: taskDef.id,
          variables: {
            task_id: taskResult.id,
            title,
            assignee_id: parseInt(assignee_id),
            is_field_trip: !!is_field_trip,
            priority: priority || 'normal'
          }
        })

        // 更新任务的工作流实例 ID
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'tasks',
          where: { id: taskResult.id },
          data: {
            workflow_instance_id: instance.instanceId,
            workflow_definition_id: taskDef.id,
            updated_at: new Date().toISOString()
          }
        })
      }
    } catch (wfErr) {
      console.log(`[task] Workflow start skipped: ${wfErr.message}`)
    }

    res.json({ id: taskResult.id, ...taskData })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id)

    // 获取当前任务状态
    const current = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'tasks', where: { id: taskId }, limit: 1
    })
    if (!current.rows || current.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' })
    }
    const task = current.rows[0]

    // 状态转换验证
    if (req.body.status && req.body.status !== task.status) {
      if (!validateTransition(task.status, req.body.status)) {
        return res.status(400).json({
          error: `不允许从 "${task.status}" 转换到 "${req.body.status}"`,
          allowed: VALID_TRANSITIONS[task.status] || []
        })
      }
    }

    // 如果更新描述，重新生成摘要
    if (req.body.description && req.body.description !== task.description) {
      req.body.summary = extractSummary(req.body.description) || task.summary
    }

    req.body.updated_at = new Date().toISOString()

    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'tasks',
      where: { id: taskId }, data: req.body
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (role !== 'admin') {
      return res.status(403).json({ error: '仅管理员可以删除任务' })
    }
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'tasks', where: { id: parseInt(req.params.id) }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── 任务状态操作 API ───

// 阻塞任务
app.post('/api/tasks/:id/block', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id)
    const { reason } = req.body

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: '阻塞原因不能为空' })
    }

    // 验证当前状态允许阻塞
    const current = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'tasks', where: { id: taskId }, limit: 1
    })
    if (!current.rows || current.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' })
    }
    const task = current.rows[0]

    if (!validateTransition(task.status, 'blocked')) {
      return res.status(400).json({ error: `当前状态 "${task.status}" 不允许阻塞` })
    }

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'tasks',
      where: { id: taskId },
      data: { status: 'blocked', blocked_reason: reason, updated_at: new Date().toISOString() }
    })
    res.json({ success: true, message: '任务已标记为阻塞' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 解除阻塞（必须解决阻塞问题才能继续）
app.post('/api/tasks/:id/unblock', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id)
    const { resolution } = req.body

    const current = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'tasks', where: { id: taskId }, limit: 1
    })
    if (!current.rows || current.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' })
    }
    const task = current.rows[0]

    if (task.status !== 'blocked') {
      return res.status(400).json({ error: '任务当前未处于阻塞状态' })
    }

    // 解除阻塞后回到 pending 状态
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'tasks',
      where: { id: taskId },
      data: { status: 'pending', blocked_reason: null, updated_at: new Date().toISOString() }
    })
    res.json({ success: true, message: '阻塞已解除，任务回到待处理状态' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 完成任务（阻塞执行：必须先解决阻塞）
app.post('/api/tasks/:id/complete', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id)

    const current = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'tasks', where: { id: taskId }, limit: 1
    })
    if (!current.rows || current.rows.length === 0) {
      return res.status(404).json({ error: '任务不存在' })
    }
    const task = current.rows[0]

    // 阻塞强制消除：如果任务处于阻塞状态，不允许直接完成
    if (task.status === 'blocked') {
      return res.status(400).json({ error: '您没有解决阻滞！请先解除阻塞再完成任务。' })
    }

    if (!validateTransition(task.status, 'completed')) {
      return res.status(400).json({ error: `当前状态 "${task.status}" 不允许直接完成` })
    }

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'tasks',
      where: { id: taskId },
      data: { status: 'completed', blocked_reason: null, updated_at: new Date().toISOString() }
    })

    // 如果有关联的工作流实例，尝试推进
    if (task.workflow_instance_id) {
      try {
        const tasks = await app.mcp.call('workflow.list_tasks', { status: 'pending' })
        const myTask = (tasks.tasks || []).find(t =>
          t.instance_id === task.workflow_instance_id && t.step_name === 'execute'
        )
        if (myTask) {
          await app.mcp.call('workflow.approve', {
            orgId: req.orgId, taskId: myTask.id, comment: '任务已完成'
          })
        }
      } catch (wfErr) {
        console.log(`[task] Workflow advance skipped: ${wfErr.message}`)
      }
    }

    res.json({ success: true, message: '任务已完成' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── 任务评论 API ───
app.get('/api/tasks/:id/comments', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'task_comments',
      where: { task_id: parseInt(req.params.id) },
      orderBy: 'created_at DESC', limit: 100
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/tasks/:id/comments', async (req, res) => {
  try {
    const { user_id, content } = req.body
    if (!content) return res.status(400).json({ error: '评论内容不能为空' })

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'task_comments',
      data: {
        task_id: parseInt(req.params.id),
        user_id: parseInt(user_id),
        content,
        created_at: new Date().toISOString()
      }
    })
    res.json({ id: result.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ─── 任务附件 API ───
app.get('/api/tasks/:id/attachments', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'task_attachments',
      where: { task_id: parseInt(req.params.id) },
      orderBy: 'created_at DESC', limit: 50
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/tasks/:id/attachments', async (req, res) => {
  try {
    const { file_url, file_name, uploaded_by } = req.body
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'task_attachments',
      data: {
        task_id: parseInt(req.params.id),
        file_url, file_name,
        uploaded_by: parseInt(uploaded_by),
        created_at: new Date().toISOString()
      }
    })
    res.json({ id: result.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 任务分配人 API
// ═══════════════════════════════════════
app.get('/api/assigners', (req, res) => listRecords(req, res, 'task_assigners'))

app.post('/api/assigners', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (role !== 'admin') return res.status(403).json({ error: '仅管理员可以管理任务分配人' })

    const { user_id } = req.body
    if (!user_id) return res.status(400).json({ error: '必须指定用户' })

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'task_assigners',
      data: { user_id: parseInt(user_id), is_active: true }
    })
    res.json({ id: result.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/assigners/:id', async (req, res) => {
  try {
    const role = getUserRole(req)
    if (role !== 'admin') return res.status(403).json({ error: '仅管理员可以管理任务分配人' })
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'task_assigners', where: { id: parseInt(req.params.id) }
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════
// 通知公告 API
// ═══════════════════════════════════════
app.get('/api/notices', async (req, res) => {
  try {
    const now = new Date().toISOString()
    // 查询未过期的通知
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'notices',
      orderBy: 'created_at DESC', limit: 50
    })
    // 过滤未过期的通知（包含永久有效的）
    const activeNotices = (result.rows || []).filter(n => {
      if (n.is_permanent) return true
      return new Date(n.expires_at) >= new Date(now)
    })
    res.json({ rows: activeNotices, count: activeNotices.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/notices', async (req, res) => {
  try {
    const { content, link, expires_at, is_permanent, created_by } = req.body
    if (!content) return res.status(400).json({ error: '通知内容不能为空' })

    // 长期有效时设置为 2099-12-31
    const finalExpiresAt = is_permanent
      ? '2099-12-31T23:59:59.000Z'
      : (expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'notices',
      data: {
        content, link: link || null,
        expires_at: finalExpiresAt,
        is_permanent: !!is_permanent,
        created_by: parseInt(created_by) || null
      }
    })
    res.json({ id: result.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/notices/:id', (req, res) => updateRecord(req, res, 'notices'))
app.delete('/api/notices/:id', (req, res) => deleteRecord(req, res, 'notices'))

// ═══════════════════════════════════════
// 看板 / 仪表盘 API
// ═══════════════════════════════════════

// 大盘：全局任务统计
app.get('/api/dashboard/macro', async (req, res) => {
  try {
    const tasks = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'tasks', limit: 10000
    })
    const rows = tasks.rows || []

    // 按状态统计
    const byStatus = { pending: 0, in_progress: 0, blocked: 0, completed: 0, cancelled: 0 }
    for (const task of rows) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1
    }

    // 按学校统计
    const bySchool = {}
    for (const task of rows) {
      const key = task.school_name || `学校#${task.school_id || '未知'}`
      bySchool[key] = (bySchool[key] || 0) + 1
    }

    // 按标签统计
    const byTag = {}
    for (const task of rows) {
      const tagIds = typeof task.tag_ids === 'string' ? JSON.parse(task.tag_ids || '[]') : (task.tag_ids || [])
      for (const tid of tagIds) {
        byTag[`标签#${tid}`] = (byTag[`标签#${tid}`] || 0) + 1
      }
    }

    // 按优先级统计
    const byPriority = { high: 0, normal: 0, low: 0 }
    for (const task of rows) {
      byPriority[task.priority || 'normal'] = (byPriority[task.priority || 'normal'] || 0) + 1
    }

    // 外勤任务统计
    const fieldTripCount = rows.filter(t => t.is_field_trip).length

    // 完成率
    const total = rows.length
    const completionRate = total > 0 ? Math.round((byStatus.completed / total) * 100) : 0

    res.json({
      total,
      byStatus,
      bySchool,
      byTag,
      byPriority,
      fieldTripCount,
      completionRate,
      activeCount: total - byStatus.completed - byStatus.cancelled
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 小盘：个人任务工作台
app.get('/api/dashboard/micro', async (req, res) => {
  try {
    const { user_id, date_from, date_to } = req.query
    if (!user_id) return res.status(400).json({ error: '必须指定执行人' })

    const uid = parseInt(user_id)

    // 查询 1：该执行人名下全部运行中任务
    const running = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'tasks',
      where: { assignee_id: uid, status: 'pending' },
      limit: 200
    })
    const runningInProgress = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'tasks',
      where: { assignee_id: uid, status: 'in_progress' },
      limit: 200
    })

    // 查询 2：该执行人名下在指定日期当天被修改过的任务
    let modifiedTasks = { rows: [] }
    if (date_from) {
      modifiedTasks = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'tasks',
        where: { assignee_id: uid },
        orderBy: 'updated_at DESC',
        limit: 200
      })
      // 按日期过滤
      const from = new Date(date_from)
      const to = date_to ? new Date(date_to) : new Date(from.getTime() + 24 * 60 * 60 * 1000)
      modifiedTasks.rows = (modifiedTasks.rows || []).filter(t => {
        const updated = new Date(t.updated_at)
        return updated >= from && updated <= to
      })
    }

    // 合并去重（按 ID）
    const allTasks = new Map()
    for (const t of [...(running.rows || []), ...(runningInProgress.rows || []), ...(modifiedTasks.rows || [])]) {
      allTasks.set(t.id, t)
    }

    // 剔除运行中且带外勤属性的任务（避免外出行程干扰工作量判断）
    const filtered = [...allTasks.values()].filter(t => {
      if (t.is_field_trip && (t.status === 'pending' || t.status === 'in_progress')) {
        return false
      }
      return true
    })

    res.json({ rows: filtered, count: filtered.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 外勤预告（首页自动提取）
app.get('/api/field-trips/announcements', async (req, res) => {
  try {
    const now = new Date()
    const windowStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 过去 3 天
    const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)   // 未来 7 天

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'tasks',
      where: { is_field_trip: true },
      limit: 100
    })

    const announcements = (result.rows || [])
      .filter(t => {
        if (!t.field_trip_date) return false
        const d = new Date(t.field_trip_date)
        return d >= windowStart && d <= windowEnd
      })
      .map(t => ({
        task_id: t.id,
        text: buildFieldTripAnnouncement(t),
        date: t.field_trip_date,
        period: t.field_trip_period,
        school_name: t.school_name,
        participants: t.participants,
        is_expired: (now - new Date(t.field_trip_date)) > (1 * 24 * 60 * 60 * 1000)
      }))

    res.json({ announcements, count: announcements.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 任务统计 API（按状态、按项目、按标签）
app.get('/api/statistics', async (req, res) => {
  try {
    const tasks = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'tasks', limit: 10000
    })
    const rows = tasks.rows || []

    // 按状态统计
    const statusCounts = {}
    for (const t of rows) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
    }

    // 按项目统计
    const projectCounts = {}
    for (const t of rows) {
      const key = t.project_id ? `项目#${t.project_id}` : '未分类'
      projectCounts[key] = (projectCounts[key] || 0) + 1
    }

    // 按标签统计
    const tagCounts = {}
    for (const t of rows) {
      const tagIds = typeof t.tag_ids === 'string' ? JSON.parse(t.tag_ids || '[]') : (t.tag_ids || [])
      for (const tid of tagIds) {
        tagCounts[`标签#${tid}`] = (tagCounts[`标签#${tid}`] || 0) + 1
      }
    }

    // 按执行人统计
    const assigneeCounts = {}
    for (const t of rows) {
      assigneeCounts[`用户#${t.assignee_id}`] = (assigneeCounts[`用户#${t.assignee_id}`] || 0) + 1
    }

    // 阻塞任务平均滞留时长
    const blockedTasks = rows.filter(t => t.status === 'blocked')
    let avgBlockedDays = 0
    if (blockedTasks.length > 0) {
      const totalBlockedMs = blockedTasks.reduce((sum, t) => {
        const blockedAt = new Date(t.updated_at)
        return sum + (Date.now() - blockedAt.getTime())
      }, 0)
      avgBlockedDays = Math.round(totalBlockedMs / blockedTasks.length / (1000 * 60 * 60 * 24) * 10) / 10
    }

    res.json({
      total: rows.length,
      statusCounts,
      projectCounts,
      tagCounts,
      assigneeCounts,
      avgBlockedDays,
      completionRate: rows.length > 0
        ? Math.round((statusCounts.completed || 0) / rows.length * 100)
        : 0
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// 甘特图数据（按时间线展示任务）
app.get('/api/gantt', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'tasks',
      orderBy: 'created_at ASC', limit: 200
    })

    const ganttData = (result.rows || []).map(t => ({
      id: t.id,
      title: t.title,
      assignee_id: t.assignee_id,
      status: t.status,
      start: t.created_at,
      end: t.expected_completion || t.created_at,
      progress: t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : t.status === 'blocked' ? 25 : 0,
      is_field_trip: t.is_field_trip,
      school_name: t.school_name,
      priority: t.priority
    }))

    res.json({ tasks: ganttData, count: ganttData.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
