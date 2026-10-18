import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, initSchema } from '../src/db/index.js';
import { seedCatalog, resetDemoData } from '../src/db/seed.js';

test('Database: creates and initializes tables in memory idempotently', () => {
  const db = createDatabase(':memory:');
  // Run initSchema again to test idempotency
  initSchema(db);

  const tables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
  `).all().map(t => t.name);

  assert.ok(tables.includes('catalog_items'));
  assert.ok(tables.includes('catalog_aliases'));
  assert.ok(tables.includes('orders'));
  assert.ok(tables.includes('order_lines'));
  assert.ok(tables.includes('settings'));
  db.close();
});

test('Database: seeds catalog items and aliases properly', () => {
  const db = createDatabase(':memory:');
  const count = seedCatalog(db);
  assert.equal(count, 10);

  const choc = db.prepare('SELECT * FROM catalog_items WHERE name = ?').get('Chocolate Cake');
  assert.ok(choc);
  assert.equal(choc.unit_price_paise, 70000);

  const aliases = db.prepare('SELECT alias FROM catalog_aliases WHERE item_id = ?').all(choc.id);
  assert.ok(aliases.some(a => a.alias === 'choc cake'));
  db.close();
});

test('Database: resetDemoData deletes only demo orders and leaves real orders intact', () => {
  const db = createDatabase(':memory:');
  seedCatalog(db);

  // Insert a demo order and a real order
  const insOrder = db.prepare(`
    INSERT INTO orders (customer_label, is_demo, status) VALUES (?, ?, 'draft')
  `);
  const demoOrder = insOrder.run('Demo Customer', 1);
  const realOrder = insOrder.run('Real Customer', 0);

  const insLine = db.prepare(`
    INSERT INTO order_lines (order_id, quantity, unit_price_paise, status) VALUES (?, 1, 70000, 'resolved')
  `);
  insLine.run(demoOrder.lastInsertRowid);
  insLine.run(realOrder.lastInsertRowid);

  // Run resetDemoData
  resetDemoData(db);

  const orders = db.prepare('SELECT customer_label, is_demo FROM orders').all();
  assert.equal(orders.length, 1);
  assert.equal(orders[0].customer_label, 'Real Customer');
  assert.equal(orders[0].is_demo, 0);

  const lines = db.prepare('SELECT * FROM order_lines').all();
  assert.equal(lines.length, 1);
  assert.equal(lines[0].order_id, realOrder.lastInsertRowid);

  db.close();
});
