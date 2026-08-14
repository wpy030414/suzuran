import { createApp } from '@suzuran/sdk';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = createApp({ name: 'vehicle-request', port: 8091 });

const frontendDist = join(__dirname, 'frontend', 'dist');

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

const TABLES = {
  vehicles: [
    { name: 'plate_number', type: 'text' },
    { name: 'model', type: 'text', nullable: true },
    { name: 'driver_id', type: 'integer', nullable: true },
    { name: 'driver_name', type: 'text', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'capacity', type: 'integer', nullable: true }
  ],
  vehicle_requests: [
    { name: 'user_id', type: 'integer' },
    { name: 'user_name', type: 'text' },
    { name: 'vehicle_id', type: 'integer', nullable: true },
    { name: 'purpose', type: 'text' },
    { name: 'departure_time', type: 'timestamp' },
    { name: 'return_time', type: 'timestamp' },
    { name: 'destination', type: 'text' },
    { name: 'passengers', type: 'integer', nullable: true },
    { name: 'contact_phone', type: 'text', nullable: true },
    { name: 'status', type: 'text' },
    { name: 'workflow_instance_id', type: 'integer', nullable: true },
    { name: 'approver_id', type: 'integer', nullable: true },
    { name: 'approval_comment', type: 'text', nullable: true },
    { name: 'created_at', type: 'timestamp' }
  ],
  usage_logs: [
    { name: 'request_id', type: 'integer' },
    { name: 'vehicle_id', type: 'integer' },
    { name: 'actual_departure', type: 'timestamp', nullable: true },
    { name: 'actual_return', type: 'timestamp', nullable: true },
    { name: 'mileage', type: 'numeric', nullable: true },
    { name: 'notes', type: 'text', nullable: true }
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

  // Define vehicle approval workflow
  try {
    await app.mcp.call('workflow.define', {
      orgId: app.orgId,
      workflowId: 'vehicle_approval',
      name: '用车审批流程',
      steps: [
        {
          id: 'admin_approve',
          name: '行政审批',
          assigneeType: 'role',
          assigneeValue: 'admin'
        }
      ]
    });
    console.log('[init] Workflow vehicle_approval defined');
  } catch (e) {
    console.log('[init] Workflow already exists or not supported');
  }
});

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

// Vehicles
app.get('/api/vehicles', (req, res) => listRecords(req, res, 'vehicles'));
app.post('/api/vehicles', (req, res) => createRecord(req, res, 'vehicles'));
app.put('/api/vehicles/:id', (req, res) => updateRecord(req, res, 'vehicles'));
app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'vehicles',
      where: { id: parseInt(req.params.id) }
    });
    res.json({ success: true, count: result.count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Vehicle Requests
app.get('/api/requests', (req, res) => listRecords(req, res, 'vehicle_requests'));

app.post('/api/requests', async (req, res) => {
  try {
    const {
      user_id, user_name, vehicle_id, purpose,
      departure_time, return_time, destination,
      passengers, contact_phone
    } = req.body;

    // Validate required fields
    if (!user_id || !purpose || !departure_time || !return_time || !destination) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    // Check time conflict
    const conflictResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'vehicle_requests',
      where: { status: 'approved' },
      limit: 100
    });

    if (conflictResult.rows) {
      const depTime = new Date(departure_time);
      const retTime = new Date(return_time);

      for (const existing of conflictResult.rows) {
        if (vehicle_id && existing.vehicle_id === vehicle_id) {
          const eDep = new Date(existing.departure_time);
          const eRet = new Date(existing.return_time);
          if (!(retTime < eDep || depTime > eRet)) {
            return res.status(400).json({ error: '该车辆在此时段已被占用' });
          }
        }
      }
    }

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'vehicle_requests',
      data: {
        user_id, user_name, vehicle_id, purpose,
        departure_time, return_time, destination,
        passengers, contact_phone,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    });

    // Start workflow
    try {
      const wfInst = await app.mcp.call('workflow.start', {
        orgId: req.orgId,
        workflowId: 'vehicle_approval',
        context: {
          request_id: result.id,
          user_id, user_name, vehicle_id,
          departure_time, return_time
        }
      });
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'vehicle_requests',
        where: { id: result.id },
        data: { workflow_instance_id: wfInst.instanceId }
      });
    } catch (e) {
      console.log('[workflow] Failed to start:', e.message);
    }

    res.json({ id: result.id, ...req.body, status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/requests/:id', (req, res) => updateRecord(req, res, 'vehicle_requests'));
app.delete('/api/requests/:id', async (req, res) => {
  try {
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'vehicle_requests',
      where: { id: parseInt(req.params.id) }
    });
    res.json({ success: true, count: result.count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Approve request
app.post('/api/requests/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { approver_id, comment, vehicle_id } = req.body;

    const reqResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'vehicle_requests',
      where: { id }, limit: 1
    });

    if (!reqResult.rows || reqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = reqResult.rows[0];

    // Update request status
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'vehicle_requests',
      where: { id },
      data: {
        status: 'approved',
        vehicle_id: vehicle_id || request.vehicle_id,
        approver_id, approval_comment: comment
      }
    });

    // Update vehicle status
    if (vehicle_id || request.vehicle_id) {
      await app.mcp.call('data.update', {
        orgId: req.orgId, tableName: 'vehicles',
        where: { id: vehicle_id || request.vehicle_id },
        data: { status: 'in_use' }
      });
    }

    try {
      await app.mcp.call('workflow.approve', {
        orgId: req.orgId, instanceId: request.workflow_instance_id,
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

// Reject request
app.post('/api/requests/:id/reject', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { approver_id, comment } = req.body;

    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'vehicle_requests',
      where: { id },
      data: { status: 'rejected', approver_id, approval_comment: comment }
    });

    const reqResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'vehicle_requests',
      where: { id }, limit: 1
    });

    if (reqResult.rows && reqResult.rows.length > 0) {
      try {
        await app.mcp.call('workflow.reject', {
          orgId: req.orgId, instanceId: reqResult.rows[0].workflow_instance_id,
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

// Usage Logs
app.get('/api/usage-logs', (req, res) => listRecords(req, res, 'usage_logs'));
app.post('/api/usage-logs', (req, res) => createRecord(req, res, 'usage_logs'));
app.put('/api/usage-logs/:id', (req, res) => updateRecord(req, res, 'usage_logs'));

// Statistics (BR-YC-01, BR-YC-02, BR-YC-03)
app.get('/api/statistics', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const where = {};
    if (start_date && end_date) {
      where.departure_time = { $gte: start_date, $lte: end_date };
    }

    const requests = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'vehicle_requests',
      where, limit: 10000
    });

    const rows = requests.rows || [];
    const total = rows.length;
    const approved = rows.filter(r => r.status === 'approved').length;
    const rejected = rows.filter(r => r.status === 'rejected').length;
    const pending = rows.filter(r => r.status === 'pending').length;

    res.json({
      total,
      approved,
      rejected,
      pending,
      details: rows
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Check vehicle availability
app.get('/api/vehicles/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { departure_time, return_time } = req.query;

    const depTime = new Date(departure_time);
    const retTime = new Date(return_time);

    const requests = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'vehicle_requests',
      where: { vehicle_id: parseInt(id), status: 'approved' },
      limit: 100
    });

    const conflicts = (requests.rows || []).filter(r => {
      const eDep = new Date(r.departure_time);
      const eRet = new Date(r.return_time);
      return !(retTime < eDep || depTime > eRet);
    });

    res.json({
      available: conflicts.length === 0,
      conflicts
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.start();
