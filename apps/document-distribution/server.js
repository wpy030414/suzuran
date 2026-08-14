import { createApp } from '@suzuran/sdk';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = createApp({ name: 'document-distribution', port: 8090 });

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

// Table definitions - V2 tree-based distribution model
const TABLES = {
  documents: [
    { name: 'uuid', type: 'text', unique: true },
    { name: 'father_uuid', type: 'text', nullable: true },
    { name: 'children', type: 'jsonb', nullable: true },
    { name: 'document_number', type: 'text', nullable: true },
    { name: 'document_date', type: 'date', nullable: true },
    { name: 'title', type: 'text' },
    { name: 'issuing_unit', type: 'text' },
    { name: 'file_url', type: 'text', nullable: true },
    { name: 'confidentiality_level', type: 'text' },
    { name: 'limited_handling', type: 'boolean', default: false },
    { name: 'deadline', type: 'date', nullable: true },
    { name: 'remarks', type: 'text', nullable: true },
    { name: 'need_next_handler', type: 'boolean', default: false },
    { name: 'next_handlers', type: 'jsonb', nullable: true },
    { name: 'created_by', type: 'integer' },
    { name: 'status', type: 'text' },
    { name: 'workflow_instance_id', type: 'integer', nullable: true },
    { name: 'created_at', type: 'timestamp' }
  ],
  distribution_records: [
    { name: 'document_uuid', type: 'text' },
    { name: 'user_id', type: 'integer' },
    { name: 'user_name', type: 'text' },
    { name: 'status', type: 'text' },
    { name: 'read_at', type: 'timestamp', nullable: true }
  ],
  urge_records: [
    { name: 'document_uuid', type: 'text' },
    { name: 'user_id', type: 'integer' },
    { name: 'user_name', type: 'text' },
    { name: 'url', type: 'text' },
    { name: 'urged_at', type: 'timestamp' }
  ],
  tags: [
    { name: 'name', type: 'text' },
    { name: 'user_ids', type: 'jsonb' }
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
});

// Generate UUID v7-like
function generateUUID() {
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random = Math.random().toString(16).substring(2, 18);
  return `${timestamp.substring(0, 8)}-${timestamp.substring(8, 12)}-7${random.substring(1, 4)}-${random.substring(4, 8)}-${random.substring(8, 20)}`;
}

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

// Documents - with tree-based distribution
app.get('/api/documents', (req, res) => listRecords(req, res, 'documents'));

app.post('/api/documents', async (req, res) => {
  try {
    const {
      document_number, document_date, title, issuing_unit, file_url,
      confidentiality_level, limited_handling, deadline, remarks,
      need_next_handler, next_handlers, created_by
    } = req.body;

    const uuid = generateUUID();

    const result = await app.mcp.call('data.insert', {
      orgId: req.orgId, tableName: 'documents',
      data: {
        uuid,
        father_uuid: null,
        document_number, document_date, title, issuing_unit, file_url,
        confidentiality_level,
        limited_handling: limited_handling || false,
        deadline: limited_handling ? deadline : null,
        remarks,
        need_next_handler: need_next_handler || false,
        next_handlers: next_handlers ? JSON.stringify(next_handlers) : null,
        created_by,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    });

    // Create distribution records for next handlers
    if (need_next_handler && next_handlers && next_handlers.length > 0) {
      for (const handler of next_handlers) {
        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'distribution_records',
          data: {
            document_uuid: uuid,
            user_id: handler.id,
            user_name: handler.name,
            status: 'pending'
          }
        });
      }
    }

    res.json({ id: result.id, uuid, ...req.body, status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/documents/:id', (req, res) => updateRecord(req, res, 'documents'));

// Approve document and spawn child processes (BR-GW2-03)
app.post('/api/documents/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { approver_id, next_handlers } = req.body;

    const docResult = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'documents', where: { id }, limit: 1
    });

    if (!docResult.rows || docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docResult.rows[0];

    // Update parent status
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'documents',
      where: { id },
      data: { status: 'approved', children: JSON.stringify(next_handlers || []) }
    });

    // Spawn child processes for next handlers (BR-GW2-03)
    if (next_handlers && next_handlers.length > 0) {
      for (const handler of next_handlers) {
        const childUuid = generateUUID();

        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'documents',
          data: {
            uuid: childUuid,
            father_uuid: doc.uuid,
            document_number: doc.document_number,
            document_date: doc.document_date,
            title: doc.title,
            issuing_unit: doc.issuing_unit,
            file_url: doc.file_url,
            confidentiality_level: doc.confidentiality_level,
            limited_handling: doc.limited_handling,
            deadline: doc.deadline,
            remarks: doc.remarks,
            need_next_handler: true,
            next_handlers: null,
            created_by: approver_id,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        });

        // Create distribution record
        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'distribution_records',
          data: {
            document_uuid: childUuid,
            user_id: handler.id,
            user_name: handler.name,
            status: 'pending'
          }
        });
      }
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Distribution records
app.get('/api/distribution-records', (req, res) => listRecords(req, res, 'distribution_records'));

app.put('/api/distribution-records/:id', (req, res) => updateRecord(req, res, 'distribution_records'));

// Mark as read
app.post('/api/distribution-records/:id/read', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await app.mcp.call('data.update', {
      orgId: req.orgId, tableName: 'distribution_records',
      where: { id },
      data: { status: 'read', read_at: new Date().toISOString() }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Document tracking - tree traversal (BR-GW2-04)
app.get('/api/documents/:uuid/tracking', async (req, res) => {
  try {
    const { uuid } = req.params;

    // Get all documents
    const allDocs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'documents', limit: 2400
    });

    const docs = allDocs.rows || [];
    const rootDoc = docs.find(d => d.uuid === uuid);

    if (!rootDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Build tree recursively
    function buildTree(parentUuid) {
      const children = docs.filter(d => d.father_uuid === parentUuid);
      return children.map(child => ({
        ...child,
        children: buildTree(child.uuid)
      }));
    }

    const tree = {
      ...rootDoc,
      children: buildTree(rootDoc.uuid)
    };

    // Find all leaf nodes
    function findLeaves(node) {
      if (!node.children || node.children.length === 0) {
        return [node];
      }
      return node.children.flatMap(findLeaves);
    }

    const leaves = findLeaves(tree);
    const incompleteLeaves = leaves.filter(l => l.status !== 'approved');

    res.json({
      document: tree,
      total_leaves: leaves.length,
      completed_leaves: leaves.filter(l => l.status === 'approved').length,
      incomplete_leaves: incompleteLeaves.map(l => ({
        uuid: l.uuid,
        handler_id: l.created_by,
        status: l.status
      }))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Urge incomplete handlers (BR-GW2-05)
app.post('/api/documents/:uuid/urge', async (req, res) => {
  try {
    const { uuid } = req.params;

    // Get tracking info
    const allDocs = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'documents', limit: 2400
    });

    const docs = allDocs.rows || [];
    const rootDoc = docs.find(d => d.uuid === uuid);

    if (!rootDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    function findLeaves(node) {
      const children = docs.filter(d => d.father_uuid === node.uuid);
      if (children.length === 0) return [node];
      return children.flatMap(findLeaves);
    }

    const leaves = findLeaves(rootDoc);
    const incompleteLeaves = leaves.filter(l => l.status !== 'approved');

    // Create urge records
    for (const leaf of incompleteLeaves) {
      const records = await app.mcp.call('data.query', {
        orgId: req.orgId, tableName: 'distribution_records',
        where: { document_uuid: leaf.uuid, status: 'pending' },
        limit: 100
      });

      for (const record of (records.rows || [])) {
        await app.mcp.call('data.insert', {
          orgId: req.orgId, tableName: 'urge_records',
          data: {
            document_uuid: uuid,
            user_id: record.user_id,
            user_name: record.user_name,
            url: `/documents/${leaf.uuid}`,
            urged_at: new Date().toISOString()
          }
        });
      }
    }

    res.json({
      success: true,
      urged_count: incompleteLeaves.length,
      message: `催办成功！已向 ${incompleteLeaves.length} 位未处理人员发送通知`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Read analysis
app.get('/api/documents/:uuid/analysis', async (req, res) => {
  try {
    const { uuid } = req.params;

    const records = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'distribution_records',
      where: { document_uuid: uuid },
      limit: 1000
    });

    const rows = records.rows || [];
    const readCount = rows.filter(r => r.status === 'read').length;
    const pendingCount = rows.filter(r => r.status === 'pending').length;

    res.json({
      document_uuid: uuid,
      total: rows.length,
      read: readCount,
      pending: pendingCount,
      read_rate: rows.length > 0 ? (readCount / rows.length * 100).toFixed(1) : 0,
      details: rows
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Tags
app.get('/api/tags', (req, res) => listRecords(req, res, 'tags'));
app.post('/api/tags', (req, res) => createRecord(req, res, 'tags'));
app.put('/api/tags/:id', (req, res) => updateRecord(req, res, 'tags'));
app.delete('/api/tags/:id', async (req, res) => {
  try {
    const result = await app.mcp.call('data.delete', {
      orgId: req.orgId, tableName: 'tags',
      where: { id: parseInt(req.params.id) }
    });
    res.json({ success: true, count: result.count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Calculate recipients by tags (BR-GW1-03)
app.post('/api/calculate-recipients', async (req, res) => {
  try {
    const { tag_ids, strategy } = req.body;

    const allTags = await app.mcp.call('data.query', {
      orgId: req.orgId, tableName: 'tags', limit: 100
    });

    const selectedTags = (allTags.rows || []).filter(t => tag_ids.includes(t.id));

    let recipients = [];
    if (strategy === 'union') {
      // Union: any tag matches
      const userSet = new Set();
      for (const tag of selectedTags) {
        const userIds = typeof tag.user_ids === 'string' ? JSON.parse(tag.user_ids) : tag.user_ids;
        for (const uid of userIds) {
          userSet.add(uid);
        }
      }
      recipients = Array.from(userSet);
    } else if (strategy === 'intersection') {
      // Intersection: all tags must match
      const tagUserArrays = selectedTags.map(tag => {
        const userIds = typeof tag.user_ids === 'string' ? JSON.parse(tag.user_ids) : tag.user_ids;
        return new Set(userIds);
      });

      if (tagUserArrays.length > 0) {
        const firstSet = tagUserArrays[0];
        recipients = Array.from(firstSet).filter(uid =>
          tagUserArrays.every(set => set.has(uid))
        );
      }
    }

    res.json({ recipients, count: recipients.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.start();
