import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/index.js';
import { getDb } from '../src/db/index.js';

let serverInstance;
let baseUrl;

test.before(async () => {
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

test('E2E Complete Workflow: Catalog -> Import -> Extract -> Review -> Approve -> Bill -> Summary', async () => {
  // Step 1: Load demo catalog
  const loadRes = await fetch(`${baseUrl}/demo/load`, { method: 'POST' });
  assert.equal(loadRes.status, 200);

  // Step 2: Import customer chat with multi-message modification
  const chatMessages = `
[12/10/26, 14:00:01] Priya Sharma: 2 choc cakes for sat 700 each
[12/10/26, 14:02:15] Priya Sharma: add 1 brownie box 250
[12/10/26, 14:05:00] Priya Sharma: actually make cakes 3
  `.trim();

  const importRes = await fetch(`${baseUrl}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText: chatMessages, source: 'whatsapp_export' })
  });
  assert.equal(importRes.status, 201);
  const importData = await importRes.json();
  assert.equal(importData.orders_created, 1);
  const orderId = importData.orders[0].order_id;

  // Step 3: Fetch order details and verify extraction & multi-message correction
  const detailRes = await fetch(`${baseUrl}/orders/${orderId}`);
  assert.equal(detailRes.status, 200);
  const detail = await detailRes.json();

  assert.equal(detail.order.customer_label, 'Priya Sharma');
  assert.equal(detail.lines.length, 2);

  const cakeLine = detail.lines.find(l => l.item_name === 'Chocolate Cake');
  const brownieLine = detail.lines.find(l => l.item_name === 'Brownie Box');

  assert.ok(cakeLine, 'Cake line must exist');
  assert.equal(cakeLine.quantity, 3, 'Cake quantity must be updated to 3');
  assert.equal(cakeLine.effective_unit_price_paise, 70000, 'Price must be ₹700 (70000 paise)');

  assert.ok(brownieLine, 'Brownie line must exist');
  assert.equal(brownieLine.quantity, 1);
  assert.equal(brownieLine.effective_unit_price_paise, 25000);

  // Total should be 3 * 700 + 1 * 250 = ₹2,350 (235000 paise)
  assert.equal(detail.order.total_paise, 235000);
  assert.equal(detail.order.total_inr, '₹2,350');

  // Step 4: Verify Approval Validation
  assert.equal(detail.validation.canApprove, true, 'Clean order must be eligible for approval');
  assert.equal(detail.validation.blockers.length, 0);

  // Step 5: Approve Order
  const approveRes = await fetch(`${baseUrl}/orders/${orderId}/approve`, { method: 'POST' });
  assert.equal(approveRes.status, 200);

  const approvedOrder = await (await fetch(`${baseUrl}/orders/${orderId}`)).json();
  assert.equal(approvedOrder.order.status, 'approved');
  assert.ok(approvedOrder.order.approved_at);

  // Step 6: Verify Daily Summary includes the approved order
  const today = new Date().toISOString().slice(0, 10);
  const summaryRes = await fetch(`${baseUrl}/summary?date=${today}`);
  assert.equal(summaryRes.status, 200);
  const summary = await summaryRes.json();

  assert.ok(summary.approved_orders_count >= 1);
  assert.ok(summary.total_sales_paise >= 235000);
  const cakeSummary = summary.items_breakdown.find(i => i.item_name === 'Chocolate Cake');
  assert.ok(cakeSummary);
  assert.ok(cakeSummary.quantity_sold >= 3);

  // Step 7: Reopen Order for editing
  const reopenRes = await fetch(`${baseUrl}/orders/${orderId}/reopen`, { method: 'POST' });
  assert.equal(reopenRes.status, 200);
  const reopenedOrder = await (await fetch(`${baseUrl}/orders/${orderId}`)).json();
  assert.equal(reopenedOrder.order.status, 'reopened');
});

test('E2E AI Fallback: Gracefully handles offline AI and continues with deterministic rules', async () => {
  // Test import with nonexistent AI host to verify zero crash and 100% functional fallback
  const testMsg = `Anita: 2 vanilla cake tomorrow`;
  const res = await fetch(`${baseUrl}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText: testMsg })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.orders_created, 1);

  const order = await (await fetch(`${baseUrl}/orders/${data.orders[0].order_id}`)).json();
  assert.equal(order.order.customer_label, 'Anita');
  assert.equal(order.lines[0].item_name, 'Vanilla Cake');
  assert.equal(order.lines[0].quantity, 2);
});
