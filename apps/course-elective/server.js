import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'course-elective', port: 8082 })

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
  elective_courses: [
    { name: 'name', type: 'text' },
    { name: 'duration_type', type: 'text' },     // '30min' | '60min' | '90min'
    { name: 'duration_minutes', type: 'integer' }, // actual minutes for calculation
    { name: 'grade_levels', type: 'jsonb' },      // [3, 4] means suitable for grade 3 & 4
    { name: 'capacity', type: 'integer' },         // total seats
    { name: 'enrolled_count', type: 'integer' },   // current enrolled count
    { name: 'description', type: 'text', nullable: true },
    { name: 'teacher_id', type: 'integer', nullable: true },
    { name: 'teacher_name', type: 'text', nullable: true },
    { name: 'category', type: 'text', nullable: true },
    { name: 'schedule_info', type: 'text', nullable: true }, // e.g. "每周三下午第3-4节"
    { name: 'status', type: 'text' },              // 'active' | 'closed' | 'draft'
  ],
  enrollments: [
    { name: 'student_name', type: 'text' },
    { name: 'student_grade', type: 'integer' },
    { name: 'student_classroom', type: 'text' },
    { name: 'course_id', type: 'integer' },
    { name: 'course_name', type: 'text', nullable: true },
    { name: 'course_duration_type', type: 'text', nullable: true },
    { name: 'course_duration_minutes', type: 'integer', nullable: true },
    { name: 'enrolled_at', type: 'timestamp' },
    { name: 'status', type: 'text' },             // 'enrolled' | 'dropped'
  ],
  enrollment_periods: [
    { name: 'name', type: 'text' },
    { name: 'start_time', type: 'timestamp' },
    { name: 'end_time', type: 'timestamp' },
    { name: 'status', type: 'text' },             // 'active' | 'closed' | 'upcoming'
    { name: 'allowed_grades', type: 'jsonb', nullable: true },
  ],
  course_categories: [
    { name: 'name', type: 'text' },
    { name: 'max_per_student', type: 'integer' },  // max courses of this type per student
    { name: 'duration_minutes', type: 'integer' },  // duration for this category
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
    const userRole = req.userRole || 'student'
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

// --- Elective Courses ---
app.get('/api/courses', async (req, res) => {
  try {
    const where = {}
    if (req.query.status) where.status = req.query.status
    else where.status = 'active'
    if (req.query.category) where.category = req.query.category

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'elective_courses', where,
      orderBy: req.query.orderBy || 'name',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0'),
    })

    // Filter by grade level if specified
    let rows = result.rows || []
    if (req.query.grade_level) {
      const grade = parseInt(req.query.grade_level)
      rows = rows.filter(c => {
        const levels = typeof c.grade_levels === 'string' ? JSON.parse(c.grade_levels) : c.grade_levels
        return Array.isArray(levels) && levels.includes(grade)
      })
    }

    // Calculate remaining seats for each course
    const enriched = rows.map(c => ({
      ...c,
      remaining_seats: Math.max(0, (c.capacity || 0) - (c.enrolled_count || 0)),
      is_full: (c.enrolled_count || 0) >= (c.capacity || 0),
    }))

    res.json({ rows: enriched, total: enriched.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.get('/api/courses/:id', (req, res) => getRecord(req, res, 'elective_courses'))
app.post('/api/courses', requireRole('admin'), async (req, res) => {
  const err = validateRequired(req.body, ['name', 'duration_type', 'capacity'])
  if (err) return res.status(400).json({ error: err })

  // Validate capacity
  if (req.body.capacity <= 0) return res.status(400).json({ error: '席位必须大于0' })
  if (req.body.capacity > 200) return res.status(400).json({ error: '席位不能超过200' })

  // Set default enrolled_count
  const data = { ...req.body, enrolled_count: req.body.enrolled_count || 0, status: req.body.status || 'active' }

  // Calculate duration_minutes from duration_type if not provided
  if (!data.duration_minutes && data.duration_type) {
    const match = data.duration_type.match(/(\d+)/)
    if (match) data.duration_minutes = parseInt(match[1])
  }

  createRecord(req, res, 'elective_courses')
})
app.put('/api/courses/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'elective_courses'))
app.delete('/api/courses/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'elective_courses'))

// Helper to get a single record
async function getRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName, where: { id: parseInt(req.params.id) }, limit: 1,
    })
    if (result.rows && result.rows.length > 0) res.json(result.rows[0])
    else res.status(404).json({ error: 'Not found' })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// --- Enrollments ---
app.get('/api/enrollments', async (req, res) => {
  try {
    const where = {}
    if (req.query.student_name) where.student_name = req.query.student_name
    if (req.query.student_grade) where.student_grade = parseInt(req.query.student_grade)
    if (req.query.student_classroom) where.student_classroom = req.query.student_classroom
    if (req.query.course_id) where.course_id = parseInt(req.query.course_id)
    if (req.query.status) where.status = req.query.status
    else where.status = 'enrolled'

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'enrollments', where,
      orderBy: req.query.orderBy || 'enrolled_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0'),
    })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/enrollments - Enhanced with full business rule validation
app.post('/api/enrollments', async (req, res) => {
  try {
    const { student_name, student_grade, student_classroom, course_id } = req.body

    // 1. Validate required fields
    const err = validateRequired(req.body, ['student_name', 'student_grade', 'student_classroom', 'course_id'])
    if (err) return res.status(400).json({ error: err })

    // 2. Get course details
    const courseResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'elective_courses',
      where: { id: parseInt(course_id) }, limit: 1,
    })
    if (!courseResult.rows || courseResult.rows.length === 0) {
      return res.status(404).json({ error: '课程不存在' })
    }
    const course = courseResult.rows[0]

    // 3. Check course is active
    if (course.status !== 'active') {
      return res.status(400).json({ error: '该课程已关闭或尚未开放' })
    }

    // 4. Check grade eligibility
    const gradeLevels = typeof course.grade_levels === 'string'
      ? JSON.parse(course.grade_levels) : course.grade_levels
    if (Array.isArray(gradeLevels) && gradeLevels.length > 0) {
      if (!gradeLevels.includes(parseInt(student_grade))) {
        return res.status(400).json({ error: `该课程仅适合 ${gradeLevels.join(', ')} 年级` })
      }
    }

    // 5. Check if already enrolled in this course
    const existingEnrollment = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'enrollments',
      where: {
        student_name,
        student_grade: parseInt(student_grade),
        course_id: parseInt(course_id),
        status: 'enrolled',
      },
      limit: 1,
    })
    if (existingEnrollment.rows && existingEnrollment.rows.length > 0) {
      return res.status(400).json({ error: '您不能选择空白的课程！' })
    }

    // 6. Check capacity (remaining seats)
    if ((course.enrolled_count || 0) >= (course.capacity || 0)) {
      return res.status(400).json({ error: '该课程已满员，您不能选择！' })
    }

    // 7. Get student's existing enrollments
    const studentEnrollments = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'enrollments',
      where: {
        student_name,
        student_grade: parseInt(student_grade),
        status: 'enrolled',
      },
      limit: 100,
    })
    const existingCourses = (studentEnrollments.rows || [])

    // 8. Check same duration_type constraint (同类型限一门)
    const sameTypeEnrollments = existingCourses.filter(e => e.course_duration_type === course.duration_type)
    if (sameTypeEnrollments.length > 0) {
      return res.status(400).json({ error: '您不能选择多个同种类型的课程！' })
    }

    // 9. Check total duration <= 90 minutes
    const totalMinutes = existingCourses.reduce((sum, e) => sum + (e.course_duration_minutes || 0), 0)
    const courseMinutes = course.duration_minutes || parseInt((course.duration_type || '').match(/(\d+)/)?.[1] || '0')
    if (totalMinutes + courseMinutes > 90) {
      return res.status(400).json({ error: `您不能选择合计超过90分钟的课程！当前已选 ${totalMinutes} 分钟，本课程 ${courseMinutes} 分钟` })
    }

    // 10. Create enrollment
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'enrollments',
      data: {
        student_name,
        student_grade: parseInt(student_grade),
        student_classroom,
        course_id: parseInt(course_id),
        course_name: course.name,
        course_duration_type: course.duration_type,
        course_duration_minutes: courseMinutes,
        enrolled_at: new Date().toISOString(),
        status: 'enrolled',
      },
    })

    // 11. Update enrolled count
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'elective_courses',
      where: { id: parseInt(course_id) },
      data: { enrolled_count: (course.enrolled_count || 0) + 1 },
    })

    res.json({
      id: result.id,
      student_name,
      course_id: parseInt(course_id),
      course_name: course.name,
      duration_minutes: courseMinutes,
      total_minutes: totalMinutes + courseMinutes,
      remaining_seats: course.capacity - course.enrolled_count - 1,
      status: 'enrolled',
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Drop enrollment
app.delete('/api/enrollments/:id', async (req, res) => {
  try {
    const enrollment = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'enrollments',
      where: { id: parseInt(req.params.id) }, limit: 1,
    })
    if (!enrollment.rows || enrollment.rows.length === 0) {
      return res.status(404).json({ error: '选课记录不存在' })
    }
    const enr = enrollment.rows[0]
    if (enr.status !== 'enrolled') {
      return res.status(400).json({ error: '该选课记录已退选' })
    }

    // Update enrollment status
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'enrollments',
      where: { id: parseInt(req.params.id) },
      data: { status: 'dropped' },
    })

    // Decrease enrolled count
    const course = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'elective_courses',
      where: { id: enr.course_id }, limit: 1,
    })
    if (course.rows && course.rows.length > 0) {
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'elective_courses',
        where: { id: enr.course_id },
        data: { enrolled_count: Math.max(0, (course.rows[0].enrolled_count || 1) - 1) },
      })
    }

    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Enrollment Periods ---
app.get('/api/periods', (req, res) => listRecords(req, res, 'enrollment_periods'))
app.get('/api/periods/active', async (req, res) => {
  try {
    const now = new Date().toISOString()
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'enrollment_periods',
      where: { status: 'active' }, limit: 10,
    })
    // Also check time-based active
    const active = (result.rows || []).filter(p =>
      p.start_time <= now && p.end_time >= now
    )
    res.json({ rows: active, is_open: active.length > 0 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.post('/api/periods', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['name', 'start_time', 'end_time'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'enrollment_periods')
})
app.put('/api/periods/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'enrollment_periods'))
app.delete('/api/periods/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'enrollment_periods'))

// --- Course Categories ---
app.get('/api/categories', (req, res) => listRecords(req, res, 'course_categories'))
app.post('/api/categories', requireRole('admin'), (req, res) => {
  const err = validateRequired(req.body, ['name', 'max_per_student'])
  if (err) return res.status(400).json({ error: err })
  createRecord(req, res, 'course_categories')
})
app.put('/api/categories/:id', requireRole('admin'), (req, res) => updateRecord(req, res, 'course_categories'))
app.delete('/api/categories/:id', requireRole('admin'), (req, res) => deleteRecord(req, res, 'course_categories'))

// --- Student's enrollments ---
app.get('/api/students/:studentName/enrollments', async (req, res) => {
  try {
    const where = { student_name: req.params.studentName, status: 'enrolled' }
    if (req.query.grade) where.student_grade = parseInt(req.query.grade)
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'enrollments', where, limit: 100,
    })

    const rows = result.rows || []
    const totalMinutes = rows.reduce((sum, e) => sum + (e.course_duration_minutes || 0), 0)

    res.json({
      rows,
      total_courses: rows.length,
      total_minutes: totalMinutes,
      remaining_capacity: 90 - totalMinutes,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// --- Statistics & Reports ---

// Enrollment statistics by course
app.get('/api/stats/by-course', async (req, res) => {
  try {
    const courses = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'elective_courses', limit: 500,
    })
    const enrollments = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'enrollments', where: { status: 'enrolled' }, limit: 10000,
    })

    const enrollByCourse = {}
    for (const e of (enrollments.rows || [])) {
      enrollByCourse[e.course_id] = (enrollByCourse[e.course_id] || 0) + 1
    }

    const stats = (courses.rows || []).map(c => ({
      course_id: c.id,
      course_name: c.name,
      duration_type: c.duration_type,
      capacity: c.capacity,
      enrolled: enrollByCourse[c.id] || c.enrolled_count || 0,
      remaining: Math.max(0, c.capacity - (enrollByCourse[c.id] || c.enrolled_count || 0)),
      fill_rate: c.capacity > 0
        ? ((enrollByCourse[c.id] || c.enrolled_count || 0) / c.capacity * 100).toFixed(1)
        : 0,
    }))

    res.json({ rows: stats.sort((a, b) => b.fill_rate - a.fill_rate) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Enrollment statistics by classroom
app.get('/api/stats/by-classroom', async (req, res) => {
  try {
    const enrollments = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'enrollments', where: { status: 'enrolled' }, limit: 10000,
    })

    const byClassroom = {}
    for (const e of (enrollments.rows || [])) {
      const key = `${e.student_grade}-${e.student_classroom}`
      if (!byClassroom[key]) {
        byClassroom[key] = { grade: e.student_grade, classroom: e.student_classroom, students: new Set(), courses: [] }
      }
      byClassroom[key].students.add(e.student_name)
      byClassroom[key].courses.push(e.course_name)
    }

    const stats = Object.values(byClassroom).map(s => ({
      grade: s.grade,
      classroom: s.classroom,
      student_count: s.students.size,
      total_enrollments: s.courses.length,
      avg_courses_per_student: s.students.size > 0 ? (s.courses.length / s.students.size).toFixed(1) : 0,
    }))

    res.json({ rows: stats.sort((a, b) => a.grade - b.grade || a.classroom.localeCompare(b.classroom)) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Student list for a specific course (for roll call)
app.get('/api/stats/course-students/:courseId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId)
    const enrollments = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'enrollments',
      where: { course_id: courseId, status: 'enrolled' },
      orderBy: 'student_grade, student_classroom, student_name',
      limit: 500,
    })

    const course = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'elective_courses',
      where: { id: courseId }, limit: 1,
    })

    res.json({
      course: course.rows?.[0] || null,
      students: (enrollments.rows || []).map(e => ({
        name: e.student_name,
        grade: e.student_grade,
        classroom: e.student_classroom,
        enrolled_at: e.enrolled_at,
      })),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Export: CSV data for course student lists
app.get('/api/export/course-students/:courseId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId)
    const enrollments = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'enrollments',
      where: { course_id: courseId, status: 'enrolled' },
      orderBy: 'student_grade, student_classroom, student_name',
      limit: 500,
    })
    const course = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'elective_courses',
      where: { id: courseId }, limit: 1,
    })

    const csvRows = [['课程名称', course.rows?.[0]?.name || ''], ['序号', '年级', '班级', '姓名', '选课时间']]
    ;(enrollments.rows || []).forEach((e, i) => {
      csvRows.push([i + 1, e.student_grade, e.student_classroom, e.student_name, e.enrolled_at])
    })

    res.json({ format: 'csv', data: csvRows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.start()
