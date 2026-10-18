import { Router } from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { parseRawInput, extractOrdersFromGroups } from '../parser/extractOrders.js';
import { checkAIStatus } from '../ai/orderAssistant.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { rawText, source = 'paste' } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const db = getDb();
    const catalogItems = db.prepare('SELECT id, name, unit_price_paise, unit FROM catalog_items WHERE active = 1').all();
    const aliasRows = db.prepare('SELECT item_id, alias FROM catalog_aliases').all();

    const aliasesByItemId = {};
    for (const row of aliasRows) {
      if (!aliasesByItemId[row.item_id]) aliasesByItemId[row.item_id] = [];
      aliasesByItemId[row.item_id].push(row.alias);
    }

    // Parse messages
    const groups = parseRawInput(rawText);
    if (groups.length === 0) {
      return res.status(400).json({ error: 'No order messages detected in the input' });
    }

    const extracted = extractOrdersFromGroups(groups, catalogItems, aliasesByItemId);

    // Check AI status
    const aiStatus = await checkAIStatus();

    // Persist to database in a single transaction
    const rawHash = crypto.createHash('sha256').update(rawText).digest('hex');

    let batchId;
    const createdOrders = [];

    const tx = db.transaction(() => {
      const insBatch = db.prepare(`
        INSERT INTO import_batches (source, raw_text_hash) VALUES (?, ?)
      `);
      const batchResult = insBatch.run(source, rawHash);
      batchId = batchResult.lastInsertRowid;

      const insMsg = db.prepare(`
        INSERT INTO messages (batch_id, customer_label, sent_at, raw_text)
        VALUES (?, ?, ?, ?)
      `);

      const insOrder = db.prepare(`
        INSERT INTO orders (customer_label, delivery_note, status, is_demo, created_at)
        VALUES (?, ?, 'draft', 0, datetime('now'))
      `);

      const insLine = db.prepare(`
        INSERT INTO order_lines (
          order_id, source_message_id, raw_text, item_id, custom_item_name,
          quantity, unit_price_paise, unit_price_override_paise, note, status, flags, origin
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < groups.length; i++) {
        const grp = groups[i];
        const ext = extracted[i];

        // Save raw messages
        let firstMsgId = null;
        for (const raw of grp.rawMessages) {
          const msgRes = insMsg.run(batchId, grp.customer, grp.sent_at || null, raw);
          if (!firstMsgId) firstMsgId = msgRes.lastInsertRowid;
        }

        // Create draft order
        const ordRes = insOrder.run(ext.customer_label, ext.delivery_note);
        const orderId = ordRes.lastInsertRowid;

        // Save order lines
        for (const line of ext.lines) {
          insLine.run(
            orderId,
            firstMsgId,
            line.raw_text,
            line.item_id,
            line.custom_item_name,
            line.quantity,
            line.unit_price_paise,
            line.unit_price_override_paise,
            line.note,
            line.status,
            JSON.stringify(line.flags),
            line.origin
          );
        }

        createdOrders.push({
          order_id: orderId,
          customer_label: ext.customer_label,
          lines_count: ext.lines.length,
          flags: ext.lines.flatMap(l => l.flags)
        });
      }
    });

    tx();

    res.status(201).json({
      batch_id: batchId,
      orders_created: createdOrders.length,
      orders: createdOrders,
      ai_available: aiStatus.available,
      ai_model: aiStatus.activeModel || null,
      message: `Successfully extracted and created ${createdOrders.length} draft order(s).`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/upload', async (req, res) => {
  try {
    const { content, filename } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Text content from uploaded file is required' });
    }

    // Forward to main import handler with 'upload' source
    req.body.rawText = content;
    req.body.source = `upload:${filename ? String(filename).replace(/[^a-zA-Z0-9._-]/g, '') : 'text.txt'}`;
    return router.handle(req, res);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
