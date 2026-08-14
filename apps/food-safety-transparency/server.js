import { createApp } from '@suzuran/sdk';

const app = createApp({ name: 'food-safety-transparency', port: 8098 });

// ============================================================
// Database Tables
// ============================================================
app.onStart(async () => {
  await app.mcp.call('data.create_table', {
    orgId: app.orgId,
    tableName: 'campuses',
    columns: [
      { name: 'name', type: 'text' },
      { name: 'address', type: 'text', nullable: true },
      { name: 'active', type: 'text', default: 'true' }
    ]
  });

  await app.mcp.call('data.create_table', {
    orgId: app.orgId,
    tableName: 'meal_periods',
    columns: [
      { name: 'name', type: 'text' },
      { name: 'academic_year', type: 'text' },
      { name: 'semester', type: 'text' },
      { name: 'code', type: 'text' },
      { name: 'start_date', type: 'date' },
      { name: 'end_date', type: 'date' }
    ]
  });

  await app.mcp.call('data.create_table', {
    orgId: app.orgId,
    tableName: 'meal_standards',
    columns: [
      { name: 'campus_id', type: 'integer' },
      { name: 'campus_name', type: 'text' },
      { name: 'date', type: 'date' },
      { name: 'week_number', type: 'integer' },
      { name: 'week_day', type: 'text' },
      { name: 'image_urls', type: 'text' },
      { name: 'uploaded_by', type: 'integer' },
      { name: 'uploaded_by_name', type: 'text' },
      { name: 'uploaded_at', type: 'timestamp' }
    ]
  });

  await app.mcp.call('data.create_table', {
    orgId: app.orgId,
    tableName: 'weekly_menus',
    columns: [
      { name: 'campus_id', type: 'integer' },
      { name: 'campus_name', type: 'text' },
      { name: 'period_id', type: 'integer' },
      { name: 'week_label', type: 'text' },
      { name: 'image_urls', type: 'text' },
      { name: 'published_by', type: 'integer' },
      { name: 'published_by_name', type: 'text' },
      { name: 'published_at', type: 'timestamp' }
    ]
  });

  await app.mcp.call('data.create_table', {
    orgId: app.orgId,
    tableName: 'menu_items',
    columns: [
      { name: 'menu_id', type: 'integer' },
      { name: 'day_of_week', type: 'integer' },
      { name: 'meal_type', type: 'text' },
      { name: 'dish_name', type: 'text' },
      { name: 'ingredients', type: 'text', nullable: true },
      { name: 'quantity', type: 'text', nullable: true },
      { name: 'price', type: 'numeric', nullable: true }
    ]
  });

  console.log('[food-safety] Tables initialized');
});

// ============================================================
// Generic CRUD helpers
// ============================================================
async function listRecords(req, res, tableName) {
  try {
    const where = {};
    for (const [k, v] of Object.entries(req.query || {})) {
      if (v !== undefined && v !== '') where[k] = v;
    }
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName, where, limit: 1000, offset: 0
    });
    res.json({ rows: result.rows || [] });
  } catch (err) {
    console.error(`[listRecords] ${tableName}`, err);
    res.status(500).json({ error: err.message || '查询失败' });
  }
}

async function createRecord(req, res, tableName, extra = {}) {
  try {
    const data = { ...req.body, ...extra };
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName, data
    });
    res.json({ success: true, id: result.id, data: result });
  } catch (err) {
    console.error(`[createRecord] ${tableName}`, err);
    res.status(500).json({ error: err.message || '创建失败' });
  }
}

async function updateRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName,
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(`[updateRecord] ${tableName}`, err);
    res.status(500).json({ error: err.message || '更新失败' });
  }
}

async function deleteRecord(req, res, tableName) {
  try {
    await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName, where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (err) {
    console.error(`[deleteRecord] ${tableName}`, err);
    res.status(500).json({ error: err.message || '删除失败' });
  }
}

// ============================================================
// Date / Week helpers
// ============================================================
const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function getWeekDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun .. 6=Sat
  return WEEK_DAYS[day === 0 ? 6 : day - 1];
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

// First Monday on or after startDate
function firstMonday(startDateStr) {
  const d = new Date(startDateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const offset = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + offset);
  return toISODate(d);
}

function calcWeekNumber(startDateStr, dateStr) {
  const mon = firstMonday(startDateStr);
  const diff = Math.floor(
    (new Date(dateStr + 'T00:00:00') - new Date(mon + 'T00:00:00')) / 86400000
  );
  return Math.max(1, Math.floor(diff / 7) + 1);
}

function makeWeekLabel(academicYear, semester, weekNumber) {
  return `${academicYear}学年${semester}第${weekNumber}周`;
}

function calcWeekLabelFromPeriod(period, dateStr) {
  const wn = calcWeekNumber(period.start_date, dateStr);
  return makeWeekLabel(period.academic_year, period.semester, wn);
}

// Parse "2025-2026学年第一学期第3周" -> { academicYear, semester, weekNumber }
function parseWeekLabel(label) {
  const m = label.match(/(\d{4}-\d{4})学年(第[一二三四]学期)第(\d+)周/);
  if (!m) return null;
  return { academicYear: m[1], semester: m[2], weekNumber: parseInt(m[3]) };
}

// Given period + weekNumber, return the Monday date
function weekMondayDate(period, weekNumber) {
  const mon = firstMonday(period.start_date);
  return addDays(mon, (weekNumber - 1) * 7);
}

// ============================================================
// Auth / context helpers
// ============================================================
function getUser(req) {
  return {
    id: parseInt(req.headers['x-user-id'] || '0'),
    name: req.headers['x-user-name'] || '未知',
    role: req.headers['x-user-role'] || 'parent'
  };
}

function requireRole(req, res, ...roles) {
  const user = getUser(req);
  if (!roles.includes(user.role)) {
    res.status(403).json({ error: '权限不足' });
    return null;
  }
  return user;
}

// ============================================================
// Static frontend serving
// ============================================================
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const distDir = join(__dirname, 'frontend', 'dist');

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

app.get('/assets/:file', (req, res) => {
  const filePath = join(distDir, 'assets', req.params.file);
  if (existsSync(filePath)) {
    res.header('content-type', MIME[extname(filePath)] || 'application/octet-stream');
    res.send(readFileSync(filePath, 'utf-8'));
  } else {
    res.status(404).send('Not found');
  }
});

app.get('/', (req, res) => {
  const idx = join(distDir, 'index.html');
  if (existsSync(idx)) res.send(readFileSync(idx, 'utf-8'));
  else res.status(404).send('Frontend not built. Run: cd frontend && npm run build');
});

// SPA fallback (non-API routes)
app.get('/:path', (req, res) => {
  if (req.params.path.startsWith('api/')) return;
  const idx = join(distDir, 'index.html');
  if (existsSync(idx)) {
    res.header('Content-Type', 'text/html');
    res.send(readFileSync(idx, 'utf-8'));
  } else {
    res.status(404).send('Frontend not built');
  }
});

// ============================================================
// Health
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', appId: req.appId, orgId: req.orgId });
});

// ============================================================
// Auth / Context
// ============================================================
app.get('/api/me', (req, res) => {
  res.json(getUser(req));
});

// ============================================================
// Campuses
// ============================================================
app.get('/api/campuses', (req, res) => {
  listRecords(req, res, 'campuses');
});

app.post('/api/campuses', (req, res) => {
  const user = requireRole(req, res, 'admin');
  if (!user) return;
  createRecord(req, res, 'campuses', { active: 'true' });
});

app.put('/api/campuses/:id', (req, res) => {
  const user = requireRole(req, res, 'admin');
  if (!user) return;
  updateRecord(req, res, 'campuses');
});

app.delete('/api/campuses/:id', (req, res) => {
  const user = requireRole(req, res, 'admin');
  if (!user) return;
  // Soft delete
  app.mcp.call('data.update', {
    orgId: req.orgId, tableName: 'campuses',
    where: { id: req.params.id },
    data: { active: 'false' }
  }).then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// ============================================================
// Meal Periods
// ============================================================
app.get('/api/periods', (req, res) => {
  listRecords(req, res, 'meal_periods');
});

app.post('/api/periods', (req, res) => {
  const user = requireRole(req, res, 'admin', 'staff');
  if (!user) return;
  const { academic_year, semester } = req.body;
  const code = (academic_year || '').slice(0, 4) + (semester === '第一学期' ? 'A' : 'B');
  createRecord(req, res, 'meal_periods', { code });
});

app.put('/api/periods/:id', (req, res) => {
  const user = requireRole(req, res, 'admin', 'staff');
  if (!user) return;
  updateRecord(req, res, 'meal_periods');
});

app.delete('/api/periods/:id', (req, res) => {
  const user = requireRole(req, res, 'admin');
  if (!user) return;
  deleteRecord(req, res, 'meal_periods');
});

// ============================================================
// Meal Standards (daily)
// ============================================================
app.get('/api/standards', async (req, res) => {
  try {
    const where = {};
    if (req.query.campus_id) where.campus_id = req.query.campus_id;
    if (req.query.date) where.date = req.query.date;
    if (req.query.week_number) where.week_number = req.query.week_number;
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'meal_standards',
      where, limit: 1000, offset: 0, orderBy: 'date DESC'
    });
    res.json({ rows: result.rows || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/standards', async (req, res) => {
  try {
    const user = requireRole(req, res, 'admin', 'staff');
    if (!user) return;

    const { campus_id, date, image_urls } = req.body;
    if (!image_urls || !image_urls.trim()) {
      return res.status(400).json({ error: '至少需要一张图片' });
    }

    // Look up campus name
    const campusRes = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'campuses',
      where: { id: campus_id }, limit: 1, offset: 0
    });
    const campus = (campusRes.rows || [])[0];
    if (!campus) return res.status(400).json({ error: '校区不存在' });

    // Look up period for week_number
    const periodsRes = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'meal_periods',
      where: {}, limit: 100, offset: 0
    });
    const periods = periodsRes.rows || [];
    let weekNumber = 1;
    for (const p of periods) {
      if (date >= p.start_date && date <= p.end_date) {
        weekNumber = calcWeekNumber(p.start_date, date);
        break;
      }
    }

    const data = {
      campus_id: parseInt(campus_id),
      campus_name: campus.name,
      date,
      week_number: weekNumber,
      week_day: getWeekDay(date),
      image_urls,
      uploaded_by: user.id,
      uploaded_by_name: user.name,
      uploaded_at: new Date().toISOString()
    };

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'meal_standards', data
    });
    res.json({ success: true, id: result.id, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/standards/:id', (req, res) => {
  updateRecord(req, res, 'meal_standards');
});

app.delete('/api/standards/:id', (req, res) => {
  deleteRecord(req, res, 'meal_standards');
});

// Standards stats (must be before /api/standards/stats if using path params,
// but since we use query params on GET /api/standards/stats, define after)
app.get('/api/standards/stats', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const where = {};
    if (start_date) where.date = start_date; // MCP may not support range; fetch all and filter
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'meal_standards',
      where: {}, limit: 10000, offset: 0
    });
    let rows = result.rows || [];
    if (start_date) rows = rows.filter(r => r.date >= start_date);
    if (end_date) rows = rows.filter(r => r.date <= end_date);

    const campusesRes = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'campuses',
      where: { active: 'true' }, limit: 100, offset: 0
    });
    const campuses = campusesRes.rows || [];

    const byCampus = {};
    for (const r of rows) {
      const cid = r.campus_id;
      if (!byCampus[cid]) byCampus[cid] = new Set();
      byCampus[cid].add(r.date);
    }

    const stats = campuses.map(c => {
      const published = byCampus[c.id] ? byCampus[c.id].size : 0;
      let total = 0;
      if (start_date && end_date) {
        const d1 = new Date(start_date + 'T00:00:00');
        const d2 = new Date(end_date + 'T00:00:00');
        total = Math.floor((d2 - d1) / 86400000) + 1;
      } else {
        total = published;
      }
      return {
        campus_id: c.id,
        campus_name: c.name,
        total_days: total,
        published_days: published,
        publish_rate: total > 0 ? Math.round(published / total * 100) : 0
      };
    });

    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Weekly Menus
// ============================================================
app.get('/api/menus', async (req, res) => {
  try {
    const where = {};
    if (req.query.campus_id) where.campus_id = req.query.campus_id;
    if (req.query.period_id) where.period_id = req.query.period_id;
    if (req.query.week_label) where.week_label = req.query.week_label;
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'weekly_menus',
      where, limit: 1000, offset: 0, orderBy: 'published_at DESC'
    });
    res.json({ rows: result.rows || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/menus', async (req, res) => {
  try {
    const user = requireRole(req, res, 'admin', 'staff');
    if (!user) return;

    const { campus_id, period_id, week_label, image_urls } = req.body;

    // Look up campus
    const campusRes = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'campuses',
      where: { id: campus_id }, limit: 1, offset: 0
    });
    const campus = (campusRes.rows || [])[0];
    if (!campus) return res.status(400).json({ error: '校区不存在' });

    // Auto week_label from period if not provided
    let finalWeekLabel = week_label;
    if (!finalWeekLabel && period_id) {
      const periodRes = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'meal_periods',
        where: { id: period_id }, limit: 1, offset: 0
      });
      const period = (periodRes.rows || [])[0];
      if (period) {
        // Use period start_date as reference, assume current week
        const today = toISODate(new Date());
        finalWeekLabel = calcWeekLabelFromPeriod(period, today);
      }
    }

    const data = {
      campus_id: parseInt(campus_id),
      campus_name: campus.name,
      period_id: parseInt(period_id),
      week_label: finalWeekLabel || '',
      image_urls: image_urls || '',
      published_by: user.id,
      published_by_name: user.name,
      published_at: new Date().toISOString()
    };

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'weekly_menus', data
    });
    res.json({ success: true, id: result.id, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/menus/:id', (req, res) => {
  updateRecord(req, res, 'weekly_menus');
});

app.delete('/api/menus/:id', (req, res) => {
  deleteRecord(req, res, 'weekly_menus');
});

// ============================================================
// Menu Items
// ============================================================
app.get('/api/menu-items', async (req, res) => {
  try {
    const where = {};
    if (req.query.menu_id) where.menu_id = req.query.menu_id;
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'menu_items',
      where, limit: 1000, offset: 0
    });
    res.json({ rows: result.rows || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/menu-items', (req, res) => {
  createRecord(req, res, 'menu_items');
});

app.post('/api/menu-items/batch', async (req, res) => {
  try {
    const { menu_id, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items 不能为空' });
    }
    const results = [];
    for (const item of items) {
      const data = {
        menu_id: parseInt(menu_id),
        day_of_week: parseInt(item.day_of_week),
        meal_type: item.meal_type || '',
        dish_name: item.dish_name || '',
        ingredients: item.ingredients || '',
        quantity: item.quantity || '',
        price: item.price != null ? parseFloat(item.price) : null
      };
      const r = await app.mcp.call('data.insert', {
        orgId: req.orgId, tableName: 'menu_items', data
      });
      results.push(r);
    }
    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/menu-items/:id', (req, res) => {
  updateRecord(req, res, 'menu_items');
});

app.delete('/api/menu-items/:id', (req, res) => {
  deleteRecord(req, res, 'menu_items');
});

// ============================================================
// Global Overview (Matrix)
// ============================================================
app.get('/api/overview', async (req, res) => {
  try {
    const { period_id, week_label } = req.query;
    if (!period_id || !week_label) {
      return res.status(400).json({ error: '需要 period_id 和 week_label' });
    }

    // Fetch period
    const periodRes = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'meal_periods',
      where: { id: period_id }, limit: 1, offset: 0
    });
    const period = (periodRes.rows || [])[0];
    if (!period) return res.status(404).json({ error: '学期不存在' });

    // Parse week_label to get week number
    const parsed = parseWeekLabel(week_label);
    if (!parsed) return res.status(400).json({ error: '周标签格式错误' });

    const mondayDate = weekMondayDate(period, parsed.weekNumber);
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      weekDates.push({
        day_of_week: i + 1,
        day_name: WEEK_DAYS[i],
        date: addDays(mondayDate, i)
      });
    }

    // Fetch campuses
    const campusRes = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'campuses',
      where: { active: 'true' }, limit: 100, offset: 0
    });
    const campuses = campusRes.rows || [];

    // Fetch menus for this week
    const menuRes = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'weekly_menus',
      where: { period_id, week_label }, limit: 1000, offset: 0
    });
    const menusByCampus = {};
    for (const m of (menuRes.rows || [])) {
      menusByCampus[m.campus_id] = m;
    }

    // Fetch standards for the week dates
    const stdRes = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'meal_standards',
      where: {}, limit: 10000, offset: 0
    });
    const dateSet = new Set(weekDates.map(d => d.date));
    const stdsByKey = {};
    for (const s of (stdRes.rows || [])) {
      if (dateSet.has(s.date)) {
        stdsByKey[`${s.campus_id}_${s.date}`] = s;
      }
    }

    // Build matrix
    const result = campuses.map(c => {
      const days = weekDates.map(wd => ({
        day_of_week: wd.day_of_week,
        day_name: wd.day_name,
        date: wd.date,
        standard: stdsByKey[`${c.id}_${wd.date}`] || null
      }));
      return {
        campus_id: c.id,
        campus_name: c.name,
        menu: menusByCampus[c.id] || null,
        days
      };
    });

    res.json({
      period,
      week_label,
      week_dates: weekDates,
      campuses: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Available weeks for overview
app.get('/api/overview/weeks', async (req, res) => {
  try {
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'weekly_menus',
      where: {}, limit: 10000, offset: 0
    });
    const labels = [...new Set((result.rows || []).map(r => r.week_label).filter(Boolean))];
    labels.sort();
    res.json({ weeks: labels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Statistics
// ============================================================
app.get('/api/stats/standards', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'meal_standards',
      where: {}, limit: 10000, offset: 0
    });
    let rows = result.rows || [];
    if (start_date) rows = rows.filter(r => r.date >= start_date);
    if (end_date) rows = rows.filter(r => r.date <= end_date);

    const campusesRes = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'campuses',
      where: { active: 'true' }, limit: 100, offset: 0
    });
    const campuses = campusesRes.rows || [];

    const byCampus = {};
    for (const r of rows) {
      const cid = r.campus_id;
      if (!byCampus[cid]) byCampus[cid] = new Set();
      byCampus[cid].add(r.date);
    }

    const stats = campuses.map(c => {
      const published = byCampus[c.id] ? byCampus[c.id].size : 0;
      let total = 0;
      if (start_date && end_date) {
        const d1 = new Date(start_date + 'T00:00:00');
        const d2 = new Date(end_date + 'T00:00:00');
        total = Math.floor((d2 - d1) / 86400000) + 1;
      } else {
        total = published;
      }
      return {
        campus_id: c.id,
        campus_name: c.name,
        total_days: total,
        published_days: published,
        publish_rate: total > 0 ? Math.round(published / total * 100) : 0
      };
    });

    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/menus', async (req, res) => {
  try {
    const { period_id } = req.query;
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'weekly_menus',
      where: {}, limit: 10000, offset: 0
    });
    let rows = result.rows || [];
    if (period_id) rows = rows.filter(r => String(r.period_id) === String(period_id));

    const campusesRes = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'campuses',
      where: { active: 'true' }, limit: 100, offset: 0
    });
    const campuses = campusesRes.rows || [];

    // Calculate total weeks in period
    let totalWeeks = 0;
    if (period_id) {
      const periodRes = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'meal_periods',
        where: { id: period_id }, limit: 1, offset: 0
      });
      const period = (periodRes.rows || [])[0];
      if (period) {
        const days = Math.floor(
          (new Date(period.end_date + 'T00:00:00') - new Date(period.start_date + 'T00:00:00')) / 86400000
        ) + 1;
        totalWeeks = Math.ceil(days / 7);
      }
    }

    const byCampus = {};
    for (const r of rows) {
      const cid = r.campus_id;
      if (!byCampus[cid]) byCampus[cid] = new Set();
      byCampus[cid].add(r.week_label);
    }

    const stats = campuses.map(c => {
      const published = byCampus[c.id] ? byCampus[c.id].size : 0;
      const total = totalWeeks || published;
      return {
        campus_id: c.id,
        campus_name: c.name,
        total_weeks: total,
        published_weeks: published,
        publish_rate: total > 0 ? Math.round(published / total * 100) : 0
      };
    });

    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/export', async (req, res) => {
  try {
    const { start_date, end_date, period_id } = req.query;

    // Standards stats
    const stdResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'meal_standards',
      where: {}, limit: 10000, offset: 0
    });
    let stdRows = stdResult.rows || [];
    if (start_date) stdRows = stdRows.filter(r => r.date >= start_date);
    if (end_date) stdRows = stdRows.filter(r => r.date <= end_date);

    const campusesRes = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'campuses',
      where: { active: 'true' }, limit: 100, offset: 0
    });
    const campuses = campusesRes.rows || [];

    const stdByCampus = {};
    for (const r of stdRows) {
      const cid = r.campus_id;
      if (!stdByCampus[cid]) stdByCampus[cid] = new Set();
      stdByCampus[cid].add(r.date);
    }

    // Menus stats
    const menuResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'weekly_menus',
      where: {}, limit: 10000, offset: 0
    });
    let menuRows = menuResult.rows || [];
    if (period_id) menuRows = menuRows.filter(r => String(r.period_id) === String(period_id));

    const menuByCampus = {};
    for (const r of menuRows) {
      const cid = r.campus_id;
      if (!menuByCampus[cid]) menuByCampus[cid] = new Set();
      menuByCampus[cid].add(r.week_label);
    }

    // Build CSV
    const lines = ['校区名称,餐标公示天数,餐标公示率,菜谱发布周数,菜谱发布率'];
    for (const c of campuses) {
      const stdPub = stdByCampus[c.id] ? stdByCampus[c.id].size : 0;
      let stdTotal = stdPub;
      if (start_date && end_date) {
        const d1 = new Date(start_date + 'T00:00:00');
        const d2 = new Date(end_date + 'T00:00:00');
        stdTotal = Math.floor((d2 - d1) / 86400000) + 1;
      }
      const stdRate = stdTotal > 0 ? Math.round(stdPub / stdTotal * 100) : 0;

      const menuPub = menuByCampus[c.id] ? menuByCampus[c.id].size : 0;
      const menuRate = menuPub > 0 ? 100 : 0;

      lines.push(`${c.name},${stdPub},${stdRate}%,${menuPub},${menuRate}%`);
    }

    res.header('content-type', 'text/csv; charset=utf-8');
    res.header('content-disposition', 'attachment; filename=stats.csv');
    res.send('﻿' + lines.join('\n')); // BOM for Excel
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Start
// ============================================================
app.start();
