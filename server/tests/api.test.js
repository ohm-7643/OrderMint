import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/index.js';
import { getDb } from '../src/db/index.js';
import { seedCatalog } from '../src/db/seed.js';

let serverInstance;
let baseUrl;

test.before(async () => {
  // Seed initial catalog
  const db = getDb();
  seedCatalog(db);

  await new Promise(resolve => {
    serverInstance = app.listen(0, '127.0.0.1', () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });
});

test.after(async () => {
  if (serverInstance) {
    await new Promise(resolve => serverInstance.close(resolve));
  }
});

test('API: GET /health returns status ok', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.app, 'OrderMint API');
});

test('API: GET /catalog returns seeded products with aliases', async () => {
  const res = await fetch(`${baseUrl}/catalog`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.items));
  assert.ok(data.items.length >= 8);
  const choc = data.items.find(i => i.name === 'Chocolate Cake');
  assert.ok(choc);
  assert.equal(choc.unit_price_paise, 70000);
  assert.ok(choc.aliases.includes('choc cake'));
});

test('API: POST /import creates draft orders from raw customer messages', async () => {
  const sampleMessage = `
[12/10/26, 11:00:00] Test User: 2 choc cakes for sat 700 each
[12/10/26, 11:02:00] Test User: add 1 brownie box 250
  `.trim();

  const res = await fetch(`${baseUrl}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText: sampleMessage, source: 'test' })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.orders_created, 1);
  assert.ok(data.batch_id);

  const orderId = data.orders[0].order_id;

  // Fetch the created order details
  const orderRes = await fetch(`${baseUrl}/orders/${orderId}`);
  assert.equal(orderRes.status, 200);
  const orderData = await orderRes.json();

  assert.equal(orderData.order.customer_label, 'Test User');
  assert.equal(orderData.lines.length, 2);
  assert.equal(orderData.order.status, 'draft');
});

test('API: Order approval rules validate and reject invalid orders', async () => {
  // Create an order with an unknown item to test blocking flag
  const unknownMsg = `Customer Test:\n1 unknown mystery cake 500`;
  const impRes = await fetch(`${baseUrl}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText: unknownMsg })
  });
  const impData = await impRes.json();
  const orderId = impData.orders[0].order_id;

  // Try approving without resolving the unknown_item flag
  const appRes = await fetch(`${baseUrl}/orders/${orderId}/approve`, { method: 'POST' });
  assert.equal(appRes.status, 400);
  const errData = await appRes.json();
  assert.ok(errData.blockers.some(b => b.includes('Unresolved issue')));

  // Now resolve the line: set item_id to Chocolate Cake and status to resolved
  const orderDetails = await (await fetch(`${baseUrl}/orders/${orderId}`)).json();
  const lineId = orderDetails.lines[0].id;

  const patchRes = await fetch(`${baseUrl}/orders/${orderId}/lines/${lineId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      item_id: 1, // Chocolate Cake
      unit_price_paise: 70000,
      unit_price_override_paise: null,
      status: 'resolved',
      flags: []
    })
  });
  assert.equal(patchRes.status, 200);

  // Now approve should succeed!
  const approveRes = await fetch(`${baseUrl}/orders/${orderId}/approve`, { method: 'POST' });
  assert.equal(approveRes.status, 200);
  const approveData = await approveRes.json();
  assert.equal(approveData.message, 'Order approved successfully');

  // Verify summary includes this approved order
  const today = new Date().toISOString().slice(0, 10);
  const sumRes = await fetch(`${baseUrl}/summary?date=${today}`);
  assert.equal(sumRes.status, 200);
  const sumData = await sumRes.json();
  assert.ok(sumData.approved_orders_count >= 1);
  assert.ok(sumData.total_sales_paise > 0);

  // Test reopening the order
  const reopenRes = await fetch(`${baseUrl}/orders/${orderId}/reopen`, { method: 'POST' });
  assert.equal(reopenRes.status, 200);
  const recheck = await (await fetch(`${baseUrl}/orders/${orderId}`)).json();
  assert.equal(recheck.order.status, 'reopened');
});
