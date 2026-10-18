import { Router } from 'express';
import { getDb } from '../db/index.js';
import { paiseToINR, multiplyPaise } from '../utils/money.js';

const router = Router();

const BLOCKING_FLAGS = [
  'unknown_item',
  'ambiguous_item',
  'missing_quantity',
  'zero_quantity',
  'negative_quantity',
  'excessive_quantity',
  'price_mismatch',
  'missing_price',
  'conflicting_correction',
  'unsupported_fraction'
];

function validateOrderForApproval(order, lines) {
  const blockers = [];

  if (lines.length === 0) {
    blockers.push('Order must contain at least one line item.');
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (!line.item_id && (!line.custom_item_name || !line.custom_item_name.trim())) {
      blockers.push(`Line #${lineNum}: Missing valid catalog product or confirmed custom item.`);
    }

    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      blockers.push(`Line #${lineNum}: Quantity must be a positive integer.`);
    } else if (line.quantity > 1000) {
      blockers.push(`Line #${lineNum}: Quantity exceeds safety limit of 1000.`);
    }

    const price = line.unit_price_override_paise !== null && line.unit_price_override_paise !== undefined
      ? line.unit_price_override_paise
      : line.unit_price_paise;

    if (!Number.isInteger(price) || price < 0) {
      blockers.push(`Line #${lineNum}: Unit price must be a non-negative integer.`);
    }

    const flags = typeof line.flags === 'string' ? JSON.parse(line.flags || '[]') : (line.flags || []);
    if (line.status !== 'resolved') {
      const activeBlockers = flags.filter(f => BLOCKING_FLAGS.includes(f));
      if (activeBlockers.length > 0) {
        blockers.push(`Line #${lineNum}: Unresolved issue(s): ${activeBlockers.join(', ')}.`);
      }
    }
  }

  return {
    canApprove: blockers.length === 0,
    blockers
  };
}

router.get('/', (req, res) => {
  try {
    const { status, date } = req.query;
    const db = getDb();

    let query = `
      SELECT o.id, o.customer_label, o.delivery_note, o.status, o.is_demo, o.created_at, o.approved_at, o.reopened_at,
             COUNT(l.id) as lines_count,
             COALESCE(SUM(l.quantity * COALESCE(l.unit_price_override_paise, l.unit_price_paise)), 0) as total_paise
      FROM orders o
      LEFT JOIN order_lines l ON o.id = l.order_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ` AND o.status = ?`;
      params.push(status);
    }

    if (date) {
      query += ` AND date(o.created_at) = date(?)`;
      params.push(date);
    }

    query += ` GROUP BY o.id ORDER BY o.id DESC`;

    const orders = db.prepare(query).all(...params);
    const getFlags = db.prepare(`SELECT flags, status FROM order_lines WHERE order_id = ?`);

    const result = orders.map(ord => {
      const lineRows = getFlags.all(ord.id);
      let flagsCount = 0;
      for (const row of lineRows) {
        if (row.status === 'flagged') flagsCount++;
      }
      return {
        ...ord,
        flags_count: flagsCount,
        total_inr: paiseToINR(ord.total_paise)
      };
    });

    res.json({ orders: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const lines = db.prepare(`
      SELECT l.*, c.name as catalog_item_name, c.unit as catalog_unit
      FROM order_lines l
      LEFT JOIN catalog_items c ON l.item_id = c.id
      WHERE l.order_id = ?
      ORDER BY l.id ASC
    `).all(id);

    const messages = db.prepare(`
      SELECT m.id, m.customer_label, m.sent_at, m.raw_text
      FROM messages m
      JOIN import_batches b ON m.batch_id = b.id
      JOIN order_lines l ON l.source_message_id = m.id
      WHERE l.order_id = ?
      GROUP BY m.id
      ORDER BY m.id ASC
    `).all(id);

    let orderTotalPaise = 0;
    const formattedLines = lines.map(line => {
      const flags = typeof line.flags === 'string' ? JSON.parse(line.flags || '[]') : (line.flags || []);
      const effectivePrice = line.unit_price_override_paise !== null && line.unit_price_override_paise !== undefined
        ? line.unit_price_override_paise
        : line.unit_price_paise;

      let lineTotal = 0;
      if (line.quantity > 0 && effectivePrice >= 0) {
        lineTotal = multiplyPaise(effectivePrice, line.quantity);
        orderTotalPaise += lineTotal;
      }

      return {
        ...line,
        flags,
        item_name: line.catalog_item_name || line.custom_item_name || 'Unassigned Item',
        effective_unit_price_paise: effectivePrice,
        effective_unit_price_inr: paiseToINR(effectivePrice),
        line_total_paise: lineTotal,
        line_total_inr: paiseToINR(lineTotal)
      };
    });

    const validation = validateOrderForApproval(order, formattedLines);

    res.json({
      order: {
        ...order,
        total_paise: orderTotalPaise,
        total_inr: paiseToINR(orderTotalPaise)
      },
      lines: formattedLines,
      messages,
      validation
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { customer_label, delivery_note, notes } = req.body;
    const db = getDb();

    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'approved') {
      return res.status(400).json({ error: 'Approved orders cannot be edited. Please reopen first.' });
    }

    db.prepare(`
      UPDATE orders
      SET customer_label = COALESCE(?, customer_label),
          delivery_note = COALESCE(?, delivery_note),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(customer_label, delivery_note, notes, id);

    res.json({ message: 'Order header updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/lines/:lineId', (req, res) => {
  try {
    const { id, lineId } = req.params;
    const {
      item_id,
      custom_item_name,
      quantity,
      unit_price_paise,
      unit_price_override_paise,
      note,
      status,
      flags
    } = req.body;

    const db = getDb();
    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'approved') {
      return res.status(400).json({ error: 'Approved orders cannot be edited. Please reopen first.' });
    }

    const currentLine = db.prepare('SELECT * FROM order_lines WHERE id = ? AND order_id = ?').get(lineId, id);
    if (!currentLine) return res.status(404).json({ error: 'Order line not found' });

    const updatedItemId = item_id !== undefined ? item_id : currentLine.item_id;
    const updatedCustomName = custom_item_name !== undefined ? custom_item_name : currentLine.custom_item_name;
    const updatedQty = quantity !== undefined ? quantity : currentLine.quantity;
    const updatedPrice = unit_price_paise !== undefined ? unit_price_paise : currentLine.unit_price_paise;
    const updatedOverride = unit_price_override_paise !== undefined ? unit_price_override_paise : currentLine.unit_price_override_paise;
    const updatedNote = note !== undefined ? note : currentLine.note;
    const updatedStatus = status !== undefined ? status : currentLine.status;
    const updatedFlags = flags !== undefined ? JSON.stringify(flags) : currentLine.flags;

    db.prepare(`
      UPDATE order_lines
      SET item_id = ?,
          custom_item_name = ?,
          quantity = ?,
          unit_price_paise = ?,
          unit_price_override_paise = ?,
          note = ?,
          status = ?,
          flags = ?
      WHERE id = ? AND order_id = ?
    `).run(
      updatedItemId,
      updatedCustomName,
      updatedQty,
      updatedPrice,
      updatedOverride,
      updatedNote,
      updatedStatus,
      updatedFlags,
      lineId,
      id
    );

    res.json({ message: 'Order line updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/lines', (req, res) => {
  try {
    const { id } = req.params;
    const { item_id, custom_item_name, quantity = 1, unit_price_paise = 0, note = '' } = req.body;
    const db = getDb();

    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'approved') {
      return res.status(400).json({ error: 'Approved orders cannot be edited. Please reopen first.' });
    }

    const ins = db.prepare(`
      INSERT INTO order_lines (
        order_id, item_id, custom_item_name, quantity, unit_price_paise, note, status, flags, origin
      ) VALUES (?, ?, ?, ?, ?, ?, 'resolved', '[]', 'manual')
    `);

    const result = ins.run(id, item_id || null, custom_item_name || null, quantity, unit_price_paise, note);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Line added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/lines/:lineId', (req, res) => {
  try {
    const { id, lineId } = req.params;
    const db = getDb();
    const order = db.prepare('SELECT status FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'approved') {
      return res.status(400).json({ error: 'Approved orders cannot be edited. Please reopen first.' });
    }

    db.prepare('DELETE FROM order_lines WHERE id = ? AND order_id = ?').run(lineId, id);
    res.json({ message: 'Line deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'approved') {
      return res.status(400).json({ error: 'Order is already approved' });
    }

    const lines = db.prepare('SELECT * FROM order_lines WHERE order_id = ?').all(id);
    const validation = validateOrderForApproval(order, lines);

    if (!validation.canApprove) {
      return res.status(400).json({
        error: 'Order cannot be approved due to validation errors',
        blockers: validation.blockers
      });
    }

    db.prepare(`
      UPDATE orders
      SET status = 'approved', approved_at = datetime('now')
      WHERE id = ?
    `).run(id);

    res.json({ message: 'Order approved successfully', approved_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reopen', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    db.prepare(`
      UPDATE orders
      SET status = 'reopened', reopened_at = datetime('now')
      WHERE id = ?
    `).run(id);

    res.json({ message: 'Order reopened for editing' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
