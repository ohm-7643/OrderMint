import { Router } from 'express';
import { getDb } from '../db/index.js';
import { inrToPaise } from '../utils/money.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare(`
      SELECT id, name, unit_price_paise, unit, active, created_at
      FROM catalog_items
      ORDER BY name ASC
    `).all();

    const getAliases = db.prepare(`
      SELECT alias FROM catalog_aliases WHERE item_id = ? ORDER BY alias ASC
    `);

    const result = items.map(item => ({
      ...item,
      aliases: getAliases.all(item.id).map(a => a.alias)
    }));

    res.json({ items: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, unit_price_paise, unit_price_inr, unit = 'piece', aliases = [] } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    let pricePaise = unit_price_paise;
    if (pricePaise === undefined && unit_price_inr !== undefined) {
      pricePaise = inrToPaise(unit_price_inr);
    }
    if (!Number.isInteger(pricePaise) || pricePaise < 0) {
      return res.status(400).json({ error: 'Valid non-negative unit price is required' });
    }

    const db = getDb();
    const insertItem = db.prepare(`
      INSERT INTO catalog_items (name, unit_price_paise, unit, active)
      VALUES (?, ?, ?, 1)
    `);

    const insertAlias = db.prepare(`
      INSERT OR IGNORE INTO catalog_aliases (item_id, alias) VALUES (?, ?)
    `);

    let itemId;
    const tx = db.transaction(() => {
      const info = insertItem.run(name.trim(), pricePaise, unit.trim());
      itemId = info.lastInsertRowid;
      for (const a of aliases) {
        if (a && a.trim()) {
          insertAlias.run(itemId, a.trim().toLowerCase());
        }
      }
    });

    tx();
    res.status(201).json({ id: itemId, message: 'Item created successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'An item with this name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit_price_paise, unit_price_inr, unit = 'piece', active = 1, aliases = [] } = req.body;

    const db = getDb();
    let pricePaise = unit_price_paise;
    if (pricePaise === undefined && unit_price_inr !== undefined) {
      pricePaise = inrToPaise(unit_price_inr);
    }

    const updateItem = db.prepare(`
      UPDATE catalog_items
      SET name = COALESCE(?, name),
          unit_price_paise = COALESCE(?, unit_price_paise),
          unit = COALESCE(?, unit),
          active = COALESCE(?, active)
      WHERE id = ?
    `);

    const deleteAliases = db.prepare(`DELETE FROM catalog_aliases WHERE item_id = ?`);
    const insertAlias = db.prepare(`INSERT OR IGNORE INTO catalog_aliases (item_id, alias) VALUES (?, ?)`);

    const tx = db.transaction(() => {
      updateItem.run(name ? name.trim() : null, pricePaise, unit, active, id);
      if (Array.isArray(aliases)) {
        deleteAliases.run(id);
        for (const a of aliases) {
          if (a && a.trim()) {
            insertAlias.run(id, a.trim().toLowerCase());
          }
        }
      }
    });

    tx();
    res.json({ message: 'Item updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    db.prepare(`DELETE FROM catalog_items WHERE id = ?`).run(id);
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
