import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText } from '../src/parser/normalize.js';
import { extractQuantityAndAction } from '../src/parser/quantities.js';
import { extractQuotedPrice, reconcilePrice } from '../src/parser/prices.js';
import { matchCatalogItem } from '../src/parser/catalogMatch.js';
import { parseRawInput, extractOrdersFromGroups } from '../src/parser/extractOrders.js';

const mockCatalog = [
  { id: 1, name: 'Chocolate Cake', unit_price_paise: 70000, unit: 'piece' },
  { id: 2, name: 'Vanilla Cake', unit_price_paise: 60000, unit: 'piece' },
  { id: 3, name: 'Brownie Box', unit_price_paise: 25000, unit: 'box' },
  { id: 4, name: 'Cookie Jar', unit_price_paise: 20000, unit: 'jar' }
];

const mockAliases = {
  1: ['choc cake', 'cocoa cake'],
  2: ['van cake', 'plain cake'],
  3: ['brownies', 'brownie box', 'brownie'],
  4: ['cookies', 'cookie jar']
};

test('Parser: Normalization handles abbreviations and number words', () => {
  assert.equal(normalizeText('2 choc cakes'), '2 chocolate cakes');
  assert.equal(normalizeText('do choc cakes'), '2 chocolate cakes');
  assert.equal(normalizeText('teen brownies'), '3 brownies');
  assert.equal(normalizeText('a dozen cookies'), 'a 12 cookies');
  assert.equal(normalizeText('half dozen cupcakes'), '6 cupcakes');
});

test('Parser: Quantity extraction handles various formats and flags', () => {
  const q1 = extractQuantityAndAction('2 choc cakes', '2 chocolate cakes');
  assert.equal(q1.quantity, 2);
  assert.equal(q1.action, 'add');

  const q2 = extractQuantityAndAction('cakes x3', 'cakes x3');
  assert.equal(q2.quantity, 3);

  const q3 = extractQuantityAndAction('actually make cakes 4', 'actually make cakes 4');
  assert.equal(q3.quantity, 4);
  assert.equal(q3.action, 'set');

  const q4 = extractQuantityAndAction('cancel the brownies', 'cancel the brownies');
  assert.equal(q4.action, 'remove');
  assert.equal(q4.quantity, 0);

  const q5 = extractQuantityAndAction('1/2 kg cake', '1/2 kg cake');
  assert.ok(q5.flags.includes('unsupported_fraction'));

  const q6 = extractQuantityAndAction('1500 cakes', '1500 cakes');
  assert.ok(q6.flags.includes('excessive_quantity'));
});

test('Parser: Price extraction handles quoted prices and reconciliation', () => {
  const p1 = extractQuotedPrice('2 choc cakes for sat 700 each');
  assert.ok(p1);
  assert.equal(p1.quotedPaise, 70000);

  const p2 = extractQuotedPrice('1 brownie box @250');
  assert.ok(p2);
  assert.equal(p2.quotedPaise, 25000);

  // Price match with catalog (70000 == 70000)
  const rec1 = reconcilePrice({ quotedPriceInfo: p1, catalogItem: mockCatalog[0] });
  assert.equal(rec1.flags.length, 0);
  assert.equal(rec1.unitPricePaise, 70000);

  // Price mismatch (quoted 65000 != catalog 70000)
  const pMismatch = { quotedPaise: 65000, rawMatch: '@650' };
  const rec2 = reconcilePrice({ quotedPriceInfo: pMismatch, catalogItem: mockCatalog[0] });
  assert.ok(rec2.flags.includes('price_mismatch'));
  assert.equal(rec2.unitPriceOverridePaise, 65000);

  // Missing price when no catalog item match
  const rec3 = reconcilePrice({ quotedPriceInfo: null, catalogItem: null });
  assert.ok(rec3.flags.includes('missing_price'));
});

test('Parser: Catalog matching finds items by name, alias, and flags unknown', () => {
  const m1 = matchCatalogItem('chocolate cake', mockCatalog, mockAliases);
  assert.equal(m1.match.name, 'Chocolate Cake');

  const m2 = matchCatalogItem('choc cake', mockCatalog, mockAliases);
  assert.equal(m2.match.name, 'Chocolate Cake');

  const m3 = matchCatalogItem('mystery pastry', mockCatalog, mockAliases);
  assert.equal(m3.match, null);
  assert.ok(m3.flags.includes('unknown_item'));
});

test('Parser: End-to-end extraction from WhatsApp chat with multi-message corrections', () => {
  const chatExport = `
[12/10/26, 14:00:01] Priya Sharma: 2 choc cakes for sat 700 each
[12/10/26, 14:02:15] Priya Sharma: add 1 brownie box 250
[12/10/26, 14:05:00] Priya Sharma: actually make cakes 3
  `.trim();

  const groups = parseRawInput(chatExport);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].customer, 'Priya Sharma');

  const orders = extractOrdersFromGroups(groups, mockCatalog, mockAliases);
  assert.equal(orders.length, 1);
  const order = orders[0];

  assert.equal(order.customer_label, 'Priya Sharma');
  assert.ok(order.delivery_note.includes('for sat') || order.delivery_note.includes('saturday'));

  // Cake quantity was corrected from 2 to 3!
  const cakeLine = order.lines.find(l => l.item_id === 1);
  assert.ok(cakeLine);
  assert.equal(cakeLine.quantity, 3);
  assert.ok(cakeLine.history.some(h => h.includes('2 → 3')));

  const brownieLine = order.lines.find(l => l.item_id === 3);
  assert.ok(brownieLine);
  assert.equal(brownieLine.quantity, 1);
});

test('Parser: Input validation rejects binary null bytes and oversized text', () => {
  assert.throws(() => parseRawInput('Hello\0World'), /Binary content detected/);
  assert.throws(() => parseRawInput(Buffer.alloc(600 * 1024, 'a').toString()), /Input exceeds maximum allowed size/);
});
