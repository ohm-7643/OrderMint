import test from 'node:test';
import assert from 'node:assert/strict';
import { inrToPaise, paiseToINR, addPaise, subtractPaise, multiplyPaise } from '../src/utils/money.js';

test('Money arithmetic: 0.10 + 0.20 in paise equals 30 paise (₹0.30)', () => {
  const tenPaise = inrToPaise('0.10');
  const twentyPaise = inrToPaise('0.20');
  assert.equal(tenPaise, 10);
  assert.equal(twentyPaise, 20);

  const sum = addPaise(tenPaise, twentyPaise);
  assert.equal(sum, 30);
  assert.equal(paiseToINR(sum), '₹0.30');
});

test('Money parsing: handles various currency formats', () => {
  assert.equal(inrToPaise('700'), 70000);
  assert.equal(inrToPaise('₹700'), 70000);
  assert.equal(inrToPaise('Rs 700'), 70000);
  assert.equal(inrToPaise('Rs. 700.50'), 70050);
  assert.equal(inrToPaise('INR 250'), 25000);
  assert.equal(inrToPaise(150), 15000);
});

test('Money formatting: formats INR cleanly', () => {
  assert.equal(paiseToINR(70000), '₹700');
  assert.equal(paiseToINR(25050), '₹250.50');
  assert.equal(paiseToINR(10000000), '₹1,00,000');
  assert.equal(paiseToINR(0), '₹0');
});

test('Money multiplication: validates quantities and limits', () => {
  const unit = inrToPaise('700'); // 70000 paise
  assert.equal(multiplyPaise(unit, 3), 210000); // ₹2,100

  // Guard against non-integer, negative or excessive quantities
  assert.throws(() => multiplyPaise(unit, -1), /Quantity cannot be negative/);
  assert.throws(() => multiplyPaise(unit, 1.5), /Quantity must be an integer/);
  assert.throws(() => multiplyPaise(unit, 1001), /Quantity exceeds safety limit/);
});

test('Money guards: rejects negative and invalid prices', () => {
  assert.throws(() => inrToPaise('-50'), /Negative price/);
  assert.throws(() => inrToPaise('abc'), /Invalid price format/);
  assert.throws(() => inrToPaise(''), /Missing price value/);
});
