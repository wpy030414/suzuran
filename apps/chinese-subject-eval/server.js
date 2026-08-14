import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'chinese-subject-eval', port: 8086 })

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

// ─── Table Definitions ───────────────────────────────────────────────
const TABLES = {
  evaluation_templates: [
    { name: 'template_type', type: 'text' },
    { name: 'grade_level', type: 'text' },
    { name: 'text_title', type: 'text' },
    { name: 'dimensions', type: 'jsonb' },
  ],
  classrooms: [
    { name: 'name', type: 'text' },
    { name: 'student_ids', type: 'jsonb' },
  ],
  assessment_records: [
    { name: 'academic_year', type: 'text' },
    { name: 'semester', type: 'text' },
    { name: 'classroom_id', type: 'integer' },
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'grade_level', type: 'text' },
    { name: 'template_id', type: 'integer' },
    { name: 'template_type', type: 'text' },
    { name: 'image_urls', type: 'jsonb', nullable: true },
    { name: 'dimension_evaluations', type: 'jsonb' },
    { name: 'highlights', type: 'jsonb', nullable: true },
    { name: 'assessed_at', type: 'timestamp' },
  ],
  report_cards: [
    { name: 'academic_year', type: 'text' },
    { name: 'semester', type: 'text' },
    { name: 'student_id', type: 'integer' },
    { name: 'student_name', type: 'text' },
    { name: 'classroom_name', type: 'text' },
    { name: 'composition_records', type: 'jsonb' },
    { name: 'oral_records', type: 'jsonb' },
    { name: 'total_composition_count', type: 'integer' },
    { name: 'total_oral_count', type: 'integer' },
  ],
}

// ─── Grade level name map ────────────────────────────────────────────
const GRADE_NAMES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']

function calculateGradeLevel(classroomName, academicYearStart) {
  const match = classroomName.match(/^(\d{4})级/)
  if (!match) return null
  const enrollmentYear = parseInt(match[1])
  const diff = academicYearStart - enrollmentYear
  if (diff < 0 || diff >= GRADE_NAMES.length) return null
  return GRADE_NAMES[diff]
}

function getCurrentAcademicCalendar() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()

  let baseYear
  if (month > 8 || (month === 8 && day >= 25)) {
    baseYear = year
  } else {
    baseYear = year - 1
  }

  const academicYear = `${baseYear}-${baseYear + 1}学年`
  const semester = (month >= 3 && month <= 7) ? '第二学期' : '第一学期'

  return { academicYear, semester, baseYear }
}

// ─── Seed Data ───────────────────────────────────────────────────────
function buildCompositionDimensions() {
  const dims = [
    {
      name: '创意与主题', key_points: '选题新颖、主题鲜明、有独到见解',
      standards: [
        { grade: '优秀', description: '选题新颖独特，主题鲜明突出，展现出丰富的想象力和独到的见解，能引起读者共鸣。' },
        { grade: '良好', description: '选题较有新意，主题明确，有一定的想象力和个人见解，内容较为吸引人。' },
        { grade: '较好', description: '选题有一定意义，主题基本明确，有简单的个人想法，内容较为完整。' },
        { grade: '中等', description: '选题较为普通，主题不够突出，缺乏个人创意，内容较为平淡。' },
        { grade: '加油', description: '选题偏离主题或无明确主题，缺乏创意，需要加强观察和想象力的培养。' },
      ],
    },
    {
      name: '内容与细节', key_points: '内容充实、细节生动、材料丰富',
      standards: [
        { grade: '优秀', description: '内容充实丰富，细节描写生动具体，材料选取典型且有说服力，读来如临其境。' },
        { grade: '良好', description: '内容较为充实，有一定的细节描写，材料较为丰富，能较好地表达主题。' },
        { grade: '较好', description: '内容基本完整，有一些细节描写，材料选取基本合理，能表达基本意思。' },
        { grade: '中等', description: '内容较为空洞，细节描写不足，材料选取不够典型，表达较为笼统。' },
        { grade: '加油', description: '内容空泛，缺乏细节描写，材料匮乏，需要加强观察力和素材积累。' },
      ],
    },
    {
      name: '情感与体验', key_points: '感情真挚、体验真实、有感染力',
      standards: [
        { grade: '优秀', description: '感情真挚动人，体验深刻真实，能打动读者心灵，具有强烈的感染力。' },
        { grade: '良好', description: '感情较为真挚，有一定的个人体验和感悟，能引起读者一定的共鸣。' },
        { grade: '较好', description: '感情基本真实，有简单的个人体验，表达较为自然。' },
        { grade: '中等', description: '感情表达较为生硬，缺乏真实体验，感染力不足。' },
        { grade: '加油', description: '感情虚假或缺失，没有个人体验的融入，需要培养真情实感的表达。' },
      ],
    },
    {
      name: '结构与表达', key_points: '结构完整、条理清晰、语言流畅',
      standards: [
        { grade: '优秀', description: '结构严谨完整，条理清晰有序，语言流畅优美，表达方式多样，过渡自然。' },
        { grade: '良好', description: '结构较为完整，条理较为清晰，语言较为流畅，有一定的表达技巧。' },
        { grade: '较好', description: '结构基本完整，条理基本清晰，语言基本通顺，能完整表达意思。' },
        { grade: '中等', description: '结构不够完整，条理不够清晰，语言较为生硬，表达有障碍。' },
        { grade: '加油', description: '结构混乱，条理不清，语言表达困难，需要加强写作基本功训练。' },
      ],
    },
    {
      name: '书写与格式', key_points: '书写工整、格式规范、卷面整洁',
      standards: [
        { grade: '优秀', description: '书写工整美观，格式完全规范，卷面干净整洁，标点符号使用准确。' },
        { grade: '良好', description: '书写较为工整，格式较为规范，卷面较为整洁，标点符号基本正确。' },
        { grade: '较好', description: '书写基本可辨认，格式基本规范，卷面基本整洁，有个别格式错误。' },
        { grade: '中等', description: '书写较为潦草，格式有较多不规范之处，卷面不够整洁。' },
        { grade: '加油', description: '书写难以辨认，格式混乱，卷面脏乱，需要加强书写习惯的培养。' },
      ],
    },
  ]
  return dims
}

function buildOralDimensions() {
  const dims = [
    {
      name: '内容(说什么)', key_points: '内容完整、有条理、有重点',
      standards: [
        { grade: '优秀/良好', description: '内容完整充实，条理清晰，重点突出，能围绕主题展开表达，信息量丰富。' },
        { grade: '较好/中等', description: '内容基本完整，有一定条理，能基本围绕主题表达，但重点不够突出。' },
        { grade: '加油', description: '内容不完整或偏离主题，缺乏条理，需要加强内容组织和主题聚焦能力。' },
      ],
    },
    {
      name: '表达(怎么说)', key_points: '语言流畅、声音洪亮、语速适当',
      standards: [
        { grade: '优秀/良好', description: '语言流畅自然，声音洪亮清晰，语速适当，用词准确，表达生动有感染力。' },
        { grade: '较好/中等', description: '语言基本流畅，声音基本清晰，语速基本适当，用词基本准确，但表达较为平淡。' },
        { grade: '加油', description: '语言不流畅或声音过小，语速不当，用词不准确，需要加强口语表达基本功。' },
      ],
    },
    {
      name: '态度(怎么沟通)', key_points: '态度大方、眼神交流、倾听回应',
      standards: [
        { grade: '优秀/良好', description: '态度大方自然，有良好的眼神交流，善于倾听和回应，展现出积极的沟通态度。' },
        { grade: '较好/中等', description: '态度较为自然，有一定的眼神交流，能基本倾听和回应，但互动不够积极。' },
        { grade: '加油', description: '态度拘谨或不够认真，缺乏眼神交流，不善于倾听，需要培养良好的沟通态度。' },
      ],
    },
    {
      name: '效果(沟通结果)', key_points: '达成目标、引发思考、获得认同',
      standards: [
        { grade: '优秀/良好', description: '有效达成沟通目标，能引发听者思考，获得广泛认同，沟通效果显著。' },
        { grade: '较好/中等', description: '基本达成沟通目标，能传达主要信息，获得一定认同，但效果一般。' },
        { grade: '加油', description: '未能达成沟通目标，信息传达不清，缺乏说服力，需要加强沟通效果的意识。' },
      ],
    },
  ]
  return dims
}

async function seedData(orgId) {
  // Check if already seeded
  const existing = await app.mcp.call('data.query', {
    orgId, tableName: 'evaluation_templates', limit: 1,
  })
  if (existing.rows && existing.rows.length > 0) {
    console.log('[seed] Data already exists, skipping')
    return
  }

  // Seed composition template
  await app.mcp.call('data.insert', {
    orgId, tableName: 'evaluation_templates',
    data: {
      template_type: 'composition',
      grade_level: '三年级',
      text_title: '我的植物朋友',
      dimensions: JSON.stringify(buildCompositionDimensions()),
    },
  })
  console.log('[seed] Composition template created')

  // Seed oral template
  await app.mcp.call('data.insert', {
    orgId, tableName: 'evaluation_templates',
    data: {
      template_type: 'oral',
      grade_level: '三年级',
      text_title: '春游去哪儿玩',
      dimensions: JSON.stringify(buildOralDimensions()),
    },
  })
  console.log('[seed] Oral template created')

  // Seed sample classroom
  const sampleStudents = [
    { id: 1, name: '小明' },
    { id: 2, name: '小红' },
    { id: 3, name: '小刚' },
    { id: 4, name: '小丽' },
    { id: 5, name: '小华' },
  ]
  await app.mcp.call('data.insert', {
    orgId, tableName: 'classrooms',
    data: {
      name: '2023级01班',
      student_ids: JSON.stringify(sampleStudents),
    },
  })
  console.log('[seed] Sample classroom created')
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
  await seedData(app.orgId)
})

// ─── Generic CRUD helpers ────────────────────────────────────────────
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

// ─── Templates ───────────────────────────────────────────────────────
app.get('/api/templates', (req, res) => listRecords(req, res, 'evaluation_templates'))

app.get('/api/templates/by-type', async (req, res) => {
  try {
    const { type, grade } = req.query
    const where = {}
    if (type) where.template_type = type
    if (grade) where.grade_level = grade
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_templates', where, limit: 100,
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/templates', async (req, res) => {
  try {
    const { template_type, grade_level, text_title, dimensions } = req.body
    if (!template_type || !['composition', 'oral'].includes(template_type)) {
      return res.status(400).json({ error: '模板类型必须是 composition 或 oral' })
    }
    if (!grade_level) return res.status(400).json({ error: '年级不能为空' })
    if (!text_title) return res.status(400).json({ error: '课文标题不能为空' })

    const dims = typeof dimensions === 'string' ? JSON.parse(dimensions) : dimensions
    if (!Array.isArray(dims)) return res.status(400).json({ error: '维度必须是数组' })

    const expectedDimCount = template_type === 'composition' ? 5 : 4
    const expectedGradeCount = template_type === 'composition' ? 5 : 3

    if (dims.length !== expectedDimCount) {
      return res.status(400).json({ error: `${template_type === 'composition' ? '习作' : '口语'}模板必须包含 ${expectedDimCount} 个维度` })
    }

    for (const dim of dims) {
      if (!dim.name || !dim.standards || !Array.isArray(dim.standards)) {
        return res.status(400).json({ error: '每个维度必须包含 name 和 standards' })
      }
      if (dim.standards.length !== expectedGradeCount) {
        return res.status(400).json({ error: `每个维度必须包含 ${expectedGradeCount} 个等级标准` })
      }
      for (const std of dim.standards) {
        if (!std.grade || !std.description) {
          return res.status(400).json({ error: '每个等级标准必须包含 grade 和 description' })
        }
      }
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'evaluation_templates',
      data: {
        template_type,
        grade_level,
        text_title,
        dimensions: JSON.stringify(dims),
      },
    })
    res.json({ id: result.id, template_type, grade_level, text_title, dimensions: dims })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/templates/:id', (req, res) => updateRecord(req, res, 'evaluation_templates'))
app.delete('/api/templates/:id', (req, res) => deleteRecord(req, res, 'evaluation_templates'))

// ─── Classrooms ──────────────────────────────────────────────────────
app.get('/api/classrooms', (req, res) => listRecords(req, res, 'classrooms'))

app.post('/api/classrooms', async (req, res) => {
  try {
    const { name, student_ids } = req.body
    if (!name) return res.status(400).json({ error: '班级名称不能为空' })
    if (!/^\d{4}级/.test(name)) {
      return res.status(400).json({ error: '班级名称必须以4位入学年份开头，如 2023级01班' })
    }
    const students = student_ids || []
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'classrooms',
      data: { name, student_ids: JSON.stringify(students) },
    })
    res.json({ id: result.id, name, student_ids: students })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/classrooms/:id/students', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'classrooms',
      where: { id: parseInt(req.params.id) }, limit: 1,
    })
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '班级不存在' })
    }
    const classroom = result.rows[0]
    const students = typeof classroom.student_ids === 'string'
      ? JSON.parse(classroom.student_ids) : classroom.student_ids
    res.json({ classroom_id: classroom.id, name: classroom.name, students: students || [] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/classrooms/:id', async (req, res) => {
  try {
    const { name, student_ids } = req.body
    const data = {}
    if (name !== undefined) {
      if (!/^\d{4}级/.test(name)) {
        return res.status(400).json({ error: '班级名称必须以4位入学年份开头' })
      }
      data.name = name
    }
    if (student_ids !== undefined) data.student_ids = JSON.stringify(student_ids)
    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'classrooms',
      where: { id: parseInt(req.params.id) }, data,
    })
    res.json({ success: true, count: result.count })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/classrooms/:id', (req, res) => deleteRecord(req, res, 'classrooms'))

// ─── Academic Calendar ───────────────────────────────────────────────
app.get('/api/academic-calendar/current', (req, res) => {
  const cal = getCurrentAcademicCalendar()
  res.json(cal)
})

// ─── Assessments ─────────────────────────────────────────────────────
app.get('/api/assessments', (req, res) => listRecords(req, res, 'assessment_records'))

app.get('/api/assessments/by-student', async (req, res) => {
  try {
    const { student_id, academic_year, semester } = req.query
    const where = {}
    if (student_id) where.student_id = parseInt(student_id)
    if (academic_year) where.academic_year = academic_year
    if (semester) where.semester = semester
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assessment_records', where,
      orderBy: 'assessed_at', limit: 1000,
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/assessments', async (req, res) => {
  try {
    const {
      academic_year, semester, classroom_id, student_id, student_name,
      template_id, template_type, image_urls, dimension_evaluations, highlights,
    } = req.body

    if (!academic_year || !semester) return res.status(400).json({ error: '学年和学期不能为空' })
    if (!classroom_id) return res.status(400).json({ error: '班级不能为空' })
    if (!student_id) return res.status(400).json({ error: '学生不能为空' })
    if (!template_id) return res.status(400).json({ error: '模板不能为空' })

    // Validate student belongs to classroom
    const classroomResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'classrooms',
      where: { id: parseInt(classroom_id) }, limit: 1,
    })
    if (!classroomResult.rows || classroomResult.rows.length === 0) {
      return res.status(400).json({ error: '班级不存在' })
    }
    const classroom = classroomResult.rows[0]
    const students = typeof classroom.student_ids === 'string'
      ? JSON.parse(classroom.student_ids) : classroom.student_ids
    const studentExists = (students || []).some(s => s.id === parseInt(student_id))
    if (!studentExists) {
      return res.status(400).json({ error: '该学生不属于所选班级' })
    }

    // Auto-calculate grade_level
    const yearMatch = academic_year.match(/^(\d{4})-/)
    if (!yearMatch) return res.status(400).json({ error: '学年格式不正确' })
    const academicYearStart = parseInt(yearMatch[1])
    const grade_level = calculateGradeLevel(classroom.name, academicYearStart)
    if (!grade_level) {
      return res.status(400).json({ error: '无法根据班级名称计算年级' })
    }

    // Get template and auto-generate comments
    const templateResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'evaluation_templates',
      where: { id: parseInt(template_id) }, limit: 1,
    })
    if (!templateResult.rows || templateResult.rows.length === 0) {
      return res.status(400).json({ error: '模板不存在' })
    }
    const template = templateResult.rows[0]
    const templateDims = typeof template.dimensions === 'string'
      ? JSON.parse(template.dimensions) : template.dimensions

    const evals = typeof dimension_evaluations === 'string'
      ? JSON.parse(dimension_evaluations) : dimension_evaluations
    if (!Array.isArray(evals)) {
      return res.status(400).json({ error: '维度评价必须是数组' })
    }

    // Auto-generate comments from template standards
    const enrichedEvals = evals.map(ev => {
      const dimTemplate = templateDims.find(d => d.name === ev.dimension)
      let generated_comment = ''
      if (dimTemplate && ev.teacher_grade) {
        const standard = dimTemplate.standards.find(s => s.grade === ev.teacher_grade)
        if (standard) generated_comment = standard.description
      }
      return {
        dimension: ev.dimension,
        student_grade: ev.student_grade || '',
        teacher_grade: ev.teacher_grade || '',
        generated_comment,
      }
    })

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'assessment_records',
      data: {
        academic_year,
        semester,
        classroom_id: parseInt(classroom_id),
        student_id: parseInt(student_id),
        student_name: student_name || '',
        grade_level,
        template_id: parseInt(template_id),
        template_type: template_type || template.template_type,
        image_urls: JSON.stringify(image_urls || []),
        dimension_evaluations: JSON.stringify(enrichedEvals),
        highlights: JSON.stringify(highlights || []),
        assessed_at: new Date().toISOString(),
      },
    })

    res.json({
      id: result.id,
      academic_year, semester, classroom_id, student_id, student_name,
      grade_level, template_id, dimension_evaluations: enrichedEvals,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/assessments/:id', (req, res) => updateRecord(req, res, 'assessment_records'))
app.delete('/api/assessments/:id', (req, res) => deleteRecord(req, res, 'assessment_records'))

// ─── Report Cards ────────────────────────────────────────────────────
app.get('/api/report-cards', (req, res) => listRecords(req, res, 'report_cards'))

app.get('/api/report-cards/detail/:id', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'report_cards',
      where: { id: parseInt(req.params.id) }, limit: 1,
    })
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '成绩单不存在' })
    }
    const card = result.rows[0]
    const compositionRecords = typeof card.composition_records === 'string'
      ? JSON.parse(card.composition_records) : card.composition_records
    const oralRecords = typeof card.oral_records === 'string'
      ? JSON.parse(card.oral_records) : card.oral_records
    res.json({
      ...card,
      composition_records: compositionRecords || [],
      oral_records: oralRecords || [],
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/report-cards/generate', async (req, res) => {
  try {
    const { student_id, academic_year, semester, classroom_id } = req.body
    if (!student_id || !academic_year || !semester) {
      return res.status(400).json({ error: '学生ID、学年和学期不能为空' })
    }

    // Get student info from classroom
    let studentName = ''
    let classroomName = ''
    if (classroom_id) {
      const cr = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'classrooms',
        where: { id: parseInt(classroom_id) }, limit: 1,
      })
      if (cr.rows && cr.rows.length > 0) {
        classroomName = cr.rows[0].name
        const students = typeof cr.rows[0].student_ids === 'string'
          ? JSON.parse(cr.rows[0].student_ids) : cr.rows[0].student_ids
        const stu = (students || []).find(s => s.id === parseInt(student_id))
        if (stu) studentName = stu.name
      }
    }

    // Pull all assessments for this student in this period
    const assessments = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assessment_records',
      where: {
        student_id: parseInt(student_id),
        academic_year,
        semester,
      },
      limit: 1000,
    })

    const compositionRecords = []
    const oralRecords = []

    for (const record of (assessments.rows || [])) {
      const dimEvals = typeof record.dimension_evaluations === 'string'
        ? JSON.parse(record.dimension_evaluations) : record.dimension_evaluations
      const imgs = typeof record.image_urls === 'string'
        ? JSON.parse(record.image_urls) : record.image_urls
      const hlts = typeof record.highlights === 'string'
        ? JSON.parse(record.highlights) : record.highlights

      // Get template info for text_title
      const tplResult = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'evaluation_templates',
        where: { id: record.template_id }, limit: 1,
      })
      const textTitle = (tplResult.rows && tplResult.rows.length > 0) ? tplResult.rows[0].text_title : ''

      const recordData = {
        id: record.id,
        template_id: record.template_id,
        text_title: textTitle,
        image_urls: imgs || [],
        dimension_evaluations: dimEvals || [],
        highlights: hlts || [],
        assessed_at: record.assessed_at,
      }

      if (record.template_type === 'composition') {
        compositionRecords.push(recordData)
      } else if (record.template_type === 'oral') {
        oralRecords.push(recordData)
      }
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'report_cards',
      data: {
        academic_year,
        semester,
        student_id: parseInt(student_id),
        student_name: studentName,
        classroom_name: classroomName,
        composition_records: JSON.stringify(compositionRecords),
        oral_records: JSON.stringify(oralRecords),
        total_composition_count: compositionRecords.length,
        total_oral_count: oralRecords.length,
      },
    })

    res.json({
      id: result.id,
      academic_year, semester,
      student_name: studentName,
      classroom_name: classroomName,
      composition_records: compositionRecords,
      oral_records: oralRecords,
      total_composition_count: compositionRecords.length,
      total_oral_count: oralRecords.length,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/report-cards/:id', (req, res) => updateRecord(req, res, 'report_cards'))
app.delete('/api/report-cards/:id', (req, res) => deleteRecord(req, res, 'report_cards'))

// ─── Statistics ──────────────────────────────────────────────────────
app.get('/api/stats/composition', async (req, res) => {
  try {
    const assessments = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assessment_records',
      where: { template_type: 'composition' }, limit: 10000,
    })
    const gradeDistribution = {}
    const templateCount = {}
    const studentSet = new Set()

    for (const record of (assessments.rows || [])) {
      studentSet.add(record.student_id)
      const tplKey = `template_${record.template_id}`
      templateCount[tplKey] = (templateCount[tplKey] || 0) + 1

      const evals = typeof record.dimension_evaluations === 'string'
        ? JSON.parse(record.dimension_evaluations) : record.dimension_evaluations
      for (const ev of (evals || [])) {
        const grade = ev.teacher_grade || '未评'
        gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1
      }
    }

    res.json({
      total_count: (assessments.rows || []).length,
      student_count: studentSet.size,
      grade_distribution: gradeDistribution,
      template_count: templateCount,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/stats/oral', async (req, res) => {
  try {
    const assessments = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'assessment_records',
      where: { template_type: 'oral' }, limit: 10000,
    })
    const gradeDistribution = {}
    const templateCount = {}
    const studentSet = new Set()

    for (const record of (assessments.rows || [])) {
      studentSet.add(record.student_id)
      const tplKey = `template_${record.template_id}`
      templateCount[tplKey] = (templateCount[tplKey] || 0) + 1

      const evals = typeof record.dimension_evaluations === 'string'
        ? JSON.parse(record.dimension_evaluations) : record.dimension_evaluations
      for (const ev of (evals || [])) {
        const grade = ev.teacher_grade || '未评'
        gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1
      }
    }

    res.json({
      total_count: (assessments.rows || []).length,
      student_count: studentSet.size,
      grade_distribution: gradeDistribution,
      template_count: templateCount,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
