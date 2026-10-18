/**
 * Money utilities for OrderMint.
 * All monetary calculations are performed in integer paise (1 INR = 100 paise)
 * to avoid IEEE 754 floating point precision issues.
 */

const MAX_PAISE = 1_000_000_000; // 1 crore INR limit

export function inrToPaise(input) {
  if (input === null || input === undefined || input === '') {
    throw new Error('Missing price value');
  }

  let clean = String(input)
    .replace(/[₹]/g, '')
    .replace(/rs\.?/gi, '')
    .replace(/\binr\b/gi, '')
    .replace(/,\s*/g, '')
    .replace(/\s+/g, '')
    .replace(/[/-]+$/, '')
    .trim();

  const num = Number(clean);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid price format: "${input}"`);
  }
  if (num < 0) {
    throw new Error(`Negative price is not allowed: ${num}`);
  }

  const paise = Math.round(num * 100);
  if (paise > MAX_PAISE) {
    throw new Error(`Price exceeds maximum limit of ₹1,00,00,000: ${num}`);
  }

  return paise;
}

export function paiseToINR(paise, { showSymbol = true } = {}) {
  if (!Number.isInteger(paise)) {
    throw new Error(`Paise must be an integer, received: ${paise}`);
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainingPaise = absPaise % 100;

  const rupeesStr = rupees.toLocaleString('en-IN');
  let formatted = remainingPaise === 0
    ? rupeesStr
    : `${rupeesStr}.${String(remainingPaise).padStart(2, '0')}`;

  if (isNegative) formatted = `-${formatted}`;
  return showSymbol ? `₹${formatted}` : formatted;
}

export function addPaise(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new Error(`Operands must be integers: a=${a}, b=${b}`);
  }
  const sum = a + b;
  if (sum > MAX_PAISE) throw new Error('Paise addition exceeds maximum limit');
  return sum;
}

export function subtractPaise(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new Error(`Operands must be integers: a=${a}, b=${b}`);
  }
  return a - b;
}

export function multiplyPaise(unitPaise, quantity) {
  if (!Number.isInteger(unitPaise)) {
    throw new Error(`Unit price in paise must be integer: ${unitPaise}`);
  }
  if (!Number.isInteger(quantity)) {
    throw new Error(`Quantity must be an integer: ${quantity}`);
  }
  if (quantity < 0) {
    throw new Error(`Quantity cannot be negative: ${quantity}`);
  }
  if (quantity > 1000) {
    throw new Error(`Quantity exceeds safety limit of 1000: ${quantity}`);
  }

  const total = unitPaise * quantity;
  if (total > MAX_PAISE) throw new Error('Order line total exceeds maximum limit');
  return total;
}
