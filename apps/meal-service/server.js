import { createApp } from '@suzuran/sdk'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = createApp({ name: 'meal-service', port: 8097 })
const frontendDist = join(__dirname, 'frontend', 'dist')

// ============================================================
// Table Definitions
// ============================================================
const TABLES = {
  user_roles: [
    { name: 'user_id', type: 'integer' },
    { name: 'user_name', type: 'text' },
    { name: 'role', type: 'text' },
    { name: 'campus_id', type: 'integer', nullable: true }
  ],
  meal_periods: [
    { name: 'name', type: 'text' },
    { name: 'academic_year', type: 'text' },
    { name: 'semester', type: 'text' },
    { name: 'code', type: 'text' },
    { name: 'start_date', type: 'date' },
    { name: 'end_date', type: 'date' }
  ],
  meal_registrations: [
    { name: 'user_id', type: 'integer' },
    { name: 'user_name', type: 'text' },
    { name: 'period_id', type: 'integer' },
    { name: 'registration_code', type: 'text' },
    { name: 'registered_at', type: 'timestamp' }
  ],
  daily_orders: [
    { name: 'user_id', type: 'integer' },
    { name: 'user_name', type: 'text' },
    { name: 'date', type: 'date' },
    { name: 'meal_type', type: 'text' },
    { name: 'ordered_at', type: 'timestamp' }
  ],
  daily_meal_status: [
    { name: 'user_id', type: 'integer' },
    { name: 'user_name', type: 'text' },
    { name: 'date', type: 'date' },
    { name: 'meal_type', type: 'text' },
    { name: 'consumed', type: 'integer' },
    { name: 'verified_by', type: 'integer' },
    { name: 'verified_at', type: 'timestamp' }
  ],
  meal_review_records: [
    { name: 'date', type: 'date' },
    { name: 'meal_type', type: 'text' },
    { name: 'reviewer_id', type: 'integer' },
    { name: 'total_ordered', type: 'integer' },
    { name: 'total_consumed', type: 'integer' },
    { name: 'total_absent', type: 'integer' },
    { name: 'notes', type: 'text', nullable: true }
  ]
}

// ============================================================
// Table Initialization
// ============================================================
app.onStart(async () => {
  for (const [tableName, columns] of Object.entries(TABLES)) {
    try {
      await app.mcp.call('data.create_table', { orgId: app.orgId, tableName, columns })
      console.log(`[init] Table '${tableName}' ready`)
    } catch (e) {
      console.log(`[init] Table '${tableName}' already exists or error: ${e.message}`)
    }
  }
})

// ============================================================
// Helpers
// ============================================================
function getCurrentUser(req) {
  return {
    userId: parseInt(req.headers['x-user-id'] || '0'),
    userName: req.headers['x-user-name'] || '',
    role: req.headers['x-user-role'] || 'student'
  }
}

function requireAdmin(req, res) {
  const user = getCurrentUser(req)
  if (user.role !== 'admin' && user.role !== 'staff') {
    res.status(403).json({ error: '需要管理员或工作人员权限' })
    return null
  }
  return user
}

function applyRoleFilter(where, req) {
  const user = getCurrentUser(req)
  if (user.role === 'student' || user.role === 'parent') {
    where.user_id = user.userId
  }
  return { where, user }
}

async function queryAll(req, tableName, where = {}, orderBy = '') {
  const all = []
  let offset = 0
  const limit = 500
  while (true) {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName, where, limit, offset, orderBy
    })
    const rows = result.rows || []
    all.push(...rows)
    if (rows.length < limit) break
    offset += limit
  }
  return all
}

function filterInMemory(rows, filters) {
  return rows.filter(row => {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '' && String(row[key]) !== String(value)) {
        return false
      }
    }
    return true
  })
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function nowISO() {
  return new Date().toISOString()
}

// ============================================================
// Static File Serving
// ============================================================
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

// ============================================================
// Health Check
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', appId: req.appId, orgId: req.orgId })
})

// ============================================================
// Auth / Context
// ============================================================
app.get('/api/me', (req, res) => {
  const user = getCurrentUser(req)
  if (!user.userId) {
    return res.status(401).json({ error: '未登录' })
  }
  res.json(user)
})

// ============================================================
// User Management (admin only)
// ============================================================
app.get('/api/users', async (req, res) => {
  try {
    const rows = await queryAll(req, 'user_roles')
    res.json({ rows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/users', async (req, res) => {
  try {
    requireAdmin(req, res)
    const { user_id, user_name, role, campus_id } = req.body
    const existing = await queryAll(req, 'user_roles', { user_id: parseInt(user_id) })
    if (existing.length > 0) {
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'user_roles',
        where: { id: existing[0].id },
        data: { user_name, role, campus_id: campus_id || null }
      })
      res.json({ success: true, id: existing[0].id })
    } else {
      const result = await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'user_roles',
        data: { user_id: parseInt(user_id), user_name, role, campus_id: campus_id || null }
      })
      res.json({ id: result.id, ...req.body })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ============================================================
// Meal Periods
// ============================================================
app.get('/api/periods', async (req, res) => {
  try {
    const rows = await queryAll(req, 'meal_periods', {}, 'start_date')
    res.json({ rows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/periods', async (req, res) => {
  try {
    const { name, academic_year, semester, start_date, end_date } = req.body
    const code = (academic_year || '').substring(0, 4) + (semester === '第二学期' ? 'B' : 'A')
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'meal_periods',
      data: { name, academic_year, semester, code, start_date, end_date }
    })
    res.json({ id: result.id, name, academic_year, semester, code, start_date, end_date })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/periods/:id', async (req, res) => {
  try {
    requireAdmin(req, res)
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'meal_periods',
      where: { id: parseInt(req.params.id) }
    })
    res.json({ success: true, count: result.count })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ============================================================
// Registrations
// ============================================================
app.get('/api/registrations', async (req, res) => {
  try {
    const { where } = applyRoleFilter({}, req)
    const rows = await queryAll(req, 'meal_registrations', where, 'registered_at')
    res.json({ rows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/registrations', async (req, res) => {
  try {
    const user = getCurrentUser(req)
    const { period_id } = req.body
    const periods = await queryAll(req, 'meal_periods')
    const period = periods.find(p => p.id === parseInt(period_id))
    if (!period) {
      return res.status(400).json({ error: '学期不存在' })
    }

    const existing = await queryAll(req, 'meal_registrations', {
      user_id: user.userId,
      period_id: parseInt(period_id)
    })

    if (existing.length > 0) {
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'meal_registrations',
        where: { id: existing[0].id },
        data: {
          user_name: user.userName,
          registration_code: period.code,
          registered_at: nowISO()
        }
      })
      res.json({ ...existing[0], user_name: user.userName, registration_code: period.code })
    } else {
      const result = await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'meal_registrations',
        data: {
          user_id: user.userId,
          user_name: user.userName,
          period_id: parseInt(period_id),
          registration_code: period.code,
          registered_at: nowISO()
        }
      })
      res.json({
        id: result.id, user_id: user.userId, user_name: user.userName,
        period_id: parseInt(period_id), registration_code: period.code
      })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ============================================================
// Daily Orders
// ============================================================
app.get('/api/orders', async (req, res) => {
  try {
    const { where, user } = applyRoleFilter({}, req)
    let rows = await queryAll(req, 'daily_orders', where, 'date')
    rows = filterInMemory(rows, {
      date: req.query.date,
      meal_type: req.query.meal_type
    })
    res.json({ rows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/orders', async (req, res) => {
  try {
    const user = getCurrentUser(req)
    const { meal_type, date: inputDate } = req.body
    const date = inputDate || todayStr()

    const existing = await queryAll(req, 'daily_orders', {
      user_id: user.userId, date, meal_type
    })
    if (existing.length > 0) {
      return res.json({ idempotent: true, ...existing[0] })
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'daily_orders',
      data: {
        user_id: user.userId, user_name: user.userName,
        date, meal_type, ordered_at: nowISO()
      }
    })
    res.json({
      id: result.id, user_id: user.userId, user_name: user.userName,
      date, meal_type, ordered_at: nowISO()
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/orders/batch', async (req, res) => {
  try {
    requireAdmin(req, res)
    const { orders } = req.body
    const results = []
    for (const order of orders) {
      const date = order.date || todayStr()
      const existing = await queryAll(req, 'daily_orders', {
        user_id: parseInt(order.user_id), date, meal_type: order.meal_type
      })
      if (existing.length > 0) {
        results.push({ idempotent: true, ...existing[0] })
        continue
      }
      const result = await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'daily_orders',
        data: {
          user_id: parseInt(order.user_id),
          user_name: order.user_name || '',
          date, meal_type: order.meal_type,
          ordered_at: nowISO()
        }
      })
      results.push({ id: result.id, ...order, date })
    }
    res.json({ results })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ============================================================
// Meal Status
// ============================================================
app.get('/api/status', async (req, res) => {
  try {
    const { where, user } = applyRoleFilter({}, req)
    let rows = await queryAll(req, 'daily_meal_status', where, 'date')
    rows = filterInMemory(rows, {
      date: req.query.date,
      meal_type: req.query.meal_type
    })
    res.json({ rows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/status', async (req, res) => {
  try {
    const user = getCurrentUser(req)
    const { user_id, user_name, date, meal_type, consumed } = req.body

    const existing = await queryAll(req, 'daily_meal_status', {
      user_id: parseInt(user_id), date, meal_type
    })

    if (existing.length > 0) {
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'daily_meal_status',
        where: { id: existing[0].id },
        data: { consumed: consumed ? 1 : 0, verified_by: user.userId, verified_at: nowISO() }
      })
      res.json({ ...existing[0], consumed: consumed ? 1 : 0 })
    } else {
      const result = await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'daily_meal_status',
        data: {
          user_id: parseInt(user_id), user_name: user_name || '',
          date, meal_type, consumed: consumed ? 1 : 0,
          verified_by: user.userId, verified_at: nowISO()
        }
      })
      res.json({ id: result.id, user_id, date, meal_type, consumed: consumed ? 1 : 0 })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/status/batch', async (req, res) => {
  try {
    const user = getCurrentUser(req)
    const { statuses } = req.body
    const results = []
    for (const s of statuses) {
      const existing = await queryAll(req, 'daily_meal_status', {
        user_id: parseInt(s.user_id), date: s.date, meal_type: s.meal_type
      })
      if (existing.length > 0) {
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'daily_meal_status',
          where: { id: existing[0].id },
          data: { consumed: s.consumed ? 1 : 0, verified_by: user.userId, verified_at: nowISO() }
        })
        results.push({ ...existing[0], consumed: s.consumed ? 1 : 0 })
      } else {
        const result = await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'daily_meal_status',
          data: {
            user_id: parseInt(s.user_id), user_name: s.user_name || '',
            date: s.date, meal_type: s.meal_type,
            consumed: s.consumed ? 1 : 0,
            verified_by: user.userId, verified_at: nowISO()
          }
        })
        results.push({ id: result.id, ...s })
      }
    }
    res.json({ results })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ============================================================
// Statistics
// ============================================================
app.get('/api/stats/overview', async (req, res) => {
  try {
    const registrations = await queryAll(req, 'meal_registrations')
    const today = todayStr()
    const orders = await queryAll(req, 'daily_orders', { date: today })
    const status = await queryAll(req, 'daily_meal_status', { date: today })
    const totalRegistered = registrations.length
    const todayOrdered = orders.length
    const todayConsumed = status.filter(s => s.consumed === 1 || s.consumed === true).length
    const todayOrderRate = totalRegistered > 0 ? Math.round((todayOrdered / totalRegistered) * 100) : 0
    res.json({ total_registered: totalRegistered, today_ordered: todayOrdered, today_consumed: todayConsumed, today_order_rate: todayOrderRate })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/stats/daily', async (req, res) => {
  try {
    const { start_date, end_date, meal_type } = req.query
    let orders = await queryAll(req, 'daily_orders')
    let status = await queryAll(req, 'daily_meal_status')
    if (start_date) {
      orders = orders.filter(o => o.date >= start_date)
      status = status.filter(s => s.date >= start_date)
    }
    if (end_date) {
      orders = orders.filter(o => o.date <= end_date)
      status = status.filter(s => s.date <= end_date)
    }
    if (meal_type) {
      orders = orders.filter(o => o.meal_type === meal_type)
      status = status.filter(s => s.meal_type === meal_type)
    }
    const byDate = {}
    for (const o of orders) {
      if (!byDate[o.date]) byDate[o.date] = { date: o.date, ordered: 0, consumed: 0 }
      byDate[o.date].ordered++
    }
    for (const s of status) {
      if (!byDate[s.date]) byDate[s.date] = { date: s.date, ordered: 0, consumed: 0 }
      if (s.consumed === 1 || s.consumed === true) byDate[s.date].consumed++
    }
    const rows = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
    for (const row of rows) {
      row.order_rate = row.ordered > 0 ? 100 : 0
      row.consume_rate = row.ordered > 0 ? Math.round((row.consumed / row.ordered) * 100) : 0
    }
    const totalOrdered = rows.reduce((sum, r) => sum + r.ordered, 0)
    const totalConsumed = rows.reduce((sum, r) => sum + r.consumed, 0)
    res.json({
      rows,
      summary: {
        total_ordered: totalOrdered,
        total_consumed: totalConsumed,
        order_rate: totalOrdered > 0 ? 100 : 0,
        consume_rate: totalOrdered > 0 ? Math.round((totalConsumed / totalOrdered) * 100) : 0
      }
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/stats/by-user', async (req, res) => {
  try {
    const { start_date, end_date } = req.query
    let orders = await queryAll(req, 'daily_orders')
    let status = await queryAll(req, 'daily_meal_status')
    if (start_date) {
      orders = orders.filter(o => o.date >= start_date)
      status = status.filter(s => s.date >= start_date)
    }
    if (end_date) {
      orders = orders.filter(o => o.date <= end_date)
      status = status.filter(s => s.date <= end_date)
    }
    const byUser = {}
    for (const o of orders) {
      const key = o.user_id
      if (!byUser[key]) byUser[key] = { user_id: o.user_id, user_name: o.user_name, ordered: 0, consumed: 0 }
      byUser[key].ordered++
    }
    for (const s of status) {
      const key = s.user_id
      if (!byUser[key]) byUser[key] = { user_id: s.user_id, user_name: s.user_name || '', ordered: 0, consumed: 0 }
      if (s.consumed === 1 || s.consumed === true) byUser[key].consumed++
    }
    const rows = Object.values(byUser)
    for (const row of rows) {
      row.consume_rate = row.ordered > 0 ? Math.round((row.consumed / row.ordered) * 100) : 0
    }
    res.json({ rows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/stats/export', async (req, res) => {
  try {
    const { start_date, end_date, meal_type } = req.query
    let orders = await queryAll(req, 'daily_orders')
    let status = await queryAll(req, 'daily_meal_status')
    if (start_date) orders = orders.filter(o => o.date >= start_date)
    if (end_date) orders = orders.filter(o => o.date <= end_date)
    if (meal_type) orders = orders.filter(o => o.meal_type === meal_type)
    const byDate = {}
    for (const o of orders) {
      if (!byDate[o.date]) byDate[o.date] = { date: o.date, ordered: 0, consumed: 0 }
      byDate[o.date].ordered++
    }
    for (const s of status) {
      if (start_date && s.date < start_date) continue
      if (end_date && s.date > end_date) continue
      if (!byDate[s.date]) byDate[s.date] = { date: s.date, ordered: 0, consumed: 0 }
      if (s.consumed === 1 || s.consumed === true) byDate[s.date].consumed++
    }
    const rows = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
    let csv = '﻿日期,订餐数,已用餐,用餐率\n'
    for (const row of rows) {
      const rate = row.ordered > 0 ? Math.round((row.consumed / row.ordered) * 100) : 0
      csv += `${row.date},${row.ordered},${row.consumed},${rate}%\n`
    }
    res.header('Content-Type', 'text/csv; charset=utf-8')
    res.header('Content-Disposition', `attachment; filename=meal_stats_${start_date || 'all'}_${end_date || 'all'}.csv`)
    res.send(csv)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ============================================================
// Reviews
// ============================================================
app.get('/api/reviews', async (req, res) => {
  try {
    const rows = await queryAll(req, 'meal_review_records', {}, 'date')
    res.json({ rows })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/reviews/generate', async (req, res) => {
  try {
    const user = getCurrentUser(req)
    const { date, meal_type } = req.body
    const orders = await queryAll(req, 'daily_orders', { date, meal_type })
    const status = await queryAll(req, 'daily_meal_status', { date, meal_type })
    const totalOrdered = orders.length
    const totalConsumed = status.filter(s => s.consumed === 1 || s.consumed === true).length
    const totalAbsent = totalOrdered - totalConsumed
    const existing = await queryAll(req, 'meal_review_records', { date, meal_type })
    if (existing.length > 0) {
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'meal_review_records',
        where: { id: existing[0].id },
        data: { total_ordered: totalOrdered, total_consumed: totalConsumed, total_absent: totalAbsent }
      })
      res.json({ ...existing[0], total_ordered: totalOrdered, total_consumed: totalConsumed, total_absent: totalAbsent })
    } else {
      const result = await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'meal_review_records',
        data: {
          date, meal_type, reviewer_id: user.userId,
          total_ordered: totalOrdered, total_consumed: totalConsumed,
          total_absent: totalAbsent, notes: ''
        }
      })
      res.json({
        id: result.id, date, meal_type,
        total_ordered: totalOrdered, total_consumed: totalConsumed, total_absent: totalAbsent
      })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ============================================================
// SPA Catch-all (must be last)
// ============================================================
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

app.start()
