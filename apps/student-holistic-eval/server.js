import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'student-holistic-eval', port: 8088 })

const frontendDist = join(__dirname, 'frontend', 'dist')

// Static file serving
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

// Schema definition
const TABLES = {
  classrooms: [
    { name: 'name', type: 'text' },
    { name: 'campus', type: 'text' },
    { name: 'academic_year', type: 'text' },
  ],
  students: [
    { name: 'classroom_id', type: 'integer' },
    { name: 'name', type: 'text' },
    { name: 'student_no', type: 'text' },
    { name: 'gender', type: 'text', nullable: true },
  ],
  behavior_evaluations: [
    { name: 'academic_year', type: 'text' },
    { name: 'semester', type: 'text' },
    { name: 'campus', type: 'text' },
    { name: 'classroom_name', type: 'text' },
    { name: 'evaluator_name', type: 'text' },
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'student_no', type: 'text' },
    { name: 'ai_stars', type: 'jsonb' },
    { name: 'overall_stars', type: 'integer' },
    { name: 'comment', type: 'text', nullable: true },
  ],
  learning_evaluations: [
    { name: 'academic_year', type: 'text' },
    { name: 'semester', type: 'text' },
    { name: 'campus', type: 'text' },
    { name: 'classroom_name', type: 'text' },
    { name: 'teacher_name', type: 'text' },
    { name: 'subject', type: 'text' },
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'student_no', type: 'text' },
    { name: 'daily_grade', type: 'text', nullable: true },
    { name: 'midterm_grade', type: 'text', nullable: true },
    { name: 'final_grade', type: 'text', nullable: true },
    { name: 'total_grade', type: 'text', nullable: true },
    { name: 'interest_1', type: 'integer', nullable: true },
    { name: 'interest_2', type: 'integer', nullable: true },
    { name: 'interest_3', type: 'integer', nullable: true },
    { name: 'habit_1', type: 'integer', nullable: true },
    { name: 'habit_2', type: 'integer', nullable: true },
    { name: 'habit_3', type: 'integer', nullable: true },
    { name: 'habit_4', type: 'integer', nullable: true },
    { name: 'overall_stars', type: 'integer', nullable: true },
    { name: 'comment', type: 'text', nullable: true },
  ],
  evaluation_templates: [
    { name: 'title', type: 'text' },
    { name: 'image_url', type: 'text' },
  ],
  comprehensive_reports: [
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'student_no', type: 'text' },
    { name: 'classroom_name', type: 'text' },
    { name: 'academic_year', type: 'text' },
    { name: 'campus', type: 'text' },
    { name: 'behavior_data', type: 'jsonb' },
    { name: 'learning_data', type: 'jsonb' },
    { name: 'generated_at', type: 'timestamp' },
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

// Constants
const VALID_DIMENSIONS = ['爱', '律', '礼', '勤', '洁']
const VALID_SUBJECTS = ['语文', '数学', '英语', '音乐', '体育', '美术', '科学', '道法', '信息科技']
const VALID_GRADES = ['优', '良', '达标', '待达标']
const VALID_SEMESTERS = ['上学期', '下学期']

// Helper functions
function getUserContext(req) {
  return {
    userId: parseInt(req.headers['x-user-id'] || '0'),
    userName: req.headers['x-user-name'] || '',
    userRole: req.headers['x-user-role'] || 'teacher',
  }
}

function validateRequired(body, fields) {
  const missing = fields.filter(f => body[f] === undefined || body[f] === null || body[f] === '')
  if (missing.length > 0) return `缺少必填字段: ${missing.join(', ')}`
  return null
}

function validateStarRating(value, fieldName) {
  const num = parseInt(value)
  if (isNaN(num) || num < 1 || num > 5) {
    return `${fieldName} 必须是 1-5 的整数`
  }
  return null
}

function validateGrade(value, fieldName) {
  if (value && !VALID_GRADES.includes(value)) {
    return `${fieldName} 必须是 ${VALID_GRADES.join('/')} 之一`
  }
  return null
}

// Determine segment based on classroom name
function determineSegment(classroomName) {
  // Classroom name should start with year, e.g., "2024级3班"
  const match = classroomName.match(/^(\d{4})级.*?(\d+)班/)
  if (!match) return '中高段' // Default to 中高段 if format is invalid

  const year = parseInt(match[1])
  const classNum = parseInt(match[2])

  // Calculate grade level: academic_year_start - class_name_start + 1
  // For simplicity, we use class number as grade indicator
  // Classes 1-2 are 低段, 3+ are 中高段
  if (classNum <= 2) return '低段'
  return '中高段'
}

// Get subjects based on segment
function getSubjectsBySegment(segment) {
  const baseSubjects = ['语文', '数学', '英语', '音乐', '体育', '美术', '科学', '道法']
  if (segment === '中高段') {
    return [...baseSubjects, '信息科技']
  }
  return baseSubjects
}

// Generic CRUD helpers
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

// ==================== Classrooms ====================
app.get('/api/classrooms', (req, res) => listRecords(req, res, 'classrooms'))

app.post('/api/classrooms', async (req, res) => {
  try {
    const user = getUserContext(req)
    if (user.userRole !== 'admin') {
      return res.status(403).json({ error: '只有管理员可以创建班级' })
    }

    const error = validateRequired(req.body, ['name', 'campus', 'academic_year'])
    if (error) return res.status(400).json({ error: error })

    // Validate classroom name format (should start with year)
    if (!/^\d{4}级/.test(req.body.name)) {
      return res.status(400).json({ error: '班级名称必须以年份开头，例如：2024级1班' })
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'classrooms', data: req.body,
    })
    res.json({ id: result.id, ...req.body })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/classrooms/:id', (req, res) => updateRecord(req, res, 'classrooms'))
app.delete('/api/classrooms/:id', async (req, res) => {
  try {
    const user = getUserContext(req)
    if (user.userRole !== 'admin') {
      return res.status(403).json({ error: '只有管理员可以删除班级' })
    }
    await deleteRecord(req, res, 'classrooms')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ==================== Students ====================
app.get('/api/students', (req, res) => listRecords(req, res, 'students'))

app.get('/api/students/by-classroom', async (req, res) => {
  try {
    const classroomId = parseInt(req.query.classroom_id)
    if (!classroomId) {
      return res.status(400).json({ error: '缺少 classroom_id 参数' })
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'students',
      where: { classroom_id: classroomId },
      orderBy: 'student_no ASC',
      limit: 1000,
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/students', async (req, res) => {
  try {
    const user = getUserContext(req)
    if (user.userRole !== 'admin' && user.userRole !== '班主任') {
      return res.status(403).json({ error: '只有管理员或班主任可以添加学生' })
    }

    const error = validateRequired(req.body, ['classroom_id', 'name', 'student_no'])
    if (error) return res.status(400).json({ error: error })

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'students', data: req.body,
    })
    res.json({ id: result.id, ...req.body })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/students/:id', (req, res) => updateRecord(req, res, 'students'))
app.delete('/api/students/:id', async (req, res) => {
  try {
    const user = getUserContext(req)
    if (user.userRole !== 'admin' && user.userRole !== '班主任') {
      return res.status(403).json({ error: '只有管理员或班主任可以删除学生' })
    }
    await deleteRecord(req, res, 'students')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ==================== Behavior Evaluations ====================
app.get('/api/behavior-evaluations', (req, res) => listRecords(req, res, 'behavior_evaluations'))

app.get('/api/behavior-evaluations/by-student', async (req, res) => {
  try {
    const studentId = parseInt(req.query.student_id)
    const academicYear = req.query.academic_year

    if (!studentId || !academicYear) {
      return res.status(400).json({ error: '缺少 student_id 或 academic_year 参数' })
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'behavior_evaluations',
      where: { student_id: studentId, academic_year: academicYear },
      orderBy: 'semester ASC',
      limit: 1000,
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/behavior-evaluations', async (req, res) => {
  try {
    const user = getUserContext(req)
    if (user.userRole !== 'admin' && user.userRole !== '班主任') {
      return res.status(403).json({ error: '只有管理员或班主任可以提交行为评价' })
    }

    const body = req.body
    const error = validateRequired(body, ['academic_year', 'semester', 'campus', 'classroom_name', 'evaluator_name', 'student_id', 'student_name', 'student_no', 'ai_stars', 'overall_stars'])
    if (error) return res.status(400).json({ error: error })

    // Validate semester
    if (!VALID_SEMESTERS.includes(body.semester)) {
      return res.status(400).json({ error: `学期必须是 ${VALID_SEMESTERS.join('/')} 之一` })
    }

    // Validate ai_stars
    if (typeof body.ai_stars !== 'object' || body.ai_stars === null) {
      return res.status(400).json({ error: 'ai_stars 必须是对象' })
    }

    for (const dim of VALID_DIMENSIONS) {
      if (body.ai_stars[dim] === undefined) {
        return res.status(400).json({ error: `缺少维度 "${dim}" 的星级评价` })
      }
      const starError = validateStarRating(body.ai_stars[dim], `维度 "${dim}"`)
      if (starError) return res.status(400).json({ error: starError })
    }

    // Validate overall_stars
    const overallError = validateStarRating(body.overall_stars, '总评星级')
    if (overallError) return res.status(400).json({ error: overallError })

    // Verify student exists
    const studentCheck = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'students',
      where: { id: parseInt(body.student_id) },
      limit: 1,
    })
    if (!studentCheck.rows || studentCheck.rows.length === 0) {
      return res.status(400).json({ error: '学生不存在' })
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'behavior_evaluations', data: body,
    })
    res.json({ id: result.id, ...body })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/behavior-evaluations/batch', async (req, res) => {
  try {
    const user = getUserContext(req)
    if (user.userRole !== 'admin' && user.userRole !== '班主任') {
      return res.status(403).json({ error: '只有管理员或班主任可以批量提交行为评价' })
    }

    const evaluations = req.body.evaluations
    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return res.status(400).json({ error: 'evaluations 必须是非空数组' })
    }

    const results = []
    const errors = []

    for (let i = 0; i < evaluations.length; i++) {
      const body = evaluations[i]
      try {
        // Validate each evaluation
        const error = validateRequired(body, ['academic_year', 'semester', 'campus', 'classroom_name', 'evaluator_name', 'student_id', 'student_name', 'student_no', 'ai_stars', 'overall_stars'])
        if (error) {
          errors.push({ index: i, error: error })
          continue
        }

        if (!VALID_SEMESTERS.includes(body.semester)) {
          errors.push({ index: i, error: `学期必须是 ${VALID_SEMESTERS.join('/')} 之一` })
          continue
        }

        if (typeof body.ai_stars !== 'object' || body.ai_stars === null) {
          errors.push({ index: i, error: 'ai_stars 必须是对象' })
          continue
        }

        let hasStarError = false
        for (const dim of VALID_DIMENSIONS) {
          if (body.ai_stars[dim] === undefined) {
            errors.push({ index: i, error: `缺少维度 "${dim}" 的星级评价` })
            hasStarError = true
            break
          }
          const starError = validateStarRating(body.ai_stars[dim], `维度 "${dim}"`)
          if (starError) {
            errors.push({ index: i, error: starError })
            hasStarError = true
            break
          }
        }
        if (hasStarError) continue

        const overallError = validateStarRating(body.overall_stars, '总评星级')
        if (overallError) {
          errors.push({ index: i, error: overallError })
          continue
        }

        const result = await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'behavior_evaluations', data: body,
        })
        results.push({ id: result.id, ...body })
      } catch (e) {
        errors.push({ index: i, error: e.message })
      }
    }

    res.json({ success: results.length, errors: errors, data: results })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/behavior-evaluations/:id', (req, res) => updateRecord(req, res, 'behavior_evaluations'))
app.delete('/api/behavior-evaluations/:id', (req, res) => deleteRecord(req, res, 'behavior_evaluations'))

// ==================== Learning Evaluations ====================
app.get('/api/learning-evaluations', (req, res) => listRecords(req, res, 'learning_evaluations'))

app.get('/api/learning-evaluations/by-student', async (req, res) => {
  try {
    const studentId = parseInt(req.query.student_id)
    const academicYear = req.query.academic_year

    if (!studentId || !academicYear) {
      return res.status(400).json({ error: '缺少 student_id 或 academic_year 参数' })
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'learning_evaluations',
      where: { student_id: studentId, academic_year: academicYear },
      orderBy: 'subject ASC, semester ASC',
      limit: 1000,
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/learning-evaluations', async (req, res) => {
  try {
    const user = getUserContext(req)
    if (user.userRole !== 'admin' && user.userRole !== '任课教师') {
      return res.status(403).json({ error: '只有管理员或任课教师可以提交学习评价' })
    }

    const body = req.body
    const error = validateRequired(body, ['academic_year', 'semester', 'campus', 'classroom_name', 'teacher_name', 'subject', 'student_id', 'student_name', 'student_no'])
    if (error) return res.status(400).json({ error: error })

    // Validate semester
    if (!VALID_SEMESTERS.includes(body.semester)) {
      return res.status(400).json({ error: `学期必须是 ${VALID_SEMESTERS.join('/')} 之一` })
    }

    // Validate subject
    if (!VALID_SUBJECTS.includes(body.subject)) {
      return res.status(400).json({ error: `科目必须是 ${VALID_SUBJECTS.join('/')} 之一` })
    }

    // Validate grades
    const gradeFields = ['daily_grade', 'midterm_grade', 'final_grade', 'total_grade']
    for (const field of gradeFields) {
      if (body[field]) {
        const gradeError = validateGrade(body[field], field)
        if (gradeError) return res.status(400).json({ error: gradeError })
      }
    }

    // Validate star ratings
    const starFields = ['interest_1', 'interest_2', 'interest_3', 'habit_1', 'habit_2', 'habit_3', 'habit_4', 'overall_stars']
    for (const field of starFields) {
      if (body[field] !== null && body[field] !== undefined) {
        const starError = validateStarRating(body[field], field)
        if (starError) return res.status(400).json({ error: starError })
      }
    }

    // Verify student exists
    const studentCheck = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'students',
      where: { id: parseInt(body.student_id) },
      limit: 1,
    })
    if (!studentCheck.rows || studentCheck.rows.length === 0) {
      return res.status(400).json({ error: '学生不存在' })
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'learning_evaluations', data: body,
    })
    res.json({ id: result.id, ...body })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/learning-evaluations/batch', async (req, res) => {
  try {
    const user = getUserContext(req)
    if (user.userRole !== 'admin' && user.userRole !== '任课教师') {
      return res.status(403).json({ error: '只有管理员或任课教师可以批量提交学习评价' })
    }

    const evaluations = req.body.evaluations
    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return res.status(400).json({ error: 'evaluations 必须是非空数组' })
    }

    const results = []
    const errors = []

    for (let i = 0; i < evaluations.length; i++) {
      const body = evaluations[i]
      try {
        const error = validateRequired(body, ['academic_year', 'semester', 'campus', 'classroom_name', 'teacher_name', 'subject', 'student_id', 'student_name', 'student_no'])
        if (error) {
          errors.push({ index: i, error: error })
          continue
        }

        if (!VALID_SEMESTERS.includes(body.semester)) {
          errors.push({ index: i, error: `学期必须是 ${VALID_SEMESTERS.join('/')} 之一` })
          continue
        }

        if (!VALID_SUBJECTS.includes(body.subject)) {
          errors.push({ index: i, error: `科目必须是 ${VALID_SUBJECTS.join('/')} 之一` })
          continue
        }

        let hasError = false
        const gradeFields = ['daily_grade', 'midterm_grade', 'final_grade', 'total_grade']
        for (const field of gradeFields) {
          if (body[field]) {
            const gradeError = validateGrade(body[field], field)
            if (gradeError) {
              errors.push({ index: i, error: gradeError })
              hasError = true
              break
            }
          }
        }
        if (hasError) continue

        const starFields = ['interest_1', 'interest_2', 'interest_3', 'habit_1', 'habit_2', 'habit_3', 'habit_4', 'overall_stars']
        for (const field of starFields) {
          if (body[field] !== null && body[field] !== undefined) {
            const starError = validateStarRating(body[field], field)
            if (starError) {
              errors.push({ index: i, error: starError })
              hasError = true
              break
            }
          }
        }
        if (hasError) continue

        const result = await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'learning_evaluations', data: body,
        })
        results.push({ id: result.id, ...body })
      } catch (e) {
        errors.push({ index: i, error: e.message })
      }
    }

    res.json({ success: results.length, errors: errors, data: results })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/learning-evaluations/:id', (req, res) => updateRecord(req, res, 'learning_evaluations'))
app.delete('/api/learning-evaluations/:id', (req, res) => deleteRecord(req, res, 'learning_evaluations'))

// ==================== Evaluation Templates ====================
app.get('/api/templates', (req, res) => listRecords(req, res, 'evaluation_templates'))

app.get('/api/template-images', async (req, res) => {
  try {
    const segment = req.query.segment
    if (!segment) {
      return res.status(400).json({ error: '缺少 segment 参数' })
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_templates',
      where: {},
      orderBy: 'title ASC',
      limit: 1000,
    })

    // Filter by segment in title
    const filtered = (result.rows || []).filter(t => t.title.includes(segment))
    res.json({ rows: filtered, count: filtered.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/templates', async (req, res) => {
  try {
    const user = getUserContext(req)
    if (user.userRole !== 'admin') {
      return res.status(403).json({ error: '只有管理员可以管理模板' })
    }

    const error = validateRequired(req.body, ['title', 'image_url'])
    if (error) return res.status(400).json({ error: error })

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'evaluation_templates', data: req.body,
    })
    res.json({ id: result.id, ...req.body })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/templates/:id', async (req, res) => {
  try {
    const user = getUserContext(req)
    if (user.userRole !== 'admin') {
      return res.status(403).json({ error: '只有管理员可以管理模板' })
    }
    await updateRecord(req, res, 'evaluation_templates')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/templates/:id', async (req, res) => {
  try {
    const user = getUserContext(req)
    if (user.userRole !== 'admin') {
      return res.status(403).json({ error: '只有管理员可以管理模板' })
    }
    await deleteRecord(req, res, 'evaluation_templates')
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ==================== Comprehensive Reports ====================
app.get('/api/reports', (req, res) => listRecords(req, res, 'comprehensive_reports'))

app.get('/api/reports/:id', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'comprehensive_reports',
      where: { id: parseInt(req.params.id) },
      limit: 1,
    })
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '报告不存在' })
    }
    res.json(result.rows[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/reports/generate', async (req, res) => {
  try {
    const body = req.body
    const error = validateRequired(body, ['academic_year', 'campus', 'classroom_name', 'student_name', 'student_no'])
    if (error) return res.status(400).json({ error: error })

    // Find student by name and student_no
    const studentResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'students',
      where: { name: body.student_name, student_no: body.student_no },
      limit: 1,
    })

    if (!studentResult.rows || studentResult.rows.length === 0) {
      return res.status(404).json({ error: '学生不存在' })
    }

    const student = studentResult.rows[0]

    // Determine segment
    const segment = determineSegment(body.classroom_name)
    const subjects = getSubjectsBySegment(segment)

    // Fetch behavior evaluations for both semesters
    const behaviorResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'behavior_evaluations',
      where: {
        student_id: student.id,
        student_name: body.student_name,
        student_no: body.student_no,
        academic_year: body.academic_year,
      },
      orderBy: 'semester ASC',
      limit: 1000,
    })

    // Fetch learning evaluations for both semesters
    const learningResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'learning_evaluations',
      where: {
        student_id: student.id,
        student_name: body.student_name,
        student_no: body.student_no,
        academic_year: body.academic_year,
      },
      orderBy: 'subject ASC, semester ASC',
      limit: 1000,
    })

    // Organize behavior data by semester
    const behaviorData = {
      '上学期': null,
      '下学期': null,
    }
    for (const b of (behaviorResult.rows || [])) {
      behaviorData[b.semester] = b
    }

    // Organize learning data by subject and semester
    const learningData = {}
    for (const subject of subjects) {
      learningData[subject] = {
        '上学期': null,
        '下学期': null,
      }
    }
    for (const l of (learningResult.rows || [])) {
      if (learningData[l.subject]) {
        learningData[l.subject][l.semester] = l
      }
    }

    // Fetch template images for this segment
    const templatesResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_templates',
      where: {},
      limit: 1000,
    })
    const templateImages = (templatesResult.rows || []).filter(t => t.title.includes(segment))

    // Assemble report
    const reportData = {
      student_id: student.id,
      student_name: body.student_name,
      student_no: body.student_no,
      classroom_name: body.classroom_name,
      academic_year: body.academic_year,
      campus: body.campus,
      segment: segment,
      behavior_data: JSON.stringify(behaviorData),
      learning_data: JSON.stringify(learningData),
      template_images: templateImages,
      generated_at: new Date().toISOString(),
    }

    // Save report
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'comprehensive_reports',
      data: reportData,
    })

    res.json({ id: result.id, ...reportData })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/reports/:id', (req, res) => deleteRecord(req, res, 'comprehensive_reports'))

// ==================== Statistics ====================
app.get('/api/stats/behavior', async (req, res) => {
  try {
    const academicYear = req.query.academic_year
    const campus = req.query.campus
    const classroomName = req.query.classroom_name

    const where = {}
    if (academicYear) where.academic_year = academicYear
    if (campus) where.campus = campus
    if (classroomName) where.classroom_name = classroomName

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'behavior_evaluations',
      where: where,
      limit: 10000,
    })

    // Calculate average stars per dimension
    const dimensionStats = {}
    for (const dim of VALID_DIMENSIONS) {
      dimensionStats[dim] = { total: 0, count: 0, average: 0 }
    }

    for (const row of (result.rows || [])) {
      if (row.ai_stars && typeof row.ai_stars === 'object') {
        for (const dim of VALID_DIMENSIONS) {
          if (row.ai_stars[dim]) {
            dimensionStats[dim].total += parseInt(row.ai_stars[dim])
            dimensionStats[dim].count++
          }
        }
      }
    }

    for (const dim of VALID_DIMENSIONS) {
      if (dimensionStats[dim].count > 0) {
        dimensionStats[dim].average = dimensionStats[dim].total / dimensionStats[dim].count
      }
    }

    res.json({ dimension_stats: dimensionStats, total_evaluations: (result.rows || []).length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/stats/learning', async (req, res) => {
  try {
    const academicYear = req.query.academic_year
    const campus = req.query.campus
    const classroomName = req.query.classroom_name
    const subject = req.query.subject

    const where = {}
    if (academicYear) where.academic_year = academicYear
    if (campus) where.campus = campus
    if (classroomName) where.classroom_name = classroomName
    if (subject) where.subject = subject

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'learning_evaluations',
      where: where,
      limit: 10000,
    })

    // Calculate grade distribution per subject
    const subjectStats = {}
    for (const subj of VALID_SUBJECTS) {
      subjectStats[subj] = {
        '优': 0, '良': 0, '达标': 0, '待达标': 0, total: 0
      }
    }

    for (const row of (result.rows || [])) {
      if (row.total_grade && subjectStats[row.subject]) {
        subjectStats[row.subject][row.total_grade]++
        subjectStats[row.subject].total++
      }
    }

    res.json({ subject_stats: subjectStats, total_evaluations: (result.rows || []).length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/stats/cross-dimensional', async (req, res) => {
  try {
    const studentId = req.query.student_id
    const classroomName = req.query.classroom_name
    const academicYear = req.query.academic_year

    if (!studentId && !classroomName) {
      return res.status(400).json({ error: '需要提供 student_id 或 classroom_name' })
    }

    let behaviorWhere = {}
    let learningWhere = {}

    if (studentId) {
      behaviorWhere.student_id = parseInt(studentId)
      learningWhere.student_id = parseInt(studentId)
    }
    if (classroomName) {
      behaviorWhere.classroom_name = classroomName
      learningWhere.classroom_name = classroomName
    }
    if (academicYear) {
      behaviorWhere.academic_year = academicYear
      learningWhere.academic_year = academicYear
    }

    const behaviorResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'behavior_evaluations',
      where: behaviorWhere,
      limit: 10000,
    })

    const learningResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'learning_evaluations',
      where: learningWhere,
      limit: 10000,
    })

    // Calculate correlation data
    const correlationData = []

    if (studentId) {
      // For a single student, calculate average behavior stars and average learning stars
      let behaviorTotal = 0, behaviorCount = 0
      for (const b of (behaviorResult.rows || [])) {
        if (b.overall_stars) {
          behaviorTotal += parseInt(b.overall_stars)
          behaviorCount++
        }
      }
      const avgBehavior = behaviorCount > 0 ? behaviorTotal / behaviorCount : 0

      let learningTotal = 0, learningCount = 0
      for (const l of (learningResult.rows || [])) {
        if (l.overall_stars) {
          learningTotal += parseInt(l.overall_stars)
          learningCount++
        }
      }
      const avgLearning = learningCount > 0 ? learningTotal / learningCount : 0

      correlationData.push({
        type: 'student',
        behavior_avg: avgBehavior,
        learning_avg: avgLearning,
      })
    } else {
      // For a class, calculate per-student correlation
      const studentMap = {}
      for (const b of (behaviorResult.rows || [])) {
        if (!studentMap[b.student_id]) {
          studentMap[b.student_id] = { behavior: [], learning: [] }
        }
        if (b.overall_stars) {
          studentMap[b.student_id].behavior.push(parseInt(b.overall_stars))
        }
      }
      for (const l of (learningResult.rows || [])) {
        if (!studentMap[l.student_id]) {
          studentMap[l.student_id] = { behavior: [], learning: [] }
        }
        if (l.overall_stars) {
          studentMap[l.student_id].learning.push(parseInt(l.overall_stars))
        }
      }

      for (const [sid, data] of Object.entries(studentMap)) {
        const avgBehavior = data.behavior.length > 0 ? data.behavior.reduce((a, b) => a + b, 0) / data.behavior.length : 0
        const avgLearning = data.learning.length > 0 ? data.learning.reduce((a, b) => a + b, 0) / data.learning.length : 0

        correlationData.push({
          student_id: parseInt(sid),
          behavior_avg: avgBehavior,
          learning_avg: avgLearning,
        })
      }
    }

    res.json({ correlation_data: correlationData })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
