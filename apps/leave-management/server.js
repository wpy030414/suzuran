import { createApp } from '@suzuran/sdk';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = createApp({ name: 'leave-management', port: 8089 });

const frontendDist = join(__dirname, 'frontend', 'dist');

// Static file serving
app.get('/', (req, res) => {
  const indexPath = join(frontendDist, 'index.html');
  if (existsSync(indexPath)) {
    res.header('Content-Type', 'text/html');
    res.send(readFileSync(indexPath, 'utf-8'));
  } else {
    res.status(404).send('Frontend not built');
  }
});

app.get('/assets/:file', (req, res) => {
  const filePath = join(frontendDist, 'assets', req.params.file);
  if (existsSync(filePath)) {
    const ext = req.params.file.split('.').pop();
    const mimeTypes = { js: 'application/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', woff2: 'font/woff2' };
    res.header('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.send(readFileSync(filePath));
  } else {
    res.status(404).send('Not found');
  }
});

app.get('/:path', (req, res) => {
  if (req.params.path.startsWith('api/')) return;
  const indexPath = join(frontendDist, 'index.html');
  if (existsSync(indexPath)) {
    res.header('Content-Type', 'text/html');
    res.send(readFileSync(indexPath, 'utf-8'));
  } else {
    res.status(404).send('Frontend not built');
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', appId: req.appId, orgId: req.orgId });
});

// Table definitions
const TABLES = {
  leave_types: [
    { name: 'name', type: 'text' },
    { name: 'code', type: 'text' },
    { name: 'description', type: 'text', nullable: true },
    { name: 'max_days', type: 'integer', nullable: true },
    { name: 'requires_quota', type: 'boolean', default: false }
  ],
  leave_requests: [
    { name: 'user_id', type: 'integer' },
    { name: 'user_name', type: 'text' },
    { name: 'department_id', type: 'integer' },
    { name: 'leave_type_id', type: 'integer' },
    { name: 'leave_type_code', type: 'text' },
    { name: 'start_date', type: 'timestamp' },
    { name: 'start_half', type: 'text' },
    { name: 'end_date', type: 'timestamp' },
    { name: 'end_half', type: 'text' },
    { name: 'total_days', type: 'numeric', nullable: true },
    { name: 'total_minutes', type: 'integer', nullable: true },
    { name: 'reason', type: 'text' },
    { name: 'attachments', type: 'jsonb', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'workflow_instance_id', type: 'integer', nullable: true },
    { name: 'approver_id', type: 'integer', nullable: true },
    { name: 'approval_comment', type: 'text', nullable: true },
    { name: 'created_at', type: 'timestamp' }
  ],
  leave_balances: [
    { name: 'user_id', type: 'integer' },
    { name: 'user_name', type: 'text' },
    { name: 'year', type: 'integer' },
    { name: 'month', type: 'integer' },
    { name: 'quota_count', type: 'integer' },
    { name: 'quota_minutes', type: 'integer' },
    { name: 'used_count', type: 'integer', default: 0 },
    { name: 'used_minutes', type: 'integer', default: 0 }
  ]
};

app.onStart(async () => {
  for (const [tableName, columns] of Object.entries(TABLES)) {
    try {
      await app.mcp.call('data.create_table', { orgId: app.orgId, tableName, columns });
      console.log(`[init] Table '${tableName}' ready`);
    } catch (e) {
      console.log(`[init] Table '${tableName}' already exists`);
    }
  }

  // Define leave approval workflow with dynamic routing
  try {
    await app.mcp.call('workflow.define', {
      orgId: app.orgId,
      workflowId: 'leave_approval',
      name: '请假审批流程',
      steps: [
        {
          id: 'dept_approve',
          name: '部门/年级组长审批',
          assigneeType: 'department_manager',
          condition: (ctx) => (ctx.total_days || 0) <= 3
        },
        {
          id: 'admin_approve',
          name: '行政审批',
          assigneeType: 'role',
          assigneeValue: 'admin',
          condition: (ctx) => (ctx.total_days || 0) > 3 || ctx.leave_type_code === 'statutory'
        }
      ]
    });
    console.log('[init] Workflow leave_approval defined');
  } catch (e) {
    console.log('[init] Workflow already exists or not supported');
  }
});

// Half-day time alignment constants (BR-QJ-01)
const HALF_DAY_TIMES = {
  start: { morning: '08:00', afternoon: '13:50' },
  end: { morning: '12:00', afternoon: '16:50' }
};

function calculateLeaveDuration(startDate, startHalf, endDate, endHalf, leaveTypeCode) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (leaveTypeCode === 'elastic') {
    // Elastic leave: calculate in minutes
    const startMinutes = startHalf === 'morning' ? 8 * 60 : 13 * 60 + 50;
    const endMinutes = endHalf === 'morning' ? 12 * 60 : 16 * 60 + 50;
    const dayDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));

    let totalMinutes;
    if (dayDiff === 0) {
      totalMinutes = endMinutes - startMinutes;
    } else {
      const firstDayMin = (16 * 60 + 50) - startMinutes;
      const lastDayMin = endMinutes - (8 * 60);
      const middleDays = dayDiff - 1;
      totalMinutes = firstDayMin + lastDayMin + middleDays * (8 * 60 + 10);
    }
    return { total_minutes: totalMinutes, total_days: null };
  } else {
    // Other leave types: calculate in days with half-day alignment (BR-QJ-02)
    const dayDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    let totalDays = dayDiff;
    if (startHalf === endHalf) {
      totalDays += 0.5;
    } else {
      totalDays += 1;
    }
    return { total_days: totalDays, total_minutes: null };
  }
}

// Helper functions
async function listRecords(req, res, tableName) {
  try {
    const where = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy'].includes(k)) where[k] = v;
    }
    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName, where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function createRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.insert', { orgId: req.orgId, tableName, data: req.body });
    res.json({ id: result.id, ...req.body });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function updateRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.update', {
      orgId: req.orgId, tableName,
      where: { id: parseInt(req.params.id) }, data: req.body
    });
    res.json({ success: true, count: result.count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function deleteRecord(req, res, tableName) {
  try {
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName,
      where: { id: parseInt(req.params.id) }
    });
    res.json({ success: true, count: result.count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Leave Types
app.get('/api/leave-types', (req, res) => listRecords(req, res, 'leave_types'));
app.post('/api/leave-types', (req, res) => createRecord(req, res, 'leave_types'));
app.put('/api/leave-types/:id', (req, res) => updateRecord(req, res, 'leave_types'));
app.delete('/api/leave-types/:id', (req, res) => deleteRecord(req, res, 'leave_types'));

// Leave Requests - with permission control
app.get('/api/leave-requests', async (req, res) => {
  try {
    const where = {};
    const userRole = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];
    const deptId = req.headers['x-user-department-id'];

    if (userRole === 'teacher') {
      where.user_id = userId;
    } else if (userRole === 'department_manager') {
      where.department_id = deptId;
    }

    for (const [k, v] of Object.entries(req.query)) {
      if (!['limit', 'offset', 'orderBy'].includes(k)) where[k] = v;
    }

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_requests', where,
      orderBy: req.query.orderBy || 'created_at DESC',
      limit: parseInt(req.query.limit || '100'),
      offset: parseInt(req.query.offset || '0')
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/leave-requests', async (req, res) => {
  try {
    const {
      user_id, user_name, department_id, leave_type_id, leave_type_code,
      start_date, start_half, end_date, end_half, reason, attachments
    } = req.body;

    // Validate required fields
    if (!user_id || !leave_type_id || !start_date || !end_date || !reason) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    // Get leave type
    const ltResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_types',
      where: { id: leave_type_id }, limit: 1
    });
    if (!ltResult.rows || ltResult.rows.length === 0) {
      return res.status(400).json({ error: '无效的请假类型' });
    }

    // Validate time order (BR-QJ-04)
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (end < start || (end.getTime() === start.getTime() && start_half === 'afternoon' && end_half === 'morning')) {
      return res.status(400).json({ error: '开始时间不得早于结束时间！' });
    }

    // Calculate duration (BR-QJ-02)
    const duration = calculateLeaveDuration(start_date, start_half, end_date, end_half, leave_type_code);

    // Elastic leave quota validation (BR-QJ-03)
    let remainingCount = null, remainingMinutes = null;
    if (leave_type_code === 'elastic') {
      const now = new Date(start_date);
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const balResult = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'leave_balances',
        where: { user_id, year, month }, limit: 1
      });

      if (!balResult.rows || balResult.rows.length === 0) {
        return res.status(400).json({ error: '本月您没有任何配额，请联系管理员' });
      }

      const bal = balResult.rows[0];
      remainingCount = bal.quota_count - bal.used_count;
      remainingMinutes = bal.quota_minutes - bal.used_minutes;

      if (remainingCount <= 0 || remainingMinutes <= 0) {
        return res.status(400).json({ error: '本月您的配额已用尽' });
      }

      // Single request max 2 hours (BR-QJ-04)
      if (duration.total_minutes > 120) {
        return res.status(400).json({ error: '弹性假单次最高2小时！' });
      }

      // Time conflict check
      const conflictResult = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'leave_requests',
        where: { user_id, status: 'approved', leave_type_code: 'elastic' },
        limit: 100
      });

      if (conflictResult.rows) {
        for (const existing of conflictResult.rows) {
          const eStart = new Date(existing.start_date);
          const eEnd = new Date(existing.end_date);
          if (!(end < eStart || start > eEnd)) {
            return res.status(400).json({ error: '请假时间与已有记录冲突' });
          }
        }
      }
    }

    // Insert request
    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'leave_requests',
      data: {
        user_id, user_name, department_id,
        leave_type_id, leave_type_code,
        start_date, start_half, end_date, end_half,
        total_days: duration.total_days,
        total_minutes: duration.total_minutes,
        reason,
        attachments: attachments ? JSON.stringify(attachments) : null,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    });

    // Start workflow
    try {
      const wfInst = await app.mcp.call('workflow.start', {
        orgId: req.orgId,
        workflowId: 'leave_approval',
        context: {
          request_id: result.id,
          user_id, user_name, department_id,
          leave_type_code,
          total_days: duration.total_days || 0,
          total_minutes: duration.total_minutes || 0
        }
      });
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'leave_requests',
        where: { id: result.id },
        data: { workflow_instance_id: wfInst.instanceId }
      });
    } catch (e) {
      console.log('[workflow] Failed to start:', e.message);
    }

    res.json({
      id: result.id, ...req.body, ...duration, status: 'pending',
      remaining_quota: leave_type_code === 'elastic' ? {
        count: remainingCount - 1,
        minutes: remainingMinutes - duration.total_minutes
      } : null
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/leave-requests/:id', (req, res) => updateRecord(req, res, 'leave_requests'));
app.delete('/api/leave-requests/:id', (req, res) => deleteRecord(req, res, 'leave_requests'));

// Approve (workflow integration)
app.post('/api/leave-requests/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { approver_id, comment } = req.body;

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_requests', where: { id }, limit: 1
    });
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: '请假记录不存在' });
    }

    const leaveReq = result.rows[0];

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'leave_requests',
      where: { id },
      data: { status: 'approved', approver_id, approval_comment: comment }
    });

    // Update elastic quota usage
    if (leaveReq.leave_type_code === 'elastic') {
      const d = new Date(leaveReq.start_date);
      const bal = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'leave_balances',
        where: { user_id: leaveReq.user_id, year: d.getFullYear(), month: d.getMonth() + 1 },
        limit: 1
      });
      if (bal.rows && bal.rows.length > 0) {
        const b = bal.rows[0];
        await app.mcp.call('data.update', {
          orgId: req.orgId, tableName: 'leave_balances',
          where: { id: b.id },
          data: { used_count: b.used_count + 1, used_minutes: b.used_minutes + (leaveReq.total_minutes || 0) }
        });
      }
    }

    try {
      await app.mcp.call('workflow.approve', {
        orgId: req.orgId, instanceId: leaveReq.workflow_instance_id,
        approver_id, comment
      });
    } catch (e) {
      console.log('[workflow] Approve failed:', e.message);
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Reject
app.post('/api/leave-requests/:id/reject', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { approver_id, comment } = req.body;

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'leave_requests',
      where: { id },
      data: { status: 'rejected', approver_id, approval_comment: comment }
    });

    const result = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_requests', where: { id }, limit: 1
    });
    if (result.rows && result.rows.length > 0) {
      try {
        await app.mcp.call('workflow.reject', {
          orgId: req.orgId, instanceId: result.rows[0].workflow_instance_id,
          approver_id, comment
        });
      } catch (e) {
        console.log('[workflow] Reject failed:', e.message);
      }
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Quota management
app.get('/api/leave-balances', (req, res) => listRecords(req, res, 'leave_balances'));
app.post('/api/leave-balances', (req, res) => createRecord(req, res, 'leave_balances'));
app.put('/api/leave-balances/:id', (req, res) => updateRecord(req, res, 'leave_balances'));
app.delete('/api/leave-balances/:id', (req, res) => deleteRecord(req, res, 'leave_balances'));

// Get remaining quota
app.get('/api/leave-balances/quota/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { year, month } = req.query;

    const bal = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_balances',
      where: { user_id: parseInt(user_id), year: parseInt(year), month: parseInt(month) },
      limit: 1
    });

    if (!bal.rows || bal.rows.length === 0) {
      return res.json({ has_quota: false, message: '本月您没有任何配额，请联系管理员' });
    }

    const b = bal.rows[0];
    const rc = b.quota_count - b.used_count;
    const rm = b.quota_minutes - b.used_minutes;

    res.json({
      has_quota: true,
      quota_count: b.quota_count, quota_minutes: b.quota_minutes,
      used_count: b.used_count, used_minutes: b.used_minutes,
      remaining_count: rc, remaining_minutes: rm,
      message: rc > 0 && rm > 0 ? `剩余次数 ${rc}，时长 ${rm} 分钟` : '本月您的配额已用尽'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Monthly statistics (BR-QJ-05)
app.get('/api/statistics/monthly', async (req, res) => {
  try {
    const { year, month, department_id } = req.query;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const where = { status: 'approved' };
    if (department_id) where.department_id = parseInt(department_id);

    const requests = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_requests', where, limit: 10000
    });

    const filtered = (requests.rows || []).filter(r => {
      const rs = new Date(r.start_date);
      const re = new Date(r.end_date);
      return rs <= new Date(endDate) && re >= new Date(startDate);
    });

    const stats = {};
    for (const r of filtered) {
      const key = `${r.user_id}_${r.leave_type_code}`;
      if (!stats[key]) {
        stats[key] = {
          user_id: r.user_id, user_name: r.user_name,
          leave_type_code: r.leave_type_code,
          count: 0, total_days: 0, total_minutes: 0
        };
      }
      stats[key].count++;
      if (r.total_days) stats[key].total_days += parseFloat(r.total_days);
      if (r.total_minutes) stats[key].total_minutes += r.total_minutes;
    }

    res.json({ year: parseInt(year), month: parseInt(month), statistics: Object.values(stats) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Statistics by leave type
app.get('/api/statistics/by-type', async (req, res) => {
  try {
    const { year, department_id } = req.query;
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const where = { status: 'approved' };
    if (department_id) where.department_id = parseInt(department_id);

    const requests = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_requests', where, limit: 10000
    });

    const filtered = (requests.rows || []).filter(r => {
      const rs = new Date(r.start_date);
      return rs >= new Date(startDate) && rs <= new Date(endDate);
    });

    const stats = {};
    for (const r of filtered) {
      if (!stats[r.leave_type_code]) {
        stats[r.leave_type_code] = { leave_type_code: r.leave_type_code, count: 0, total_days: 0, total_minutes: 0 };
      }
      stats[r.leave_type_code].count++;
      if (r.total_days) stats[r.leave_type_code].total_days += parseFloat(r.total_days);
      if (r.total_minutes) stats[r.leave_type_code].total_minutes += r.total_minutes;
    }

    res.json({ year: parseInt(year), statistics: Object.values(stats) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Calendar view
app.get('/api/calendar', async (req, res) => {
  try {
    const { year, month, user_id, department_id } = req.query;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const where = { status: 'approved' };
    if (user_id) where.user_id = parseInt(user_id);
    if (department_id) where.department_id = parseInt(department_id);

    const requests = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'leave_requests', where, limit: 1000
    });

    const leaves = (requests.rows || []).filter(r => {
      const rs = new Date(r.start_date);
      const re = new Date(r.end_date);
      return rs <= new Date(endDate) && re >= new Date(startDate);
    });

    res.json({ year: parseInt(year), month: parseInt(month), leaves });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.start();
