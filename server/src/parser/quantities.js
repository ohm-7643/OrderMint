/**
 * Quantity extraction rules and validations for OrderMint.
 */

const MAX_QUANTITY = 1000;

export function extractQuantityAndAction(rawText, normalizedText) {
  const result = {
    quantity: null,
    action: 'add',
    flags: [],
    cleanedText: normalizedText
  };

  const text = normalizedText.toLowerCase();

  // Check for cancellation or removal
  if (/\b(cancel|remove|delete|drop)\b/i.test(text)) {
    result.action = 'remove';
    result.quantity = 0;
    return result;
  }

  // Check for unsupported fractions
  if (/\b(?:1\/2|half|0\.5|1\/4|3\/4)\b/i.test(rawText)) {
    result.flags.push('unsupported_fraction');
  }

  // Check for negative numbers like "-5 cookies"
  const negMatch = text.match(/(?:^|\s)-(\d+)\b/);
  if (negMatch) {
    result.quantity = -parseInt(negMatch[1], 10);
    result.flags.push('negative_quantity');
    return result;
  }

  // Mask out quoted prices so they are not mistaken for quantities:
  // e.g. "@ 700", "@700", "700 each", "700/piece", "700/-", "₹700", "rs 700", "inr 700"
  const maskedText = text
    .replace(/@\s*\d+(?:\.\d+)?/gi, '__PRICE__')
    .replace(/\b\d+(?:\.\d+)?\s*(?:each|per\s+\w+|\/-)\b/gi, '__PRICE__')
    .replace(/(?:₹|rs\.?|inr)\s*\d+(?:\.\d+)?/gi, '__PRICE__');

  // Check for modifications: "make cakes 3", "actually make 3 cakes", "change to 3"
  const setMatch = maskedText.match(/\b(?:make|change(?:\s+to)?|increase(?:\s+to)?|update(?:\s+to)?)\b.*?(\d+)/i);
  if (setMatch) {
    result.action = 'set';
    result.quantity = parseInt(setMatch[1], 10);
  }

  // Check for multiplier patterns: "x2", "x 2", "2x"
  if (result.quantity === null) {
    const multiMatch = maskedText.match(/\bx(\d+)\b/i) || maskedText.match(/\b(\d+)\s*x\b/i);
    if (multiMatch) {
      result.quantity = parseInt(multiMatch[1], 10);
    }
  }

  // Check for leading numbers or digits: "2 chocolate cakes", "add 1 brownie box"
  if (result.quantity === null) {
    const leadMatch = maskedText.match(/(?:^|\b(?:add|need|order|want|send)\s+)?(\d+)\b/i);
    if (leadMatch) {
      result.quantity = parseInt(leadMatch[1], 10);
    }
  }

  // Check for trailing numbers: "chocolate cake 2"
  if (result.quantity === null) {
    const trailMatch = maskedText.match(/\b(\d+)\s*$/);
    if (trailMatch) {
      result.quantity = parseInt(trailMatch[1], 10);
    }
  }

  // Validation
  if (result.quantity === null) {
    result.flags.push('missing_quantity');
  } else if (result.quantity === 0 && result.action !== 'remove') {
    result.flags.push('zero_quantity');
  } else if (result.quantity < 0) {
    result.flags.push('negative_quantity');
  } else if (result.quantity > MAX_QUANTITY) {
    result.flags.push('excessive_quantity');
  }

  return result;
}
